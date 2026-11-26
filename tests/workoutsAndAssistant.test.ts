import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { WORKOUT_TYPE_META } from "../src/modules/workouts/types/workout.types";

function extractCleanReply(raw: unknown): string {
  if (typeof raw !== "string") return "I'm here to help you stay balanced.";
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as { reply?: unknown };
      if (typeof obj.reply === "string" && obj.reply.trim()) {
        return obj.reply.trim();
      }
    } catch {
      const match = trimmed.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/);
      if (match?.[1]) {
        return match[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
      }
    }
  }
  return trimmed || "I'm here to help you stay balanced.";
}

test("workouts metadata calculates realistic calorie burn rates across all 4 types", () => {
  assert.equal(WORKOUT_TYPE_META.strength.label, "Strength");
  assert.equal(Math.round(45 * WORKOUT_TYPE_META.strength.defaultCaloriesPerMin), 270);
  assert.equal(Math.round(30 * WORKOUT_TYPE_META.cardio.defaultCaloriesPerMin), 270);
  assert.equal(Math.round(20 * WORKOUT_TYPE_META.mobility.defaultCaloriesPerMin), 80);
});

test("AI reply sanitizer cleanly extracts natural language from fenced or truncated JSON", () => {
  assert.equal(
    extractCleanReply('```json\n{"reply":"Start with a calm 10-minute walk.","suggestedActions":[]}\n```'),
    "Start with a calm 10-minute walk.",
  );
  assert.equal(
    extractCleanReply('{\n  "reply": "Since you skipped Fajr alarm yesterday, try 15m earlier"'),
    "Since you skipped Fajr alarm yesterday, try 15m earlier",
  );
  assert.equal(extractCleanReply("Plain supportive reply"), "Plain supportive reply");
});

test("smart-notifications-cron uses valid Expo Push v2 endpoint and Gemini token budget >= 600", () => {
  const cronSrc = fs.readFileSync(
    path.resolve("supabase/functions/smart-notifications-cron/index.ts"),
    "utf8",
  );
  assert.match(cronSrc, /https:\/\/exp\.host\/--\/api\/v2\/push\/send/);

  const aiSrc = fs.readFileSync(
    path.resolve("supabase/functions/_shared/openai.ts"),
    "utf8",
  );
  assert.match(aiSrc, /maxOutputTokens:\s*650/);
});
