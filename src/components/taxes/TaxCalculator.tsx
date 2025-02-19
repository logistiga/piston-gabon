import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface Tax {
  name: string;
  rate: number;
  amount: number;
}

interface TaxCalculatorProps {
  subtotal: number;
  taxes: Tax[];
  discountTotal?: number;
}

const TaxCalculator: React.FC<TaxCalculatorProps> = ({ subtotal, taxes, discountTotal = 0 }) => {
  const total = taxes.reduce((sum, tax) => sum + tax.amount, subtotal);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Sous-total HT:</span>
        <span>{formatCurrency(subtotal + discountTotal)}</span>
      </div>

      {discountTotal > 0 && (
        <div className="flex justify-between text-red-600">
          <span>Remise:</span>
          <span>- {formatCurrency(discountTotal)}</span>
        </div>
      )}

      <div className="flex justify-between font-medium">
        <span>Total HT:</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      {taxes.map((tax) => (
        <div key={tax.name} className="flex justify-between">
          <span>{tax.name} ({tax.rate}%):</span>
          <span>{formatCurrency(tax.amount)}</span>
        </div>
      ))}

      <div className="flex justify-between font-bold text-lg pt-2 border-t">
        <span>Total TTC:</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export default TaxCalculator;