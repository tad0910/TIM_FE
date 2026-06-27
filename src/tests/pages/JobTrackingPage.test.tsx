import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobTrackingPage from "../../pages/JobTrackingPage";

const mockNavigate = jest.fn();
const mockUseJobLeads = jest.fn();
const mockUseJobActivities = jest.fn();
const mockNotification = {
  notification: null,
  showSuccess: jest.fn(),
  showWarning: jest.fn(),
  showApiError: jest.fn(),
  hideNotification: jest.fn(),
};

jest.mock("../../hooks/useJobLeads", () => ({
  __esModule: true,
  default: () => mockUseJobLeads(),
}));

jest.mock("../../hooks/useJobActivities", () => ({
  __esModule: true,
  default: () => mockUseJobActivities(),
}));

jest.mock("../../hooks/useNotification", () => ({
  useNotification: () => mockNotification,
}));

jest.mock("react-router-dom", () => ({
  ...(jest.requireActual("react-router-dom") as Record<string, unknown>),
  useNavigate: () => mockNavigate,
}));

const mockLeads = [
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
  {
    id: 2,
    companyName: "XYZ",
    shortName: "X",
    address: "456",
    website: "xyz.com",
    statusCode: "OFFER",
    statusLabel: "Đã nhận offer",
    status: "OFFER",
    isFromAdmin: true,
    date: "2025-12-02",
  },
];

const mockActivities = [
  {
    id: 101,
    jobLeadId: 1,
    activityType: "SEND_CV",
    content: "Gửi CV",
    happenedAt: "2025-12-01",
    createdAt: "2025-12-01",
    salaryAmount: undefined,
    note: "",
    fileUrl: undefined,
  },
];

describe("JobTrackingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseJobLeads.mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
      createLead: jest.fn().mockResolvedValue(mockLeads[0]),
      deleteLead: jest.fn().mockResolvedValue(true),
    });

    mockUseJobActivities.mockReturnValue({
      activities: mockActivities,
      loading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
      createActivity: jest.fn().mockResolvedValue(mockActivities[0]),
      updateNote: jest.fn().mockResolvedValue({ ...mockActivities[0], note: "Updated" }),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <JobTrackingPage />
      </MemoryRouter>
    );

  it("hiển thị danh sách đầu mối và hoạt động đầu tiên", async () => {
    renderPage();

    expect(await screen.findByText("Theo dõi đầu mối việc làm")).toBeInTheDocument();
    const leadSectionTitle = screen.getByText("Đầu mối của bạn");
    const leadSection = (leadSectionTitle.closest("section") ?? leadSectionTitle.closest("div")) as HTMLElement;
    expect(within(leadSection).getByText("ABC")).toBeInTheDocument();
    expect(within(leadSection).getByText("XYZ")).toBeInTheDocument();

    const timelineTitle = screen.getByText("Nhật ký hoạt động");
    const timelineSection = (timelineTitle.closest("section") ?? timelineTitle.closest("div")) as HTMLElement;
    const timelineItems = within(timelineSection).getAllByRole("listitem");
    expect(timelineItems.length).toBeGreaterThan(0);
    expect(within(timelineItems[0]).getByText("Gửi CV", { selector: "p" })).toBeInTheDocument();
  });

  it("bấm nút quay lại sẽ gọi navigate(-1)", async () => {
    renderPage();

    const backButton = await screen.findByRole("button", { name: /Quay lại/i });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("submit form thêm hoạt động gọi createActivity và refresh", async () => {
    const createActivitySpy = jest.fn().mockResolvedValue({
      id: 999,
      jobLeadId: 1,
      activityType: "SEND_CV",
      content: "Nội dung",
      happenedAt: "2025-12-01",
      createdAt: "2025-12-01",
      salaryAmount: undefined,
      note: "",
      fileUrl: undefined,
    });
    const refreshSpy = jest.fn().mockResolvedValue(undefined);
    const refreshActivitiesSpy = jest.fn().mockResolvedValue(undefined);

    mockUseJobActivities.mockReturnValue({
      activities: mockActivities,
      loading: false,
      error: null,
      refresh: refreshActivitiesSpy,
      createActivity: createActivitySpy,
      updateNote: jest.fn().mockResolvedValue(null),
    });

    mockUseJobLeads.mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      refresh: refreshSpy,
      createLead: jest.fn().mockResolvedValue(mockLeads[0]),
      deleteLead: jest.fn().mockResolvedValue(true),
    });

    renderPage();

    const textarea = await screen.findByPlaceholderText(/VD: Gửi CV bản tiếng Anh/i);
    fireEvent.change(textarea, { target: { value: "Đã gửi CV" } });

    const submitButton = screen.getByRole("button", { name: /Thêm hoạt động/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createActivitySpy).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      expect(refreshActivitiesSpy).toHaveBeenCalled();
      expect(mockNotification.showSuccess).toHaveBeenCalledWith(
        "Đã thêm hoạt động",
        expect.stringContaining("Gửi CV")
      );
    });
  });

  it("hiển thị state rỗng khi không có hoạt động", async () => {
    mockUseJobActivities.mockReturnValue({
      activities: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
      createActivity: jest.fn(),
      updateNote: jest.fn(),
    });

    renderPage();

    expect(await screen.findByText(/Chưa có hoạt động nào cho đầu mối này/i)).toBeInTheDocument();
  });
});
