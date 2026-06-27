import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import HomePage from "../modules/dashboard/pages/HomePage";
import FormsManagementPage from "../pages/ministry/FormsManagementPage";
import ProfilePage from "../modules/profile/pages/ProfilePage";
import SchedulePage from "../modules/profile/pages/SchedulePage";
import ScoresPage from "../modules/profile/pages/ScoresPage";
import RewardPointsPage from "../modules/profile/pages/RewardPointsPage";
import GradeHistoryPage from "../modules/profile/pages/GradeHistoryPage";
import TuitionPage from "../modules/profile/pages/TuitionPage";
import CompetencyPage from "../modules/profile/pages/CompetencyPage";
import AchievementDetailPage from "../modules/profile/pages/AchievementDetailPage";
import CourseDetailPage from "../modules/course/pages/CourseDetailPage";
import PostDetailPage from "../pages/PostDetailPage";
import LoginPage from "../modules/auth/pages/LoginPage";
import ForgotPasswordPage from "../modules/auth/pages/ForgotPasswordPage";
import VerifyOTPPage from "../modules/auth/pages/VerifyOTPPage";
import ResetPasswordPage from "../modules/auth/pages/ResetPasswordPage";
import NotificationPage from "../pages/notificationPage";
import ModuleSessionsPage from "../pages/ModuleSessionsPage";
import SessionDetailPage from "../pages/SessionDetailPage";
import DashboardPage from "../pages/admin/DashboardPage";
import TuitionAdminDashboardPage from "../pages/admin/TuitionAdminDashboardPage";
import StudentTuitionDetailPage from "../pages/admin/StudentTuitionDetailPage";
import ClassesManagementPage from "../pages/admin/ClassesManagementPage";
import ClassDetailPage from "../pages/admin/ClassDetailPage";
import ModuleDetailPage from "../pages/admin/ModuleDetailPage";
import ModulesManagementPage from "../pages/admin/ModulesManagementPage";
import SessionsManagementPage from "../pages/admin/SessionsManagementPage";
import ProgramsPage from "../pages/admin/ProgramsPage";
import ProgramModulesPage from "../pages/admin/ProgramModulesPage";
import ScheduleManagementPage from "../pages/admin/ScheduleManagementPage";
import TeacherAttendanceManagementPage from "../pages/AttendanceManagementPage";
import UserManagementPage from "../pages/admin/UserManagementPage";
import RoleManagementPage from "../pages/admin/RoleManagementPage";
import PermissionManagementPage from "../pages/admin/PermissionManagementPage";
import DeletedUsersPage from "../pages/admin/DeletedUsersPage";
import AdminModuleSessionsPage from "../pages/admin/ModuleSessionsPage";
import GradeDetailPage from "../pages/admin/GradeDetailPage";
import StudentFormsPage from "../pages/admin/StudentFormsPage";
import StudentFormDetailPage from "../pages/admin/StudentFormDetailPage";
import RewardPointsListPage from "../pages/admin/RewardPointsListPage";
import PrivacyPolicyPage from "../pages/admin/PrivacyPolicyPage";
import PrivacyPolicyPublicPage from "../pages/PrivacyPolicyPublicPage";
import CreateRewardPointPage from "../pages/admin/CreateRewardPointPage";
import AchievementsListPage from "../pages/admin/AchievementsListPage";
import AchievementLevelsListPage from "../pages/admin/AchievementLevelsListPage";
import CreateAchievementLevelPage from "../pages/admin/CreateAchievementLevelPage";
import BehaviorListPage from "../pages/admin/BehaviorListPage";
import BehaviorGroupsListPage from "../pages/admin/BehaviorGroupsListPage";
import CreateBehaviorPage from "../pages/admin/CreateBehaviorPage";
import EditBehaviorPage from "../pages/admin/EditBehaviorPage";
import GamificationGuidePage from "../pages/admin/GamificationGuidePage";
import FinancialPolicyPage from "../pages/admin/FinancialPolicyPage";
import EducationPolicyPage from "../pages/admin/EducationPolicyPage";
import NotificationTemplatesListPage from "../pages/admin/NotificationTemplatesListPage";
import CreateNotificationTemplatePage from "../pages/admin/CreateNotificationTemplatePage";
import TeacherFormsPage from "../pages/teacher/TeacherFormsPage";
import { AuthenticationRouter, PublicRouter } from "../modules/auth/components/Router";
import { AdminRouter } from "../modules/auth/components/AdminRouter";
import CompanyListPage from "../pages/CompanyListPage";
import JobTrackingPage from "../pages/JobTrackingPage";
import JobTrackingAdminPage from "../pages/admin/JobTrackingAdminPage";
import UserCoursePage from "../modules/course/pages/UserCoursePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRouter><LoginPage /></PublicRouter>} />
      <Route path="/forgot-password" element={<PublicRouter><ForgotPasswordPage /></PublicRouter>} />
      <Route path="/verify-otp" element={<PublicRouter><VerifyOTPPage /></PublicRouter>} />
      <Route path="/reset-password" element={<PublicRouter><ResetPasswordPage /></PublicRouter>} />
      <Route path="/public/privacy-policy" element={<PublicRouter><PrivacyPolicyPublicPage /></PublicRouter>} />
      <Route element={<AuthenticationRouter><MainLayout /></AuthenticationRouter>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/achievements/:achievementId" element={<AchievementDetailPage />} />
        <Route path="/competency" element={<CompetencyPage />} />
        <Route path="/forms" element={<FormsManagementPage />} />
        <Route path="/my-courses" element={<UserCoursePage />} />
        <Route path="/forms/:formId" element={<StudentFormDetailPage />} />
        <Route path="/course-detail/:courseId" element={<CourseDetailPage />} />
        <Route path="/post/:postId" element={<PostDetailPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/scores" element={<ScoresPage />} />
        <Route path="/scores/rewards" element={<RewardPointsPage />} />
        <Route path="/grade-history" element={<GradeHistoryPage />} />
        <Route path="/tuition" element={<TuitionPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/companies" element={<CompanyListPage />} />
        <Route path="/job-tracking" element={<JobTrackingPage />} />
        <Route path="/modules/:moduleId" element={<ModuleSessionsPage />} />
        <Route path="/session/:sessionId" element={<SessionDetailPage />} />
        <Route path="/attendance-management" element={<TeacherAttendanceManagementPage />} />
        <Route path="/teacher/forms" element={<TeacherFormsPage />} />
        <Route path="/teacher/forms/:formId" element={<StudentFormDetailPage />} />
        <Route path="/gamification/guide" element={<GamificationGuidePage />} />
        <Route path="/financial-policy" element={<FinancialPolicyPage />} />
        <Route path="/education-policy" element={<EducationPolicyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      </Route>
      <Route element={<AuthenticationRouter><AdminRouter><AdminLayout /></AdminRouter></AuthenticationRouter>}>
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/tuition" element={<TuitionAdminDashboardPage />} />
        <Route path="/admin/tuition/students/:studentId" element={<StudentTuitionDetailPage />} />
        <Route path="/admin/classes" element={<ClassesManagementPage />} />
        <Route path="/admin/classes/:classId" element={<ClassDetailPage />} />
        <Route path="/admin/classes/:classId/modules/:moduleId" element={<ModuleDetailPage />} />
        <Route path="/admin/modules" element={<ModulesManagementPage />} />
        <Route path="/admin/modules/:moduleId/sessions" element={<AdminModuleSessionsPage />} />
        <Route path="/admin/sessions" element={<SessionsManagementPage />} />
        <Route path="/admin/programs" element={<ProgramsPage />} />
        <Route path="/admin/programs/:programId/modules" element={<ProgramModulesPage />} />
        <Route path="/admin/schedules" element={<ScheduleManagementPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/roles" element={<RoleManagementPage />} />
        <Route path="/admin/permissions" element={<PermissionManagementPage />} />
        <Route path="/admin/users/deleted" element={<DeletedUsersPage />} />
        <Route path="/admin/grades/:classModuleId" element={<GradeDetailPage />} />
        <Route path="/admin/forms" element={<StudentFormsPage />} />
        <Route path="/admin/forms/:formId" element={<StudentFormDetailPage />} />
        <Route path="/admin/companies" element={<CompanyListPage />} />
        <Route path="/admin/job-tracking" element={<JobTrackingAdminPage />} />
        <Route path="/admin/gamification/reward-points" element={<RewardPointsListPage />} />
        <Route path="/admin/gamification/reward-points/create" element={<CreateRewardPointPage />} />
        <Route path="/admin/gamification/notifications" element={<NotificationTemplatesListPage />} />
        <Route path="/admin/gamification/notifications/create" element={<CreateNotificationTemplatePage />} />
        <Route path="/admin/gamification/notifications/:templateId/edit" element={<CreateNotificationTemplatePage />} />
        <Route path="/admin/gamification/behaviors" element={<BehaviorListPage />} />
        <Route path="/admin/gamification/behaviors/groups" element={<BehaviorGroupsListPage />} />
        <Route path="/admin/gamification/behaviors/groups/:groupId/add" element={<CreateBehaviorPage />} />
        <Route path="/admin/gamification/behaviors/:behaviorId/edit" element={<EditBehaviorPage />} />
        <Route path="/admin/gamification/achievements" element={<AchievementsListPage />} />
        <Route path="/admin/gamification/achievements/:achievementId/levels" element={<AchievementLevelsListPage />} />
        <Route path="/admin/gamification/achievements/:achievementId/levels/create" element={<CreateAchievementLevelPage />} />

      </Route>
      <Route path="*" element={<div>Not Found</div>} />
    </Routes>
  );
}
