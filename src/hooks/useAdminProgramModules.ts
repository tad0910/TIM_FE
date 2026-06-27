import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { programApi } from "../services/programApi";
import { moduleApi } from "../services/moduleApi";
import type { Program } from "../types/program";
import type { Module } from "../types/module";

export function useAdminProgramModules(programId: number | null) {
  const queryClient = useQueryClient();

  const programQuery = useQuery<Program, unknown>({
    queryKey: ["admin-program", programId],
    enabled: Boolean(programId),
    queryFn: async () => {
      if (!programId) {
        throw new Error("Thiếu programId");
      }
      return programApi.getProgramById(programId);
    },
  });

  const modulesQuery = useQuery<Module[], unknown>({
    queryKey: ["admin-modules", { scope: "program-picker" }],
    queryFn: async () => moduleApi.searchModules({ size: 1000 }),
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation({
    mutationFn: async (moduleIds: number[]) => {
      if (!programId) {
        throw new Error("Thiếu programId");
      }
      return programApi.addModulesToProgram(programId, moduleIds);
    },
    onSuccess: (updatedProgram) => {
      if (!programId) return;
      queryClient.setQueryData(["admin-program", programId], updatedProgram);
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
  });

  return {
    program: programQuery.data,
    modules: modulesQuery.data,
    isLoading: programQuery.isLoading || modulesQuery.isLoading,
    isError: programQuery.isError || modulesQuery.isError,
    error: programQuery.error ?? modulesQuery.error,
    refetch: async () => {
      await Promise.all([programQuery.refetch(), modulesQuery.refetch()]);
    },
    updateModules: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
