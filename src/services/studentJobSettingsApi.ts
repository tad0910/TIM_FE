import { api } from "./api";

const STUDENT_JOB_SETTINGS_ENDPOINT = "/api/student/job-settings";

export type UserJobSettingsDTO = {
  jobInterestEnabled: boolean;
};

export type UpdateUserJobSettingsRequest = {
  jobInterestEnabled: boolean;
};

export const studentJobSettingsApi = {
  async getMySettings(): Promise<UserJobSettingsDTO> {
    return api.get<UserJobSettingsDTO>(`${STUDENT_JOB_SETTINGS_ENDPOINT}/me`);
  },

  async updateMySettings(jobInterestEnabled: boolean): Promise<UserJobSettingsDTO> {
    return api.patch<UserJobSettingsDTO>(`${STUDENT_JOB_SETTINGS_ENDPOINT}/me`, {
      jobInterestEnabled,
    } satisfies UpdateUserJobSettingsRequest);
  },
};

export default studentJobSettingsApi;
