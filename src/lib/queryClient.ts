import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export const createQueryKeyFactory = <T extends string>(entity: T) => ({
  all: () => [entity] as const,
  lists: () => [entity, "list"] as const,
  list: (params?: Record<string, unknown>) =>
    params ? ([entity, "list", params] as const) : ([entity, "list"] as const),
  detail: (id: string | number) => [entity, "detail", id] as const,
});
