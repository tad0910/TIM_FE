import { render, screen } from '@testing-library/react';
import PaymentStatusTag from '../../components/tuition/PaymentStatusTag';

describe('PaymentStatusTag', () => {
  it('hiển thị Đã thanh toán khi status = PAID', () => {
    render(<PaymentStatusTag status="PAID" />);
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
  });

  it('hiển thị Chờ xử lý khi status = PENDING', () => {
    render(<PaymentStatusTag status="PENDING" />);
    expect(screen.getByText('Chờ xử lý')).toBeInTheDocument();
  });

  it('hiển thị Quá hạn khi status = OVERDUE', () => {
    render(<PaymentStatusTag status="OVERDUE" />);
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();
  });

  it('hiển thị Chưa đến ngày khi status = UPCOMING', () => {
    render(<PaymentStatusTag status="UPCOMING" />);
    expect(screen.getByText('Chưa đến ngày')).toBeInTheDocument();
  });
});
