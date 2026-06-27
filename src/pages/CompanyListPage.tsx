import { Fragment, useMemo, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Globe,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import type { Company } from '../types/company';
import TableSkeleton from '../components/TableSkeleton';
import NotificationPopup from '../components/NotificationPopup';
import { useNotification } from '../hooks/useNotification';
import {
  useCompaniesQuery,
  useCompanyDetailQuery,
  useCompanyMutations,
} from '../hooks/api/companies';

type SortKey = 'id' | 'name';

interface CompanyFormState {
  name: string;
  type: string;
  website: string;
  phone: string;
  address: string;
  introduction: string;
  products: string;
  technologies: string;
  markets: string;
}

const defaultFormState: CompanyFormState = {
  name: '',
  type: 'CODEGYM_TO_PARTNER',
  website: '',
  phone: '',
  address: '',
  introduction: '',
  products: '',
  technologies: '',
  markets: '',
};

const PAGE_SIZES = [10, 20, 50];

const CompanyListPage = () => {
  const { notification, showSuccess, showApiError, hideNotification } = useNotification();
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [formState, setFormState] = useState<CompanyFormState>(defaultFormState);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const listParams = useMemo(() => ({ page, size: pageSize }), [page, pageSize]);
  const { data, isLoading, isError, error } = useCompaniesQuery(listParams);
  const { createMutation, updateMutation, deleteMutation } = useCompanyMutations(listParams);
  const detailQuery = useCompanyDetailQuery(detailOpen ? selectedCompany?.id ?? null : null);

  const companies = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const filteredCompanies = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return companies;
    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(keyword) ||
        (company.website ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [companies, searchTerm]);

  const sortedCompanies = useMemo(() => {
    const comparator = sortKey === 'id' ? (a: Company, b: Company) => (a.id - b.id) : (a: Company, b: Company) => {
      return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
    };
    const sorted = [...filteredCompanies].sort(comparator);
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [filteredCompanies, sortDir, sortKey]);

  const toggleSort = (key: SortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'id' ? 'asc' : 'asc');
  };

  const openCreateModal = () => {
    setSelectedCompany(null);
    setFormState(defaultFormState);
    setLogoFile(null);
    setLogoPreview(null);
    setFormOpen(true);
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormState({
      name: company.name ?? '',
      type: company.type ?? 'CODEGYM_TO_PARTNER',
      website: company.website ?? '',
      phone: company.phone ?? '',
      address: company.address ?? '',
      introduction: company.introduction ?? '',
      products: company.products?.join(', ') ?? '',
      technologies: company.technologies?.join(', ') ?? '',
      markets: company.markets?.join(', ') ?? '',
    });
    setLogoFile(null);
    setLogoPreview(
      company.logoUrl && company.logoUrl !== 'https://via.placeholder.com/150'
        ? company.logoUrl
        : null
    );
    setFormOpen(true);
  };

  const openDetailModal = (company: Company) => {
    setSelectedCompany(company);
    setDetailOpen(true);
  };

  const openDeleteModal = (company: Company) => {
    setDeleteTarget(company);
    setDeleteOpen(true);
  };

  const closeFormModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setFormOpen(false);
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
  };

  const closeDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeleteOpen(false);
  };

  const handleFormChange = (
    field: keyof CompanyFormState,
    value: string
  ) => {
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setFormState((prev) => ({ ...prev, phone: digits }));
      return;
    }
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const buildFormData = () => {
    const payload = {
      name: formState.name.trim(),
      type: formState.type,
      website: formState.website.trim() || undefined,
      phone: formState.phone.trim() || undefined,
      address: formState.address.trim() || undefined,
      introduction: formState.introduction.trim() || undefined,
      products: formState.products
        ? formState.products.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
      technologies: formState.technologies
        ? formState.technologies.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
      markets: formState.markets
        ? formState.markets.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
    };

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    return formData;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      showApiError('Vui lòng nhập tên doanh nghiệp', 'Thiếu thông tin', 'Biểu mẫu');
      return;
    }
    const formData = buildFormData();
    try {
      if (selectedCompany) {
        await updateMutation.mutateAsync({ id: selectedCompany.id, payload: formData });
        showSuccess('Đã cập nhật doanh nghiệp');
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess('Đã tạo doanh nghiệp mới');
      }
      setFormOpen(false);
    } catch (err) {
      showApiError(err, 'Không thể lưu doanh nghiệp', 'Lỗi');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      showSuccess('Đã xóa doanh nghiệp');
      setDeleteOpen(false);
    } catch (err) {
      showApiError(err, 'Không thể xóa doanh nghiệp', 'Lỗi');
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.currentTarget.files?.length) return;
    const file = event.currentTarget.files[0];
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  const renderStatusBar = () => {
    if (!isError) return null;
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {error?.message ?? 'Không thể tải danh sách doanh nghiệp'}
      </div>
    );
  };

  return (
    <div className="space-y-5 p-6">
      <NotificationPopup notification={notification} onClose={hideNotification} />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap justify-end gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Tìm kiếm doanh nghiệp"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Thêm doanh nghiệp
          </button>
        </div>
      </section>
      {renderStatusBar()}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <span>Sắp xếp theo:</span>
          {([
            { key: 'id', label: 'STT' },
            { key: 'name', label: 'Tên' },
          ] as const).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleSort(option.key)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                sortKey === option.key
                  ? 'border-teal-200 bg-teal-50 text-teal-600'
                  : 'border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
              {sortKey === option.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          ))}
          <div className="flex items-center ml-auto gap-2">
            <span className="text-sm text-slate-600">Kích thước trang</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={pageSize}
              onChange={(event) => handlePageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">

          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Tên doanh nghiệp</th>
                <th className="px-4 py-3">Loại hình</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Công nghệ</th>
                <th className="px-4 py-3">Thị trường</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-5">
                    <TableSkeleton rows={5} columns={9} />
                  </td>
                </tr>
              ) : sortedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                    Không có doanh nghiệp phù hợp
                  </td>
                </tr>
              ) : (
                sortedCompanies.map((company, index) => (
                  <tr
                    key={company.id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => openDetailModal(company)}
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {page * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{company.name}</td>
                    <td className="px-4 py-3">
                      {company.type ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {company.type}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="text-teal-600 underline-offset-2 hover:underline"
                        >
                          {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{company.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {company.products?.length ? company.products.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {company.technologies?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {company.technologies.slice(0, 2).map((tech) => (
                            <span
                              key={tech}
                              className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700"
                            >
                              {tech}
                            </span>
                          ))}
                          {company.technologies.length > 2 && (
                            <span className="text-xs text-slate-400">...</span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {company.markets?.length ? company.markets.join(', ') : '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          onClick={() => openEditModal(company)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                          onClick={() => openDeleteModal(company)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {sortedCompanies.length} / {totalElements} doanh nghiệp
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((prev) => (prev + 1 >= totalPages ? prev : prev + 1))}
              disabled={page + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <CompanyFormModal
        open={formOpen}
        onClose={closeFormModal}
        formState={formState}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        uploading={createMutation.isPending || updateMutation.isPending}
        logoPreview={logoPreview}
        onLogoChange={handleLogoChange}
        selectedCompany={selectedCompany}
      />

      <CompanyDetailModal
        open={detailOpen}
        onClose={closeDetailModal}
        company={detailQuery.data ?? selectedCompany}
        isLoading={detailQuery.isLoading}
      />

      <DeleteCompanyModal
        open={deleteOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        company={deleteTarget}
        deleting={deleteMutation.isPending}
      />
    </div>
  );
};

interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  formState: CompanyFormState;
  onChange: (field: keyof CompanyFormState, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  uploading: boolean;
  logoPreview: string | null;
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedCompany: Company | null;
}

function CompanyFormModal({
  open,
  onClose,
  formState,
  onChange,
  onSubmit,
  uploading,
  logoPreview,
  onLogoChange,
  selectedCompany,
}: CompanyFormModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold text-slate-900">
                    {selectedCompany ? 'Chỉnh sửa doanh nghiệp' : 'Thêm doanh nghiệp'}
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                    onClick={onClose}
                    disabled={uploading}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Tên doanh nghiệp *</label>
                        <input
                          type="text"
                          value={formState.name}
                          onChange={(event) => onChange('name', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Loại hình</label>
                        <select
                          value={formState.type}
                          onChange={(event) => onChange('type', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        >
                          <option value="CODEGYM_TO_PARTNER">CodeGym tiếp cận</option>
                          <option value="OFFICIAL_PARTNER">Đối tác chính thức</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Website</label>
                        <input
                          type="text"
                          value={formState.website}
                          onChange={(event) => onChange('website', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Số điện thoại</label>
                        <input
                          type="text"
                          value={formState.phone}
                          onChange={(event) => onChange('phone', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Địa chỉ</label>
                        <input
                          type="text"
                          value={formState.address}
                          onChange={(event) => onChange('address', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Sản phẩm (phân cách dấu phẩy)</label>
                        <input
                          type="text"
                          value={formState.products}
                          onChange={(event) => onChange('products', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Công nghệ</label>
                        <input
                          type="text"
                          value={formState.technologies}
                          onChange={(event) => onChange('technologies', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Thị trường</label>
                        <input
                          type="text"
                          value={formState.markets}
                          onChange={(event) => onChange('markets', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Giới thiệu</label>
                        <textarea
                          rows={3}
                          value={formState.introduction}
                          onChange={(event) => onChange('introduction', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Logo</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                          onChange={onLogoChange}
                          disabled={uploading}
                        />
                        {logoPreview && (
                          <div className="mt-2">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="h-16 rounded border border-slate-200 object-contain p-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                      onClick={onClose}
                      disabled={uploading}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                      disabled={uploading}
                    >
                      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Lưu
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface CompanyDetailModalProps {
  open: boolean;
  onClose: () => void;
  company: Company | null | undefined;
  isLoading: boolean;
}

function CompanyDetailModal({ open, onClose, company, isLoading }: CompanyDetailModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold text-slate-900">
                    Thông tin doanh nghiệp
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {isLoading ? (
                  <div className="py-10 text-center text-sm text-slate-500">Đang tải...</div>
                ) : !company ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    Không tìm thấy doanh nghiệp
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="max-h-24 max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">Không logo</span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{company.name}</h2>
                        <p className="text-sm text-slate-500">{company.type ?? '—'}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailItem icon={<Globe className="h-4 w-4" />} label="Website">
                        {company.website ? (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-600 underline-offset-2 hover:underline"
                          >
                            {company.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </DetailItem>
                      <DetailItem icon={<Phone className="h-4 w-4" />} label="Số điện thoại">
                        {company.phone ?? '—'}
                      </DetailItem>
                      <DetailItem icon={<MapPin className="h-4 w-4" />} label="Địa chỉ">
                        {company.address ?? '—'}
                      </DetailItem>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">Giới thiệu</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {company.introduction ?? 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoChips title="Công nghệ" items={company.technologies} />
                      <InfoChips title="Sản phẩm" items={company.products} />
                      <InfoChips title="Thị trường" items={company.markets} />
                    </div>
                  </div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="rounded-lg bg-white p-1 text-slate-500">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function InfoChips({ title, items }: { title: string; items?: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
      {items?.length ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Chưa cập nhật</p>
      )}
    </div>
  );
}

interface DeleteCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  company: Company | null;
  deleting: boolean;
}

function DeleteCompanyModal({
  open,
  onClose,
  onConfirm,
  company,
  deleting,
}: DeleteCompanyModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-center gap-3 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                  <DialogTitle className="text-lg font-semibold text-rose-600">
                    Xóa doanh nghiệp?
                  </DialogTitle>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Việc này sẽ xóa vĩnh viễn doanh nghiệp {company?.name}. Bạn chắc chắn muốn tiếp tục?
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    onClick={onClose}
                    disabled={deleting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    onClick={onConfirm}
                    disabled={deleting}
                  >
                    {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Xóa
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default CompanyListPage;