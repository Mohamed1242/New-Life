import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQueryKeyFactory } from "@/lib/queryClient";
import type { ActivityStatus } from "@/modules/tasks/types/tasks.types";
import { routineDb } from "../db/routineRepository";
import type { SaveRoutineBlockInput } from "../types/routine.types";

export const routineKeys = createQueryKeyFactory("routine");
export const challengesKeys = createQueryKeyFactory("challenges");

export function useRoutineQuery(dateIso?: string) {
  return useQuery({
    queryKey: routineKeys.list(dateIso ? { dateIso } : undefined),
    queryFn: () => routineDb.listRoutineBlocks(dateIso),
  });
}

export function useSaveRoutineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveRoutineBlockInput) => routineDb.saveRoutineBlock(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: routineKeys.all() }),
  });
}

export function useDeleteRoutineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routineDb.deleteRoutineBlock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: routineKeys.all() }),
  });
}

export function useSetRoutineStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; dateIso: string; status: ActivityStatus }) =>
      routineDb.setRoutineStatus(p.id, p.dateIso, p.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routineKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useChallengesQuery() {
  return useQuery({
    queryKey: challengesKeys.list(),
    queryFn: () => routineDb.listChallenges(),
  });
}

export function useToggleChallengeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routineDb.toggleChallengeJoin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: challengesKeys.all() }),
  });
}

export function useLogChallengeDayMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routineDb.logChallengeDay(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: challengesKeys.all() }),
  });
}
