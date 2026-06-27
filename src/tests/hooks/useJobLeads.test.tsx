import { act, renderHook, waitFor } from "@testing-library/react";
import type { JobLead } from "../../types";

const mockUserState = { user: { id: "123" } };

const mockJobLeadApi = {
  getMyLeads: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};

jest.mock("../../store/useAuthStore", () => ({
  useAuthStore: (selector: (state: typeof mockUserState) => unknown) => selector(mockUserState),
}));

jest.mock("../../services/jobLeadApi", () => ({
  jobLeadApi: mockJobLeadApi,
}));

import { useJobLeads } from "../../hooks/useJobLeads";

describe("useJobLeads", () => {
  const sampleLeads: JobLead[] = [
    {
      id: 1,
      companyName: "ABC",
      shortName: "A",
      address: "123",
      website: "abc.com",
      statusCode: "NEW",
      statusLabel: "Mới",
      status: "Mới",
      isFromAdmin: false,
      date: "2025-12-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobLeadApi.getMyLeads.mockResolvedValue(sampleLeads);
    mockJobLeadApi.create.mockResolvedValue({
      id: 2,
      companyName: "New Co",
      shortName: "NC",
      address: "",
      website: "",
      statusCode: "APPLIED",
      statusLabel: "Đã ứng tuyển",
      status: "Đã ứng tuyển",
      isFromAdmin: false,
      date: "2025-12-05",
    });
    mockJobLeadApi.delete.mockResolvedValue(undefined);
    mockUserState.user.id = "123";
  });

  it("tự động load danh sách lead khi có studentId", async () => {
    const { result } = renderHook(() => useJobLeads());

    await waitFor(() => {
      expect(result.current.leads).toEqual(sampleLeads);
      expect(result.current.loading).toBe(false);
    });

    expect(mockJobLeadApi.getMyLeads).toHaveBeenCalledWith(123);
    expect(result.current.error).toBeNull();
  });

  it("createLead thêm lead mới vào đầu danh sách", async () => {
    const { result } = renderHook(() => useJobLeads());

    await waitFor(() => expect(result.current.leads).toEqual(sampleLeads));

    const payload = { companyName: "New Co", shortName: "NC" };

    await act(async () => {
      const created = await result.current.createLead(payload);
      expect(created?.id).toBe(2);
    });

    expect(mockJobLeadApi.create).toHaveBeenCalledWith(123, payload);
    expect(result.current.leads[0].id).toBe(2);
    expect(result.current.leads).toHaveLength(2);
  });

  it("deleteLead xoá lead khỏi danh sách", async () => {
    const { result } = renderHook(() => useJobLeads());

    await waitFor(() => expect(result.current.leads).toEqual(sampleLeads));

    await act(async () => {
      const success = await result.current.deleteLead(1);
      expect(success).toBe(true);
    });

    expect(mockJobLeadApi.delete).toHaveBeenCalledWith(1, 123);
    expect(result.current.leads).toEqual([]);
  });

  it("khi không có studentId thì không gọi API", async () => {
    mockUserState.user.id = undefined as unknown as string;
    const { result } = renderHook(() => useJobLeads());

    await waitFor(() => expect(result.current.leads).toEqual([]));
    expect(mockJobLeadApi.getMyLeads).not.toHaveBeenCalled();
  });
});
