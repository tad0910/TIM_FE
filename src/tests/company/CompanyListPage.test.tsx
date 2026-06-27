import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyListPage from '../../pages/CompanyListPage';
import { companyApi } from '../../services/companyApi';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../services/api', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
    BASE_URL: 'http://localhost:8081',
}));

jest.mock('../../services/companyApi');

const mockCompanies = [
    {
        id: 1,
        name: 'Company A',
        type: 'OFFICIAL_PARTNER',
        website: 'https://companya.com',
        phone: '1234567890',
        address: '123 Street',
        introduction: 'Intro A',
        products: ['Product A'],
        regions: ['Region A'],
        technologies: ['Tech A'],
        markets: ['Market A'],
        logoUrl: 'http://example.com/logo.png'
    },
    {
        id: 2,
        name: 'Company B',
        type: 'CODEGYM_TO_PARTNER',
        website: 'https://companyb.com',
        phone: '0987654321',
        address: '456 Avenue',
        introduction: 'Intro B',
        products: ['Product B'],
        regions: ['Region B'],
        technologies: ['Tech B'],
        markets: ['Market B'],
        logoUrl: null
    }
];

const mockPaginatedResponse = {
    content: mockCompanies,
    totalElements: 25,
    totalPages: 2,
    size: 20,
    number: 0
};

