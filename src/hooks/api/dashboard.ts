import { useQuery } from "@tanstack/react-query";

import {
  getDashboardPending,
  getDashboardJobLeads,
  getDashboardSchedule,
  getDashboardStats,
  getDashboardGrowth,
  type DashboardJobLeadsResponse,
  type DashboardPendingResponse,
  type DashboardScheduleResponse,
  type DashboardStatsResponse,
  type GrowthResponse,
} from "../../services/dashboardApi";
import { queryKeys } from "./queryKeys";

const defaultQueryOptions = {
  staleTime: 60_000,
  refetchOnWindowFocus: false,
} as const;

export function useDashboardStats() {
  return useQuery<DashboardStatsResponse, Error>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => getDashboardStats(),
    ...defaultQueryOptions,
  });
}

export function useDashboardGrowth(months = 6) {
  return useQuery<GrowthResponse, Error>({
    queryKey: queryKeys.dashboard.growth(months),
    queryFn: () => getDashboardGrowth(months),
    ...defaultQueryOptions,
  });
}

export function useDashboardPending() {
  return useQuery<DashboardPendingResponse, Error>({
    queryKey: queryKeys.dashboard.pending,
    queryFn: () => getDashboardPending(),
    ...defaultQueryOptions,
  });
}

export function useDashboardSchedule() {
  return useQuery<DashboardScheduleResponse, Error>({
    queryKey: queryKeys.dashboard.schedule,
    queryFn: () => getDashboardSchedule(),
    ...defaultQueryOptions,
  });
}

export function useDashboardJobLeads() {
  return useQuery<DashboardJobLeadsResponse, Error>({
    queryKey: queryKeys.dashboard.jobLeads,
    queryFn: () => getDashboardJobLeads(),
    ...defaultQueryOptions,
  });
}