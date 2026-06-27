export type ApprovalStatus = "APPROVED" | "REJECTED" | "PENDING" | "PROCESSING";

export type FormStatus = "APPROVED" | "REJECTED" | "PENDING" | "PROCESSING";

export interface FormTemplate {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface StudentFormResponse {
  id: number;
  templateName: string;
  studentId: number;
  classId?: number;
  programId?: number;
  studentName?: string;
  phoneNumber?: string;
  email?: string;
  className?: string;
  programName?: string;
  moduleId?: number;
  moduleSessionId?: number;
  reason?: string;
  startDate?: string;
  endDate?: string;
  decisionDate?: string;
  withdrawalDate?: string;
  feeAmount?: number;
  coachApproval?: ApprovalStatus;
  coachNote?: string;
  coachName?: string;
  academicApproval?: ApprovalStatus;
  academicNote?: string;
  academicName?: string;
  accountantApproval?: ApprovalStatus;
  accountantNote?: string;
  accountantName?: string;
  adminApproval?: ApprovalStatus;
  adminNote?: string;
  adminName?: string;
  status?: FormStatus;
  createdAt?: string;
}

export interface StudentFormCreateDTO {
  templateId: number;
  studentId: number;
  classId: number;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  feeAmount?: number;
  targetClassId?: number;
  targetProgramType?: string;
}

