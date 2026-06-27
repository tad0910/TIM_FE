const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
};

jest.mock("../../services/api", () => ({
  api: mockApi,
}));

import jobLeadApi from "../../services/jobLeadApi";

describe("jobLeadApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.delete.mockReset();
  });

  it("getMyLeads gọi đúng endpoint và map dữ liệu", async () => {
    mockApi.get.mockResolvedValue([
      {
        id: 1,
        companyName: "ABC",
        shortName: "A",
        address: "Số 1",
        website: "abc.com",
        statusCode: "NEW",
        statusLabel: "Mới tạo",
        status: "Mới tạo",
        fromAdmin: true,
        date: "2025-12-01",
      },
    ]);

    const result = await jobLeadApi.getMyLeads(42);

    expect(mockApi.get).toHaveBeenCalledWith("/api/student/job-leads/my-leads/42");
    expect(result).toEqual([
      {
        id: 1,
        companyName: "ABC",
        shortName: "A",
        address: "Số 1",
        website: "abc.com",
        statusCode: "NEW",
        statusLabel: "Mới tạo",
        status: "Mới tạo",
        isFromAdmin: true,
        date: "2025-12-01",
      },
    ]);
  });

  it("create gọi POST đúng endpoint và trả về lead đã map", async () => {
    mockApi.post.mockResolvedValue({
      id: 9,
      companyName: "New Co",
      shortName: "NC",
      address: "Địa chỉ",
      website: "https://newco.com",
      statusCode: null,
      statusLabel: null,
      status: "Mới tạo",
      isFromAdmin: false,
      date: "2025-12-05",
    });

    const payload = { companyName: "New Co", shortName: "NC" };
    const lead = await jobLeadApi.create(55, payload);

    expect(mockApi.post).toHaveBeenCalledWith("/api/student/job-leads/55", payload);
    expect(lead).toEqual({
      id: 9,
      companyName: "New Co",
      shortName: "NC",
      address: "Địa chỉ",
      website: "https://newco.com",
      statusCode: null,
      statusLabel: null,
      status: "Mới tạo",
      isFromAdmin: false,
      date: "2025-12-05",
    });
  });

  it("delete gọi DELETE đúng endpoint", async () => {
    mockApi.delete.mockResolvedValue("OK");

    const result = await jobLeadApi.delete(7, 77);

    expect(mockApi.delete).toHaveBeenCalledWith("/api/student/job-leads/7/student/77");
    expect(result).toBe("OK");
  });
});
