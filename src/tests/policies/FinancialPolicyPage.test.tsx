import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinancialPolicyPage from '../../pages/admin/FinancialPolicyPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('FinancialPolicyPage', () => {
    const originalOpen = window.open;

    beforeEach(() => {
        jest.clearAllMocks();
        window.open = jest.fn();
    });

    afterEach(() => {
        window.open = originalOpen;
    });

    it('renders correctly with title and description', () => {
        render(
            <BrowserRouter>
                <FinancialPolicyPage />
            </BrowserRouter>
        );

        expect(screen.getByText('Chính sách tài chính')).toBeInTheDocument();
        expect(
            screen.getByText('Quy định và hướng dẫn về học phí, hoàn tiền và các chính sách tài chính khác')
        ).toBeInTheDocument();
    });

    it('displays the iframe with correct title', () => {
        render(
            <BrowserRouter>
                <FinancialPolicyPage />
            </BrowserRouter>
        );

        const iframe = screen.getByTitle('Chính sách tài chính');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src');
    });

    it('navigates back when back button is clicked', () => {
        render(
            <BrowserRouter>
                <FinancialPolicyPage />
            </BrowserRouter>
        );

        const backButton = screen.getByRole('button', { name: /Quay lại/i });
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('opens download link when download button is clicked', () => {
        render(
            <BrowserRouter>
                <FinancialPolicyPage />
            </BrowserRouter>
        );

        const downloadButton = screen.getByRole('button', { name: /Tải xuống/i });
        fireEvent.click(downloadButton);

        expect(window.open).toHaveBeenCalled();
    });
});