describe('CompanyListPage Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (companyApi.getAll as jest.Mock).mockResolvedValue(mockPaginatedResponse);
        global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost:3000/mock-image');
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <CompanyListPage />
            </BrowserRouter>
        );
    };

    test('renders company list correctly', async () => {
        renderComponent();

        expect(screen.getByText(/Quản lý Doanh nghiệp/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Company A')).toBeInTheDocument();
            expect(screen.getByText('Company B')).toBeInTheDocument();
        });

        expect(screen.getByText('OFFICIAL_PARTNER')).toBeInTheDocument();
        expect(screen.getByText('CODEGYM_TO_PARTNER')).toBeInTheDocument();
        expect(screen.getByText(/Tổng số: 25/)).toBeInTheDocument();
    });

    test('opens create modal and handles validation errors', async () => {
        renderComponent();
        const addButton = screen.getByRole('button', { name: /Thêm doanh nghiệp mới/i });
        fireEvent.click(addButton);

        await waitFor(() => screen.getByText('Thêm Doanh Nghiệp Mới'));

        const submitButton = screen.getByRole('button', { name: /Tạo mới/i });
        fireEvent.click(submitButton);

        expect(await screen.findByText('Thiếu thông tin')).toBeInTheDocument();
        expect(await screen.findByText('Vui lòng nhập tên doanh nghiệp!')).toBeInTheDocument();
    });

    test('validates phone input correctly', async () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /Thêm doanh nghiệp mới/i }));

        const phoneInput = await screen.findByPlaceholderText(/Tối đa 10 số/i);

        fireEvent.change(phoneInput, { target: { value: 'abc' } });
        expect(phoneInput).toHaveValue('');

        fireEvent.change(phoneInput, { target: { value: '123' } });
        expect(phoneInput).toHaveValue('123');

        fireEvent.change(phoneInput, { target: { value: '1234567890' } });
        expect(phoneInput).toHaveValue('1234567890');
    });

    test('successfully creates a new company with full data and logo', async () => {
        (companyApi.create as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        const { container } = renderComponent();

        fireEvent.click(screen.getByRole('button', { name: /Thêm doanh nghiệp mới/i }));

        const nameInput = container.querySelector('input[name="name"]');
        if (nameInput) await user.type(nameInput, 'New Company');

        const typeSelect = container.querySelector('select[name="type"]');
        if (typeSelect) await user.selectOptions(typeSelect, 'OFFICIAL_PARTNER');

        const productsInput = container.querySelector('input[name="products"]');
        if (productsInput) await user.type(productsInput, 'Product X');

        const techInput = container.querySelector('input[name="technologies"]');
        if (techInput) await user.type(techInput, 'Java');

        const websiteInput = container.querySelector('input[name="website"]');
        if (websiteInput) await user.type(websiteInput, 'https://new.com');

        const phoneInput = container.querySelector('input[name="phone"]');
        if (phoneInput) await user.type(phoneInput, '0909090909');

        const addressInput = container.querySelector('input[name="address"]');
        if (addressInput) await user.type(addressInput, 'New Address');

        const regionsInput = container.querySelector('input[name="regions"]');
        if (regionsInput) await user.type(regionsInput, 'Dev');

        const marketsInput = container.querySelector('input[name="markets"]');
        if (marketsInput) await user.type(marketsInput, 'VN');

        const introInput = container.querySelector('textarea[name="introduction"]');
        if (introInput) await user.type(introInput, 'Intro');

        const file = new File(['(⌐□_□)'], 'logo.png', { type: 'image/png' });
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) await user.upload(fileInput, file);

        expect(screen.getByAltText('Preview')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Tạo mới/i }));

        await waitFor(() => {
            expect(companyApi.create).toHaveBeenCalled();
            expect(screen.getByText('Thành công')).toBeInTheDocument();
            expect(screen.getByText('Đã thêm mới doanh nghiệp.')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.queryByText('Thêm Doanh Nghiệp Mới')).not.toBeInTheDocument();
        });

        expect(companyApi.getAll).toHaveBeenCalledTimes(2); // Initial + After Create
    }, 20000);

    test('handles creation error', async () => {
        (companyApi.create as jest.Mock).mockRejectedValue(new Error('API Error'));
        const { container } = renderComponent();

        fireEvent.click(screen.getByRole('button', { name: /Thêm doanh nghiệp mới/i }));

        const nameInput = container.querySelector('input[name="name"]');
        if (nameInput) fireEvent.change(nameInput, { target: { value: 'Fail Company' } });

        fireEvent.click(screen.getByRole('button', { name: /Tạo mới/i }));

        await waitFor(() => {
            expect(screen.getByText('Thất bại')).toBeInTheDocument();
            expect(screen.getByText('API Error')).toBeInTheDocument();
        });
    });

    test('opens edit modal, loads data, and updates successfully', async () => {
        (companyApi.update as jest.Mock).mockResolvedValue({});
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const rows = screen.getAllByRole('row');
        const editButton = within(rows[1]).getByTitle('Chỉnh sửa');
        fireEvent.click(editButton);

        await waitFor(() => screen.getByText('Cập Nhật Thông Tin'));

        expect(screen.getByDisplayValue('Company A')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Tên doanh nghiệp/i), { target: { value: 'Company A Updated' } });

        fireEvent.click(screen.getByRole('button', { name: /Cập nhật/i }));

        await waitFor(() => {
            expect(companyApi.update).toHaveBeenCalledWith(1, expect.any(FormData));
            expect(screen.getByText('Đã cập nhật thông tin doanh nghiệp.')).toBeInTheDocument();
        });
    });

    test('opens delete modal and confirms deletion', async () => {
        (companyApi.delete as jest.Mock).mockResolvedValue({});
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const rows = screen.getAllByRole('row');
        const deleteButton = within(rows[1]).getByTitle('Xóa');
        fireEvent.click(deleteButton);

        await waitFor(() => screen.getByText('Xác nhận xóa?'));

        fireEvent.click(screen.getByRole('button', { name: 'Xóa bỏ' }));

        await waitFor(() => {
            expect(companyApi.delete).toHaveBeenCalledWith(1);
            expect(screen.getByText('Đã xóa doanh nghiệp khỏi hệ thống.')).toBeInTheDocument();
        });
    });

    test('handles delete error', async () => {
        (companyApi.delete as jest.Mock).mockRejectedValue(new Error('Delete Failed'));
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const rows = screen.getAllByRole('row');
        const deleteButton = within(rows[1]).getByTitle('Xóa');
        fireEvent.click(deleteButton);

        await waitFor(() => screen.getByText('Xác nhận xóa?'));
        fireEvent.click(screen.getByRole('button', { name: 'Xóa bỏ' }));

        await waitFor(() => {
            expect(screen.getByText('Xóa thất bại')).toBeInTheDocument();
            expect(screen.getByText('Delete Failed')).toBeInTheDocument();
        });
    });

    test('opens detail view and handles fetch error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        (companyApi.getById as jest.Mock).mockRejectedValue(new Error('Fetch Detail Error'));
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        fireEvent.click(screen.getByText('Company A'));

        await waitFor(() => {
            expect(screen.getByText('Thông tin doanh nghiệp')).toBeInTheDocument();
            expect(companyApi.getById).toHaveBeenCalledWith(1);
        });

        consoleSpy.mockRestore();
    });

    test('displays "No Logo" when logo is missing in detail view', async () => {
        (companyApi.getById as jest.Mock).mockResolvedValue(mockCompanies[1]); // Company B has null logo
        renderComponent();
        await waitFor(() => screen.getByText('Company B'));

        fireEvent.click(screen.getByText('Company B'));

        await waitFor(() => {
            expect(screen.getByText('NO LOGO')).toBeInTheDocument();
        });
    });

    test('handles search functionality', async () => {
        renderComponent();
        const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo tên, website.../i);
        fireEvent.change(searchInput, { target: { value: 'Company A' } });

        await waitFor(() => {
            expect(screen.getByText('Company A')).toBeInTheDocument();
            expect(screen.queryByText('Company B')).not.toBeInTheDocument();
        });
    });

    test('sorts companies', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const nextButton = screen.getByRole('button', { name: /Sau/i });
        fireEvent.click(nextButton);
        await waitFor(() => {
            expect(companyApi.getAll).toHaveBeenCalledWith(1, 20);
        });

        const pageSizeSelect = screen.getByDisplayValue('20');
        fireEvent.change(pageSizeSelect, { target: { value: '50' } });

        await waitFor(() => {
            expect(companyApi.getAll).toHaveBeenCalledWith(0, 50);
        });
    });

    test('handles empty or invalid API response', async () => {
        (companyApi.getAll as jest.Mock).mockResolvedValue(null);
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('Không tìm thấy dữ liệu phù hợp')).toBeInTheDocument();
        });
    });

    test('triggers sort by name', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const sortNameBtn = screen.getByRole('button', { name: /Tên/i });
        fireEvent.click(sortNameBtn);

        await waitFor(() => {
            expect(companyApi.getAll).toHaveBeenCalled();
        });

        fireEvent.click(sortNameBtn);
        await waitFor(() => {
            expect(companyApi.getAll).toHaveBeenCalled();
        });
    });

    test('closes detail modal via backdrop, close icon, and bottom button', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        fireEvent.click(screen.getByText('Company A'));
        await waitFor(() => screen.getByText('Thông tin doanh nghiệp'));
        fireEvent.click(screen.getByRole('button', { name: /Đóng/i }));
        await waitFor(() => expect(screen.queryByText('Thông tin doanh nghiệp')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('Company A'));
        await waitFor(() => screen.getByText('Thông tin doanh nghiệp'));
        const header = screen.getByText('Thông tin doanh nghiệp').closest('div')?.parentElement;
        const buttons = within(header!).getAllByRole('button');
        const xBtn = buttons.find(b => !b.textContent);
        if (xBtn) fireEvent.click(xBtn);

        await waitFor(() => expect(screen.queryByText('Thông tin doanh nghiệp')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('Company A'));
        await waitFor(() => screen.getByText('Thông tin doanh nghiệp'));
        const backdrop = screen.getByText('Thông tin doanh nghiệp').closest('.fixed');
        if (backdrop) fireEvent.click(backdrop);
        await waitFor(() => expect(screen.queryByText('Thông tin doanh nghiệp')).not.toBeInTheDocument());
    });

    test('prevents row click propagation when clicking website link', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const links = screen.getAllByRole('link');
        const websiteLink = links.find(l => l.getAttribute('href') === 'https://companya.com');

        if (websiteLink) {
            fireEvent.click(websiteLink);
            expect(screen.queryByText('Thông tin doanh nghiệp')).not.toBeInTheDocument();
        }
    });

    test('navigates to previous page', async () => {
        (companyApi.getAll as jest.Mock).mockResolvedValue({
            content: mockCompanies,
            totalElements: 25,
            totalPages: 2,
            size: 20,
            number: 0
        });

        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const prevBtn = screen.getByText('Trước').closest('button');
        expect(prevBtn).toBeDisabled();

        fireEvent.click(screen.getByText('Sau'));

        await waitFor(() => expect(companyApi.getAll).toHaveBeenCalledWith(1, 20));

        expect(prevBtn).not.toBeDisabled();
        fireEvent.click(screen.getByText('Trước'));

        await waitFor(() => expect(companyApi.getAll).toHaveBeenCalledWith(0, 20));
    });

    test('displays "Chưa cập nhật" when markets list is empty in detail view', async () => {
        const companyNoMarkets = { ...mockCompanies[0], markets: [] };
        (companyApi.getById as jest.Mock).mockResolvedValue(companyNoMarkets);
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        fireEvent.click(screen.getByText('Company A'));

        await waitFor(() => {
            expect(screen.getByText('Chưa cập nhật')).toBeInTheDocument();
        });
    });

    test('sorts companies with identical values', async () => {
        const companiesSame = [
            { ...mockCompanies[0], name: 'Same Name', id: 1 },
            { ...mockCompanies[0], name: 'Same Name', id: 2 }
        ];
        (companyApi.getAll as jest.Mock).mockResolvedValue({ content: companiesSame });
        renderComponent();
        await waitFor(() => screen.getAllByText('Same Name'));

        const sortNameBtn = screen.getByRole('button', { name: /Tên/i });
        fireEvent.click(sortNameBtn);

        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(3);
    });

    test('triggers sort by STT (ID)', async () => {
        const companiesList = [
            { ...mockCompanies[0], name: 'A', id: 1 },
            { ...mockCompanies[0], name: 'B', id: 2 }
        ];
        (companyApi.getAll as jest.Mock).mockResolvedValue({ content: companiesList });

        renderComponent();
        await waitFor(() => screen.getByText('A'));

        const sortIdBtn = screen.getByRole('button', { name: /STT/i });

        fireEvent.click(sortIdBtn);

        await waitFor(() => {
            expect(companyApi.getAll).toHaveBeenCalled();
        });

        fireEvent.click(sortIdBtn);

        await waitFor(() => {
            expect(companyApi.getAll).toHaveBeenCalled();
        });
    });

    test('closes notification manually', async () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /Thêm doanh nghiệp mới/i }));
        fireEvent.click(screen.getByRole('button', { name: /Tạo mới/i }));

        await waitFor(() => screen.getByText('Vui lòng nhập tên doanh nghiệp!'));

        const notification = screen.getByText('Vui lòng nhập tên doanh nghiệp!').closest('div')?.parentElement;
        const closeBtn = within(notification!).getByRole('button');
        fireEvent.click(closeBtn);

        await waitFor(() => expect(screen.queryByText('Vui lòng nhập tên doanh nghiệp!')).not.toBeInTheDocument());
    });

    test('closes detail modal via X button', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));
        fireEvent.click(screen.getByText('Company A'));
        await waitFor(() => screen.getByText('Thông tin doanh nghiệp'));

        const header = screen.getByText('Thông tin doanh nghiệp').closest('div')?.parentElement;
        const buttons = within(header!).getAllByRole('button');
        const xBtn = buttons.find(b => !b.textContent);
        if (xBtn) fireEvent.click(xBtn);

        await waitFor(() => expect(screen.queryByText('Thông tin doanh nghiệp')).not.toBeInTheDocument());
    });

    test('handles detail image error', async () => {
        (companyApi.getById as jest.Mock).mockResolvedValue(mockCompanies[0]);
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));
        fireEvent.click(screen.getByText('Company A'));
        await waitFor(() => screen.getByText('Thông tin doanh nghiệp'));

        const img = screen.getByAltText('Company A');
        fireEvent.error(img);

        expect(img).toHaveStyle({ display: 'none' });
    });

    test('navigates via numbered pagination button', async () => {
        (companyApi.getAll as jest.Mock).mockResolvedValue({
            content: mockCompanies,
            totalElements: 25,
            totalPages: 2,
            size: 20,
            number: 0
        });
        renderComponent();
        await waitFor(() => screen.getByText('Company A'));

        const page2Btn = screen.getByRole('button', { name: '2' });
        fireEvent.click(page2Btn);

        await waitFor(() => expect(companyApi.getAll).toHaveBeenCalledWith(1, 20));
    });

});
