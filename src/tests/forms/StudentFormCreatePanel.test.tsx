import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import StudentFormCreatePanel from "../../components/forms/StudentFormCreatePanel";
import type { FormTemplate } from "../../types/form";
import type { User } from "../../services/userApi";

function createMockFormComponent(testId: string) {
  return ({
    onSubmit,
  }: {
    onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
  }) => (
    <div data-testid={testId}>
      <button type="button" onClick={() => onSubmit({ classId: 1 })}>
        Submit Mock
      </button>
    </div>
  );
}

jest.mock("../../components/forms/StudentSearch", () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (student: User) => void }) => (
    <div data-testid="student-search-mock">
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 999,
            username: "mock.student",
            email: "mock@student.com",
            createdAt: "2024-01-01",
          } as User)
        }
      >
        Chọn học viên mock
      </button>
    </div>
  ),
}));

jest.mock("../../components/forms/FormTransferClass", () => ({
  __esModule: true,
  default: createMockFormComponent("form-transfer-mock"),
}));

jest.mock("../../components/forms/FormReservation", () => ({
  __esModule: true,
  default: createMockFormComponent("form-reservation-mock"),
}));

jest.mock("../../components/forms/FormSuspension", () => ({
  __esModule: true,
  default: createMockFormComponent("form-suspension-mock"),
}));

jest.mock("../../components/forms/FormDropout", () => ({
  __esModule: true,
  default: createMockFormComponent("form-dropout-mock"),
}));

jest.mock("../../services/formApi", () => {
  const mockGetForms = jest.fn();
  const mockApi = {
    getTemplates: jest.fn(),
    getForms: mockGetForms,
    getFormDetail: jest.fn(),
    createForm: jest.fn(),
    approveForm: jest.fn(),
    deleteForm: jest.fn(),
  };
  return {
    __esModule: true,
    studentFormApi: mockApi,
    default: mockApi,
    mockGetForms,
  };
});

const { mockGetForms } = jest.requireMock("../../services/formApi") as {
  mockGetForms: jest.Mock;
};

describe("StudentFormCreatePanel", () => {
  const templates: FormTemplate[] = [
    { id: 1, code: "TRANSFER", name: "Chuyển lớp" },
    { id: 2, code: "DROPOUT", name: "Thôi học" },
  ];

  const sampleStudent: User = {
    id: 101,
    username: "john.doe",
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "0123456789",
    createdAt: "2024-01-01",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables dropout template when the student already has a dropout form", async () => {
    mockGetForms.mockResolvedValueOnce([
      {
        id: 55,
        studentId: sampleStudent.id,
        templateName: "Đơn thôi học",
      },
    ]);

    render(
      <StudentFormCreatePanel
        templates={templates}
        initialStudent={sampleStudent}
        hideStudentSearch
      />,
    );

    await waitFor(() => expect(mockGetForms).toHaveBeenCalledTimes(1));

    const dropoutButton = screen.getByRole("button", { name: /thôi học/i });
    expect(dropoutButton).toBeDisabled();
    expect(screen.getByText(/đã tồn tại đơn thôi học/i)).toBeInTheDocument();
  });

  it("renders transfer form after selecting a template and notifies on success", async () => {
    mockGetForms.mockResolvedValueOnce([]);
    const onSuccess = jest.fn();

    render(
      <StudentFormCreatePanel
        templates={templates}
        initialStudent={sampleStudent}
        hideStudentSearch
        onFormSuccess={onSuccess}
      />,
    );

    await waitFor(() => expect(mockGetForms).toHaveBeenCalledTimes(1));

    const transferButton = screen.getByRole("button", { name: /chuyển lớp/i });
    fireEvent.click(transferButton);

    const transferForm = await screen.findByTestId("form-transfer-mock");
    expect(transferForm).toBeInTheDocument();

    fireEvent.click(within(transferForm).getByRole("button", { name: /submit mock/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByText(/Vui lòng chọn loại đơn để bắt đầu tạo đơn/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows placeholder message when no student is selected", () => {
    mockGetForms.mockResolvedValueOnce([]);

    render(<StudentFormCreatePanel templates={templates} />);

    expect(
      screen.getByText(/Vui lòng chọn học viên để bắt đầu tạo đơn/i),
    ).toBeInTheDocument();
  });
});
