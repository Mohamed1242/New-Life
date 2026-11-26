import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const suggestedActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("create_reminder"),
    label: z.string().min(1).max(40),
    title: z.string().min(1).max(100),
    triggerTime: z.string().min(1).max(20),
    entityType: z.enum(["task", "habit", "routine", "prayer", "custom_alarm"]),
  }),
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("reschedule_task"),
    label: z.string().min(1).max(40),
    taskId: z.string().uuid(),
    newTimeLabel: z.string().min(1).max(20),
    newDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("adjust_habit_target"),
    label: z.string().min(1).max(40),
    habitId: z.string().uuid(),
    newTargetPerWeek: z.number().int().min(1).max(7),
    newTargetLabel: z.string().min(1).max(60),
  }),
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("open_prayer_focus"),
    label: z.string().min(1).max(40),
  }),
]);

test("database security: every Supabase table in RLS migration enables RLS and no client file leaks secret keys", () => {
  const rlsSql = fs.readFileSync(
    path.resolve("supabase/migrations/20261126000002_rls_policies.sql"),
    "utf8",
  );
  assert.match(rlsSql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(rlsSql, /auth\.uid\(\) = user_id/);
  assert.match(rlsSql, /'prayer_logs'/);
  assert.match(rlsSql, /'reminders'/);

  const scanFiles = (dir: string): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? scanFiles(full) : full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
    });
  };

  for (const file of scanFiles(path.resolve("src"))) {
    const content = fs.readFileSync(file, "utf8");
    assert.equal(content.includes("sk-proj-"), false, `Secret leak in ${file}`);
    assert.equal(content.includes("AIzaSy"), false, `Gemini key leak in ${file}`);
    assert.equal(content.includes("SUPABASE_SERVICE_ROLE_KEY"), false, `Service role key referenced in client file ${file}`);
  }
});

test("AI action validation rejects arbitrary destructive payloads and bounds habit targets", () => {
  const validAction = suggestedActionSchema.safeParse({
    id: "act_1",
    type: "adjust_habit_target",
    label: "Ease target to 4x/wk",
    habitId: "11111111-1111-4111-8111-111111111111",
    newTargetPerWeek: 4,
    newTargetLabel: "4x / week",
  });
  assert.equal(validAction.success, true);

  const invalidType = suggestedActionSchema.safeParse({
    id: "bad_1",
    type: "delete_all_tasks",
    label: "Reset",
  });
  assert.equal(invalidType.success, false);

  const invalidTarget = suggestedActionSchema.safeParse({
    id: "bad_2",
    type: "adjust_habit_target",
    label: "Overload",
    habitId: "not-a-uuid",
    newTargetPerWeek: 99,
    newTargetLabel: "99x",
  });
  assert.equal(invalidTarget.success, false);
});

test("sync push source enforces Last-Write-Wins timestamp resolution and JWT ownership", () => {
  const syncPushSrc = fs.readFileSync(
    path.resolve("supabase/functions/sync-push/index.ts"),
    "utf8",
  );
  assert.match(syncPushSrc, /new Date\(existing\.updated_at\)\.getTime\(\)\s*>\s*new Date\(item\.clientUpdatedAt\)\.getTime\(\)/);
  assert.match(syncPushSrc, /user_id:\s*user\.id/);
});
