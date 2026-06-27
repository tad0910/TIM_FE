import { act, renderHook, waitFor } from "@testing-library/react";
import type { JobActivity } from "../../types";

const mockJobActivityApi = {
  list: jest.fn(),
  create: jest.fn(),
  updateNote: jest.fn(),
};

jest.mock("../../services/jobActivityApi", () => ({
  jobActivityApi: mockJobActivityApi,
}));

import { useJobActivities } from "../../hooks/useJobActivities";

describe("useJobActivities", () => {
  const baseActivities: JobActivity[] = [
    {
      id: 1,
      jobLeadId: 5,
      activityType: "SEND_CV",
      content: "Gửi CV",
      happenedAt: "2025-12-01",
      createdAt: "2025-12-01",
      salaryAmount: undefined,
      note: "",
      fileUrl: undefined,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobActivityApi.list.mockResolvedValue(baseActivities);
    mockJobActivityApi.create.mockResolvedValue({
      id: 2,
      jobLeadId: 5,
      activityType: "OFFER_RECEIVED",
      content: "Nhận offer",
      happenedAt: "2025-12-02",
      createdAt: "2025-12-02",
      salaryAmount: "1500",
      note: "",
      fileUrl: undefined,
    });
    mockJobActivityApi.updateNote.mockImplementation(async ({ activityId, note }) => ({
      ...baseActivities[0],
      id: activityId,
      note,
    }));
  });

  it("tự động load hoạt động khi có jobLeadId", async () => {
    const { result } = renderHook(() => useJobActivities(5));

    await waitFor(() => expect(result.current.activities).toEqual(baseActivities));
    expect(mockJobActivityApi.list).toHaveBeenCalledWith(5);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("createActivity thêm hoạt động mới vào đầu danh sách", async () => {
    const { result } = renderHook(() => useJobActivities(5));

    await waitFor(() => expect(result.current.activities).toHaveLength(1));

    await act(async () => {
      const created = await result.current.createActivity({
        jobLeadId: 5,
        activityType: "OFFER_RECEIVED",
        content: "Nhận offer",
        happenedAt: "2025-12-02",
        salaryAmount: "1500",
      });
      expect(created?.id).toBe(2);
    });

    expect(mockJobActivityApi.create).toHaveBeenCalledWith({
      jobLeadId: 5,
      activityType: "OFFER_RECEIVED",
      content: "Nhận offer",
      happenedAt: "2025-12-02",
      salaryAmount: "1500",
    });
    expect(result.current.activities[0].id).toBe(2);
    expect(result.current.activities).toHaveLength(2);
  });

  it("updateNote cập nhật note trong danh sách", async () => {
    const { result } = renderHook(() => useJobActivities(5));
    await waitFor(() => expect(result.current.activities).toHaveLength(1));

    await act(async () => {
      const updated = await result.current.updateNote({ activityId: 1, note: "Updated" });
      expect(updated?.note).toBe("Updated");
    });

    expect(mockJobActivityApi.updateNote).toHaveBeenCalledWith({ activityId: 1, note: "Updated" });
    expect(result.current.activities[0].note).toBe("Updated");
  });

  it("refresh gọi lại list khi autoLoad false", async () => {
    const { result } = renderHook(() => useJobActivities(5, { autoLoad: false }));

    expect(mockJobActivityApi.list).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockJobActivityApi.list).toHaveBeenCalledWith(5);
    expect(result.current.activities).toEqual(baseActivities);
  });

  it("createActivity trả về null khi không có jobLeadId", async () => {
    const { result } = renderHook(() => useJobActivities(null));

    await act(async () => {
      const created = await result.current.createActivity({
        activityType: "SEND_CV",
        content: "Gửi CV",
        happenedAt: "2025-12-01",
      });
      expect(created).toBeNull();
    });

    expect(mockJobActivityApi.create).not.toHaveBeenCalled();
  });
});
