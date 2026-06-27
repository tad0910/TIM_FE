import React from 'react';

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'VND',
  className = ''
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <span className={className}>
      {formatCurrency(amount)}
    </span>
  );
};

export default CurrencyDisplay;
