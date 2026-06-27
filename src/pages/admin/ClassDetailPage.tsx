import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useClassDetail } from "../../hooks/api/useClassDetail";
import ClassMembersModal from "../../modules/class/components/ClassMembersModal";
import NotificationPopup from "../../components/NotificationPopup";
import ClassFormsSection from "./components/ClassFormsSection";
import ClassGradesSection from "./components/ClassGradesSection";
import ClassJobsSection from "./components/ClassJobsSection";
import ClassTuitionSection from "./components/ClassTuitionSection";
import ClassModulesSection from "./components/ClassModulesSection";
import ClassAttendanceSection from "./components/ClassAttendanceSection";
import { useNotification } from "../../hooks/useNotification";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import TableSkeleton from "../../components/TableSkeleton";
import ClassDetailTabs, { type ClassTabKey } from "./components/ClassDetailTabs";

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const queryClient = useQueryClient();
  const { updateHeader, resetHeader } = useAdminHeader();
  const numericClassId = classId ? Number(classId) : null;

  const {
    classInfo,
    modules = [],
    isClassLoading: classLoading,
    isModulesLoading: modulesLoading,
    error: classError,
    refetchClass,
  } = useClassDetail(numericClassId, { includeModules: true });

  const loading = classLoading || modulesLoading;
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ClassTabKey>("modules");
  const [showMembersModal, setShowMembersModal] = useState(false);
  const {
    notification,
    showSuccess,
    showWarning,
    hideNotification,
    showApiError,
  } = useNotification();

  const headerRef = useRef<{ title: string; desc: string } | null>(null);
  useEffect(() => {
    if (!classInfo) return;
    const nextTitle = classInfo.className || "Lớp học";
    const nextDesc = classInfo.description || "Thông tin lớp học";
    const prev = headerRef.current;
    if (prev && prev.title === nextTitle && prev.desc === nextDesc) return;
    headerRef.current = { title: nextTitle, desc: nextDesc };
    updateHeader({
      title: nextTitle,
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Lớp học", href: "/admin/classes" },
        { label: nextTitle },
      ],
    });
  }, [classInfo, updateHeader]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as ClassTabKey | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search, activeTab]);

  const handleSelectTab = (tab: ClassTabKey) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  useEffect(() => {
    return () => resetHeader();
  }, [resetHeader]);

  const programIdForClass = useMemo(() => {
    return (classInfo as any)?.programId ?? classInfo?.program?.id ?? null;
  }, [classInfo?.program?.id, (classInfo as any)?.programId]);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-4"></div>
          <div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  if (classError || !classInfo) {
    return (
      <div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {classError?.message || "Không tìm thấy lớp học"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClassDetailTabs activeTab={activeTab} onSelect={handleSelectTab} />

      {activeTab === "modules" && (
        <ClassModulesSection
          classId={numericClassId}
          classInfo={classInfo}
          modules={modules}
          modulesLoading={modulesLoading}
          refetchClass={refetchClass}
          notificationApi={{ showSuccess, showWarning, showApiError }}
        />
      )}

      {activeTab === "students" && (
        <ClassFormsSection
          classInfo={classInfo}
          numericClassId={numericClassId}
          onOpenMembersModal={() => setShowMembersModal(true)}
          showSuccess={showSuccess}
          showApiError={showApiError}
        />
      )}

      {activeTab === "attendance" && (
        <ClassAttendanceSection
          classId={numericClassId}
          isActive={activeTab === "attendance"}
        />
      )}

      {activeTab === "jobs" && (
        <ClassJobsSection
          classInfo={classInfo}
          numericClassId={numericClassId}
          refetchClass={refetchClass}
          showSuccess={showSuccess}
          showApiError={showApiError}
        />
      )}

      {activeTab === "tuition" && (
        <ClassTuitionSection
          classInfo={classInfo}
          numericClassId={numericClassId}
          programIdForClass={programIdForClass}
        />
      )}

      {activeTab === "grades" && (
        <ClassGradesSection
          classId={numericClassId}
          classInfo={classInfo}
          modules={modules}
          showSuccess={showSuccess}
          showWarning={showWarning}
          showApiError={showApiError}
        />
      )}

      {showMembersModal && classInfo && (
        <ClassMembersModal
          isOpen={showMembersModal}
          onClose={() => {
            setShowMembersModal(false);
          }}
          classInfo={classInfo}
          onSuccess={() =>
            Promise.all([
              queryClient.invalidateQueries({ queryKey: ["class", classId] }),
              queryClient.invalidateQueries({ queryKey: ["class-modules", classId] }),
            ])
          }
        />
      )}

      <NotificationPopup
        notification={notification}
        onClose={hideNotification}
      />
    </div>
  );
}
