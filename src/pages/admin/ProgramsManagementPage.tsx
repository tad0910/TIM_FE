import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { programApi } from '../../services/programApi';
import { moduleApi } from '../../services/moduleApi';
import type { Program } from '../../types/program';
import type { Module } from '../../types/module';
import TableSkeleton from '../../components/TableSkeleton';
import Pagination from '../../components/Pagination';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import AdminPageHeader from '../../components/AdminPageHeader';

export default function ProgramsManagementPage() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showModulesModal, setShowModulesModal] = useState<Program | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortKey, setSortKey] = useState<'id'|'name'>('id');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { notification, showSuccess, hideNotification, showApiError } = useNotification();
  const toggleSort = (key: 'id'|'name') => {
    setCurrentPage(0);
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const fetchPrograms = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    try {
      if (initialLoading) setInitialLoading(true);
      else {
        if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = window.setTimeout(() => setShowOverlay(true), 120);
      }
      const reqId = ++requestIdRef.current;
      setError(null);
      const response = await programApi.getAllPrograms(page, size, `${sortKey},${sortDir}`);
      if (reqId === requestIdRef.current) {
        setPrograms(response.content || []);
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
        if (typeof response.number === 'number' && response.number !== currentPage) {
          setCurrentPage(response.number);
        }
      }
    } catch (err) {
      console.error('Failed to load programs:', err);
      const message = showApiError(err, 'Không thể tải danh sách chương trình học. Vui lòng thử lại.', 'Lỗi tải chương trình học');
      setError(message);
      if (initialLoading) setPrograms([]);
    } finally {
      if (initialLoading) setInitialLoading(false);
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
      setShowOverlay(false);
    }
  }, [currentPage, pageSize, sortKey, sortDir, initialLoading]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const handleDelete = (id: number) => {
    const p = programs.find(x => x.id === id) || null;
    setDeleteTarget(p);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setProcessing(true);
      await programApi.deleteProgram(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPrograms(currentPage);
      showSuccess('Xóa chương trình học', 'Đã xóa chương trình học.');
    } catch (err: any) {
      console.error('Failed to delete program:', err);
      showApiError(err, 'Không thể xóa chương trình học. Vui lòng thử lại.', 'Lỗi xóa chương trình học');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreate = async (data: { name: string; description?: string }) => {
    try {
      setProcessing(true);
      await programApi.createProgram(data);
      setShowCreateModal(false);
      await fetchPrograms(currentPage);
      showSuccess('Tạo chương trình học', 'Chương trình học mới đã được thêm.');
    } catch (err) {
      console.error('Failed to create program:', err);
      showApiError(err, 'Không thể tạo chương trình học. Vui lòng thử lại.', 'Lỗi tạo chương trình học');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async (id: number, data: { name?: string; description?: string }) => {
    try {
      setProcessing(true);
      const existing = programs.find(p => p.id === id);
      const payload = {
        name: (data.name ?? existing?.name ?? ''),
        description: (data.description ?? existing?.description ?? ''),
      } as Omit<Program, 'id'>;
      await programApi.updateProgram(id, payload);
      setSelectedProgram(null);
      await fetchPrograms(currentPage);
      showSuccess('Cập nhật chương trình học', 'Thông tin đã được cập nhật.');
    } catch (err) {
      console.error('Failed to update program:', err);
      showApiError(err, 'Không thể cập nhật chương trình học. Vui lòng thử lại.', 'Lỗi cập nhật chương trình học');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return programs;
    return programs.filter((program) => program.name?.toLowerCase().includes(keyword));
  }, [programs, searchTerm]);

  const sttOrderPrograms = useMemo(() => {
    return [...filteredPrograms.map(p => p.id)].sort((a, b) => a - b);
  }, [filteredPrograms]);

  if (initialLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Chương trình học</h1>
          <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin') },
          { label: 'Chương trình học', onClick: () => navigate('/admin/programs'), active: true },
        ]}
        title="Quản lý Chương trình học"
        rightSlot={(
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={processing}
          >
            <PlusIcon className="w-5 h-5" />
            Tạo Chương trình học mới
          </button>
        )}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
        {showOverlay && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span>Đang tải...</span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
          <span className="text-sm text-gray-600">Sắp xếp:</span>
          <button
            className={`px-3 py-1.5 text-sm rounded border ${sortKey==='id'?'bg-indigo-600 text-white border-indigo-600':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => toggleSort('id')}
          >STT {sortKey==='id' ? (sortDir==='asc'?'↑':'↓') : ''}</button>
          <button
            className={`px-3 py-1.5 text-sm rounded border ${sortKey==='name'?'bg-indigo-600 text-white border-indigo-600':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => toggleSort('name')}
          >Tên {sortKey==='name' ? (sortDir==='asc'?'A → Z':'Z → A') : ''}</button>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                placeholder="Tìm kiếm chương trình học..."
                className="w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Mỗi trang</span>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  setPageSize(size);
                  setCurrentPage(0);
                  fetchPrograms(0, size);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên Chương trình học</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {programs.length === 0 ? 'Chưa có chương trình học nào' : 'Không tìm thấy chương trình phù hợp'}
                  </td>
                </tr>
              ) : filteredPrograms.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(`/admin/programs/${p.id}/modules`);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{sttOrderPrograms.indexOf(p.id) + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{p.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{p.modules?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedProgram(p); }} 
                        className="text-indigo-600 hover:text-indigo-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={processing}
                        title="Chỉnh sửa"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} 
                        className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={processing}
                        title="Xóa"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={(newPage) => fetchPrograms(newPage)}
          itemName="chương trình học"
        />
      </div>

      {showCreateModal && (<CreateProgramModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} />)}
      {selectedProgram && (<EditProgramModal program={selectedProgram} onClose={() => setSelectedProgram(null)} onSave={(d) => handleUpdate(selectedProgram.id, d)} />)}
      {showModulesModal && (<ManageModulesModal program={showModulesModal} onClose={() => setShowModulesModal(null)} onSave={async (ids) => { 
        try {
          await programApi.addModulesToProgram(showModulesModal.id, ids); 
          setShowModulesModal(null); 
          fetchPrograms(currentPage); 
          showSuccess('Cập nhật modules', 'Danh sách module của chương trình đã được cập nhật.');
        } catch (err: any) {
          console.error('Failed to update modules:', err);
          showApiError(err, 'Không thể cập nhật modules. Vui lòng thử lại.', 'Lỗi cập nhật modules');
        }
      }} />)}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Xóa Chương trình học</h2>
            <p className="text-sm text-gray-600 mb-4">Bạn có chắc muốn xóa "{deleteTarget.name}"?</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Xóa</button>
            </div>
          </div>
        </div>
      )}

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </div>
  );
}

