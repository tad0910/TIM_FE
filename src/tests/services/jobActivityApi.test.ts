const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};

jest.mock("../../services/api", () => ({
  api: mockApi,
}));

import jobActivityApi from "../../services/jobActivityApi";

describe("jobActivityApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
  });

  it("list gọi đúng endpoint và map dữ liệu", async () => {
    mockApi.get.mockResolvedValue([
      {
        id: 1,
        jobLead: { id: 9 },
        activityType: "SEND_CV",
        content: "Gửi CV",
        happenedAt: "2025-12-01",
        createdAt: "2025-12-02",
        salaryAmount: null,
        note: "",
        fileUrl: "https://file",
      },
    ]);

    const activities = await jobActivityApi.list(9);

    expect(mockApi.get).toHaveBeenCalledWith("/api/student/job-activities/9");
    expect(activities).toEqual([
      {
        id: 1,
        jobLeadId: 9,
        activityType: "SEND_CV",
        content: "Gửi CV",
        happenedAt: "2025-12-01",
        createdAt: "2025-12-02",
        salaryAmount: undefined,
        note: "",
        fileUrl: "https://file",
      },
    ]);
  });

  it("create gửi FormData và map response", async () => {
    const mockResponse = {
      id: 2,
      jobLead: { id: 5 },
      activityType: "OFFER_RECEIVED",
      content: "Nhận offer",
      happenedAt: "2025-12-03",
      createdAt: "2025-12-04",
      salaryAmount: "1500",
      note: "",
      fileUrl: null,
    };
    mockApi.post.mockResolvedValue(mockResponse);

    const payload = {
      jobLeadId: 5,
      activityType: "OFFER_RECEIVED" as const,
      content: "Nhận offer",
      happenedAt: "2025-12-03",
      salaryAmount: "1500",
      file: undefined,
    };

    const created = await jobActivityApi.create(payload);

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    const [url, formData] = mockApi.post.mock.calls[0] as [string, FormData];
    expect(url).toBe("/api/student/job-activities");
    expect(formData).toBeInstanceOf(FormData);

    expect(formData.get("data")).toBeTruthy();
    expect(formData.get("file")).toBeNull();

    expect(created).toEqual({
      id: 2,
      jobLeadId: 5,
      activityType: "OFFER_RECEIVED",
      content: "Nhận offer",
      happenedAt: "2025-12-03",
      createdAt: "2025-12-04",
      salaryAmount: "1500",
      note: "",
      fileUrl: undefined,
    });
  });

  it("create đính kèm file khi có payload.file", async () => {
    mockApi.post.mockResolvedValue({
      id: 3,
      jobLead: { id: 10 },
      activityType: "SEND_CV",
      content: "",
      happenedAt: "2025-12-05",
      createdAt: "2025-12-06",
    });

    const file = new File(["content"], "cv.pdf", { type: "application/pdf" });
    await jobActivityApi.create({
      jobLeadId: 10,
      activityType: "SEND_CV",
      content: "",
      happenedAt: "2025-12-05",
      file,
    });

    const [, formData] = mockApi.post.mock.calls[0] as [string, FormData];
    expect(formData.get("file")).toBe(file);
  });

  it("updateNote gửi PUT đúng endpoint và map response", async () => {
    mockApi.put.mockResolvedValue({
      id: 4,
      jobLead: { id: 8 },
      activityType: "SEND_CV",
      content: "",
      happenedAt: "2025-10-01",
      createdAt: "2025-10-02",
      note: "Updated",
    });

    const updated = await jobActivityApi.updateNote({ activityId: 4, note: "Updated" });

    expect(mockApi.put).toHaveBeenCalledWith("/api/student/job-activities/4/note", { note: "Updated" });
    expect(updated.note).toBe("Updated");
    expect(updated.jobLeadId).toBe(8);
  });
});
