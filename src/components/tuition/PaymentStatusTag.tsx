import React from 'react';

interface PaymentStatusTagProps {
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'UPCOMING' | 'DUE_SOON';
  className?: string;
}

export const PaymentStatusTag: React.FC<PaymentStatusTagProps> = ({
  status,
  className = ''
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          text: 'Đã thanh toán',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
        };
      case 'PENDING':
        return {
          text: 'Chờ xử lý',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
        };
      case 'OVERDUE':
        return {
          text: 'Quá hạn',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
        };
      case 'UPCOMING':
        return {
          text: 'Chưa đến ngày',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
        };
      case 'DUE_SOON':
        return {
          text: 'Sắp đến hạn',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
        };
      default:
        return {
          text: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}>
      {config.text}
    </span>
  );
};

export default PaymentStatusTag;
