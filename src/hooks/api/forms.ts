import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import studentFormApi from "../../services/formApi";
import type {
  ApprovalStatus,
  FormStatus,
  FormTemplate,
  StudentFormCreateDTO,
  StudentFormResponse,
} from "../../types/form";
import { queryKeys } from "./queryKeys";

type BaseQueryOptions = {
  enabled?: boolean;
};

type ClassFormsFilters = {
  sort?: "id_desc" | "id_asc";
};

export type FormsSort = "created_desc" | "created_asc";

export type FormsQueryFilters = {
  templateName?: string | null;
  status?: FormStatus | "ALL" | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
  sort?: FormsSort;
};

export type FormsQueryResult = {
  items: StudentFormResponse[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  stats: {
    total: number;
    pending: number;
    processing: number;
    approved: number;
    rejected: number;
  };
};

const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT: FormsSort = "created_desc";

const sortForms = (
  forms: StudentFormResponse[],
  sort: ClassFormsFilters["sort"]
) => {
  const dir = sort ?? "id_desc";
  const sorted = [...forms].sort((a, b) => (Number(a.id ?? 0) - Number(b.id ?? 0)));
  return dir === "id_desc" ? sorted.reverse() : sorted;
};

export function useFormTemplates(options: BaseQueryOptions = { enabled: true }) {
  return useQuery<FormTemplate[], Error>({
    queryKey: queryKeys.forms.templates(),
    enabled: options.enabled ?? true,
    queryFn: () => studentFormApi.getTemplates(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    select: (data) => data ?? [],
  });
}

export function useFormDetail(
  formId: number | null,
  options: BaseQueryOptions = { enabled: true }
) {
  return useQuery<StudentFormResponse, Error>({
    queryKey: queryKeys.forms.detail(formId),
    enabled: Boolean(formId) && (options.enabled ?? true),
    queryFn: async () => {
      if (!formId) {
        throw new Error("Thiếu formId");
      }
      return studentFormApi.getFormDetail(formId);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useClassForms(
  classId: number | null,
  filters: ClassFormsFilters = { sort: "id_desc" },
  options: BaseQueryOptions = { enabled: true }
) {
  const enabled = Boolean(classId) && (options.enabled ?? true);

  return useQuery<StudentFormResponse[], Error>({
    queryKey: queryKeys.forms.byClass(classId, filters),
    enabled,
    queryFn: async () => {
      if (!classId) {
        throw new Error("Thiếu classId");
      }
      const all = await studentFormApi.getForms();
      return all.filter((f) => f.classId === classId);
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    select: (data) => sortForms(data ?? [], filters.sort),
  });
}

export function useClassStudentForms(
  classId: number | null,
  studentId: number | null,
  filters: ClassFormsFilters = { sort: "id_desc" },
  options: BaseQueryOptions = { enabled: true }
) {
  const enabled = Boolean(classId) && Boolean(studentId) && (options.enabled ?? true);

  return useQuery<StudentFormResponse[], Error>({
    queryKey: queryKeys.forms.byClassStudent(classId, studentId, filters),
    enabled,
    queryFn: async () => {
      if (!classId) {
        throw new Error("Thiếu classId");
      }
      if (!studentId) {
        throw new Error("Thiếu studentId");
      }
      const all = await studentFormApi.getForms();
      return all.filter((f) => f.classId === classId && f.studentId === studentId);
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    select: (data) => sortForms(data ?? [], filters.sort),
  });
}

export function useStudentFormMutations() {
  const queryClient = useQueryClient();

  const invalidateFormsList = async () => {
    await queryClient.invalidateQueries({ queryKey: ["forms"] });
  };

  const invalidateFormsForClass = async (classId: number | null) => {
    await queryClient.invalidateQueries({
      queryKey: ["forms", "class", classId],
    });
  };

  const invalidateFormsForClassStudent = async (
    classId: number | null,
    studentId: number | null
  ) => {
    await queryClient.invalidateQueries({
      queryKey: ["forms", "class", classId, "student", studentId],
    });
  };

  const createFormMutation = useMutation({
    mutationFn: (data: StudentFormCreateDTO) => studentFormApi.createForm(data),
    onSuccess: async (created) => {
      await Promise.all([
        invalidateFormsList(),
        invalidateFormsForClass(created.classId ?? null),
        invalidateFormsForClassStudent(created.classId ?? null, created.studentId ?? null),
      ]);
    },
  });

  const approveFormMutation = useMutation({
    mutationFn: ({
      formId,
      data,
    }: {
      formId: number;
      data: {
        decision: ApprovalStatus;
        note?: string;
        targetRole?: string;
        moduleId?: number | null;
        moduleSessionId?: number | null;
      };
    }) => studentFormApi.approveForm(formId, data),
    onSuccess: async (updated) => {
      await Promise.all([
        invalidateFormsList(),
        invalidateFormsForClass(updated.classId ?? null),
        invalidateFormsForClassStudent(updated.classId ?? null, updated.studentId ?? null),
      ]);
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: (formId: number) => studentFormApi.deleteForm(formId),
    onSuccess: async () => {
      await invalidateFormsList();
    },
  });

  return {
    createFormMutation,
    approveFormMutation,
    deleteFormMutation,
    invalidateFormsList,
    invalidateFormsForClass,
    invalidateFormsForClassStudent,
  };
}

const normalizeString = (value?: string | null) =>
  value?.toLowerCase().trim() ?? "";

const buildStats = (forms: StudentFormResponse[]) => {
  const statusCount = forms.reduce(
    (acc, form) => {
      const status = form.status ?? "PENDING";
      acc.total += 1;
      if (status === "PENDING") acc.pending += 1;
      else if (status === "PROCESSING") acc.processing += 1;
      else if (status === "APPROVED") acc.approved += 1;
      else if (status === "REJECTED") acc.rejected += 1;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      processing: 0,
      approved: 0,
      rejected: 0,
    }
  );
  return statusCount;
};

const applyFilters = (
  forms: StudentFormResponse[],
  filters: Required<FormsQueryFilters>
) => {
  const templateName = normalizeString(filters.templateName);
  const searchTerm = normalizeString(filters.search);

  let result = [...forms];

  if (templateName) {
    result = result.filter(
      (form) => normalizeString(form.templateName) === templateName
    );
  }

  if (filters.status && filters.status !== "ALL") {
    result = result.filter((form) => form.status === filters.status);
  }

  if (searchTerm) {
    result = result.filter((form) => {
      const candidates = [
        form.studentName,
        form.className,
        form.programName,
        form.reason,
      ];
      return candidates.some((value) =>
        normalizeString(value).includes(searchTerm)
      );
    });
  }

  if (filters.sort === "created_desc" || filters.sort === "created_asc") {
    result.sort((a, b) => {
      const dateA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const dateB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return dateA - dateB;
    });
    if (filters.sort === "created_desc") {
      result.reverse();
    }
  }

  return result;
};

const paginate = (forms: StudentFormResponse[], page: number, size: number) => {
  const safePage = Math.max(0, page);
  const safeSize = Math.max(1, size);
  const start = safePage * safeSize;
  const end = start + safeSize;

  return {
    items: forms.slice(start, end),
    totalPages: Math.max(1, Math.ceil(forms.length / safeSize)),
  };
};

export function useFormsQuery(
  filters: FormsQueryFilters,
  options: BaseQueryOptions = { enabled: true }
) {
  const normalizedFilters: Required<FormsQueryFilters> = {
    templateName: filters.templateName ?? null,
    status: filters.status ?? "ALL",
    search: filters.search ?? "",
    page: filters.page ?? DEFAULT_PAGE,
    pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
    sort: filters.sort ?? DEFAULT_SORT,
  };

  return useQuery<StudentFormResponse[], Error, FormsQueryResult>({
    queryKey: queryKeys.forms.list(normalizedFilters),
    enabled: options.enabled ?? true,
    queryFn: () => studentFormApi.getForms(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    select: (data) => {
      const source = data ?? [];
      const filtered = applyFilters(source, normalizedFilters);
      const stats = buildStats(filtered);
      const { items, totalPages } = paginate(
        filtered,
        normalizedFilters.page,
        normalizedFilters.pageSize
      );

      return {
        items,
        totalItems: filtered.length,
        totalPages,
        page: normalizedFilters.page,
        pageSize: normalizedFilters.pageSize,
        stats,
      };
    },
  });
}
