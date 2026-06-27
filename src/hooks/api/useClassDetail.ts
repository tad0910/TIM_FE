import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getClassInfo, getClassModules, type ClassModuleDTO } from "../../services/classApi";
import type { ClassInfo } from "../../types/class";

type UseClassDetailOptions = {
  includeModules?: boolean;
  enabled?: boolean;
};

type ClassDetail = ClassInfo & {
  modules?: ClassModuleDTO[];
};

export function useClassDetail(
  classId: number | null,
  options: UseClassDetailOptions = { includeModules: true, enabled: true }
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(classId) && (options.enabled ?? true);
  const includeModules = options.includeModules ?? true;

  const classQuery = useQuery<ClassDetail>({
    queryKey: ["class", classId],
    enabled,
    queryFn: async () => {
      if (!classId) {
        throw new Error("Thiếu classId");
      }
      const detail = (await getClassInfo(classId)) as ClassDetail;
      return detail;
    },
    staleTime: 60_000,
  });

  const modulesFromClass = useMemo(() => {
    if (!includeModules) return undefined;
    const data = classQuery.data;
    return Array.isArray((data as any)?.modules) ? (data as any).modules : undefined;
  }, [classQuery.data, includeModules]);

  const modulesQuery = useQuery<ClassModuleDTO[]>({
    queryKey: ["class-modules", classId],
    enabled: enabled && includeModules && !modulesFromClass,
    queryFn: async () => {
      if (!classId) {
        throw new Error("Thiếu classId");
      }
      return getClassModules(classId);
    },
    staleTime: 120_000,
    select: (data) => data ?? [],
  });

  const modules = modulesFromClass ?? modulesQuery.data ?? [];

  const refetchClass = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["class", classId] }),
      includeModules ? queryClient.invalidateQueries({ queryKey: ["class-modules", classId] }) : Promise.resolve(),
    ]);
  };

  return {
    classInfo: classQuery.data,
    modules,
    isClassLoading: classQuery.isLoading,
    isModulesLoading: modulesQuery.isLoading,
    isLoading: classQuery.isLoading || modulesQuery.isLoading,
    error: classQuery.error || modulesQuery.error,
    refetchClass,
  };
}