function CreateProgramModal({ onClose, onSave }: { onClose: () => void; onSave: (data: { name: string; description?: string }) => void }) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên chương trình học';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onSave({ name: formData.name, description: formData.description || undefined });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Tạo Chương trình học mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Chương trình học <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={3} /></div>
          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={submitting}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProgramModal({ program, onClose, onSave }: { program: Program; onClose: () => void; onSave: (data: { name?: string; description?: string }) => void }) {
  const [formData, setFormData] = useState({ name: program.name, description: program.description || '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên chương trình học';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onSave({ name: formData.name, description: formData.description || undefined });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa Chương trình học</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Chương trình học <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={3} /></div>
          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={submitting}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageModulesModal({ program, onClose, onSave }: { program: Program; onClose: () => void; onSave: (moduleIds: number[]) => void }) {
  const pageSize = 10;
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  const [unselectedSearchTerm, setUnselectedSearchTerm] = useState('');
  const [selectedSearchTerm, setSelectedSearchTerm] = useState('');
  const [debouncedUnselectedSearch, setDebouncedUnselectedSearch] = useState('');
  const [debouncedSelectedSearch, setDebouncedSelectedSearch] = useState('');
  const [unselectedResults, setUnselectedResults] = useState<Module[] | null>(null);
  const [selectedResults, setSelectedResults] = useState<Module[] | null>(null);
  const [unselectedLoading, setUnselectedLoading] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [unselectedPage, setUnselectedPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);

  useEffect(() => {
    let isActive = true;
    setInitialLoading(true);
    setSelectedModuleIds(program.modules?.map((m) => m.id) || []);
    setUnselectedSearchTerm('');
    setSelectedSearchTerm('');
    setDebouncedUnselectedSearch('');
    setDebouncedSelectedSearch('');
    setUnselectedResults(null);
    setSelectedResults(null);
    setUnselectedPage(1);
    setSelectedPage(1);

    moduleApi
      .searchModules({ size: 1000 })
      .then((data) => {
        if (!isActive) return;
        setAllModules(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!isActive) return;
        setAllModules([]);
      })
      .finally(() => {
        if (!isActive) return;
        setInitialLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [program]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedUnselectedSearch(unselectedSearchTerm.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [unselectedSearchTerm]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSelectedSearch(selectedSearchTerm.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [selectedSearchTerm]);

  useEffect(() => {
    let isActive = true;
    setUnselectedLoading(true);
    setUnselectedPage(1);

    const performSearch = async () => {
      try {
        if (!debouncedUnselectedSearch) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          if (!isActive) return;
          setUnselectedResults(null);
          return;
        }
        const data = await moduleApi.searchModules({
          keyword: debouncedUnselectedSearch,
          size: 1000,
        });
        if (!isActive) return;
        setUnselectedResults(Array.isArray(data) ? data : []);
      } catch {
        if (!isActive) return;
        setUnselectedResults([]);
      } finally {
        if (!isActive) return;
        setUnselectedLoading(false);
      }
    };

    performSearch();
    return () => {
      isActive = false;
    };
  }, [debouncedUnselectedSearch]);

  useEffect(() => {
    let isActive = true;
    setSelectedLoading(true);
    setSelectedPage(1);

    const performSearch = async () => {
      try {
        if (!debouncedSelectedSearch) {
          await new Promise((resolve) => window.setTimeout(resolve, 3000));
          if (!isActive) return;
          setSelectedResults(null);
          return;
        }
        const data = await moduleApi.searchModules({
          keyword: debouncedSelectedSearch,
          size: 1000,
        });
        if (!isActive) return;
        setSelectedResults(Array.isArray(data) ? data : []);
      } catch {
        if (!isActive) return;
        setSelectedResults([]);
      } finally {
        if (!isActive) return;
        setSelectedLoading(false);
      }
    };

    performSearch();
    return () => {
      isActive = false;
    };
  }, [debouncedSelectedSearch]);

  const toggle = (id: number) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedModuleIds);
  };

  const baseUnselected = useMemo(
    () => allModules.filter((m) => !selectedModuleIds.includes(m.id)),
    [allModules, selectedModuleIds]
  );

  const baseSelected = useMemo(
    () => allModules.filter((m) => selectedModuleIds.includes(m.id)),
    [allModules, selectedModuleIds]
  );

  const unselectedList = useMemo(() => {
    const source = (unselectedResults ?? baseUnselected).filter(
      (m: Module) => !selectedModuleIds.includes(m.id)
    );
    return source;
  }, [unselectedResults, baseUnselected, selectedModuleIds]);

  const selectedList = useMemo(() => {
    const source = (selectedResults ?? baseSelected).filter((m: Module) =>
      selectedModuleIds.includes(m.id)
    );
    return source;
  }, [selectedResults, baseSelected, selectedModuleIds]);

  const unselectedTotalPages = Math.max(1, Math.ceil(unselectedList.length / pageSize));
  const selectedTotalPages = Math.max(1, Math.ceil(selectedList.length / pageSize));

  useEffect(() => {
    setUnselectedPage((prev) => Math.min(prev, unselectedTotalPages));
  }, [unselectedTotalPages]);

  useEffect(() => {
    setSelectedPage((prev) => Math.min(prev, selectedTotalPages));
  }, [selectedTotalPages]);

  const paginatedUnselected = useMemo(() => {
    const start = (unselectedPage - 1) * pageSize;
    return unselectedList.slice(start, start + pageSize);
  }, [unselectedList, unselectedPage]);

  const paginatedSelected = useMemo(() => {
    const start = (selectedPage - 1) * pageSize;
    return selectedList.slice(start, start + pageSize);
  }, [selectedList, selectedPage]);

  const renderPagination = (
    page: number,
    totalPages: number,
    onChange: (value: number) => void
  ) => (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <span>
        Trang {totalPages === 0 ? 0 : page}/{totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Trước
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau
        </button>
      </div>
    </div>
  );

  const renderModuleRow = (m: Module) => (
    <label
      key={m.id}
      className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <input
        type="checkbox"
        checked={selectedModuleIds.includes(m.id)}
        onChange={() => toggle(m.id)}
        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">{m.name}</span>
        {m.description && (
          <span className="text-xs text-gray-500">{m.description}</span>
        )}
      </div>
    </label>
  );

  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px]">
      <div className="max-h-[360px] h-[360px] overflow-hidden">
        {Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
            <div className="h-4 w-4 rounded border border-gray-200 bg-gray-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkeletonRows = () => (
    <div className="max-h-[360px] h-[360px] overflow-hidden">
      {Array.from({ length: Math.min(pageSize, 6) }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
        >
          <div className="h-4 w-4 rounded border border-gray-200 bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">Quản lý Modules cho {program.name}</h2>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-6">
              <section>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">Modules chưa chọn</h3>
                    <p className="text-xs text-gray-500">Chọn module để thêm vào chương trình.</p>
                  </div>
                  <div className="relative w-full md:max-w-sm">
                    <input
                      type="text"
                      value={unselectedSearchTerm}
                      onChange={(e) => setUnselectedSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm module chưa chọn..."
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg">
                  <div className="relative">
                    {initialLoading ? (
                      renderSkeletonRows()
                    ) : (
                      <>
                        <div className="max-h-[360px] h-[360px] overflow-y-auto">
                          {(paginatedUnselected.length > 0 ? paginatedUnselected : []).map(renderModuleRow)}
                          {paginatedUnselected.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              Không có module nào phù hợp.
                            </div>
                          )}
                        </div>
                        {unselectedLoading && <LoadingOverlay />}
                        {renderPagination(unselectedPage, unselectedTotalPages, setUnselectedPage)}
                      </>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">Modules đã chọn</h3>
                    <p className="text-xs text-gray-500">Bỏ chọn để loại khỏi chương trình.</p>
                  </div>
                  <div className="relative w-full md:max-w-sm">
                    <input
                      type="text"
                      value={selectedSearchTerm}
                      onChange={(e) => setSelectedSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm module đã chọn..."
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg">
                  <div className="relative">
                    {initialLoading ? (
                      renderSkeletonRows()
                    ) : (
                      <>
                        <div className="max-h-[360px] h-[360px] overflow-y-auto">
                          {(paginatedSelected.length > 0 ? paginatedSelected : []).map(renderModuleRow)}
                          {paginatedSelected.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              Chưa có module nào được chọn.
                            </div>
                          )}
                        </div>
                        {selectedLoading && <LoadingOverlay />}
                        {renderPagination(selectedPage, selectedTotalPages, setSelectedPage)}
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

