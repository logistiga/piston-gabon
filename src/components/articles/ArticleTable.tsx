import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Article {
  id: string;
  cb: string;
  nom: string;
  prixd: number;
  stock: number;
  quantity: number;
  discount: number;
  discount_type: 'percentage' | 'fixed';
}

interface ArticleTableProps {
  items: Array<Article>;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateDiscount: (id: string, discount: number, discount_type: 'percentage' | 'fixed') => void;
  onRemove: (id: string) => void;
  readonly?: boolean;
}

const ArticleTable: React.FC<ArticleTableProps> = ({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemove,
  readonly = false
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix HT</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remise</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total TTC</th>
            {!readonly && (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => {
            const itemTotal = item.prixd * item.quantity;
            const discount = item.discount_type === 'percentage' 
              ? (itemTotal * item.discount) / 100 
              : item.discount;
            const total = itemTotal - discount;

            return (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">{item.nom}</div>
                  <div className="text-sm text-gray-500">{item.cb}</div>
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  {formatCurrency(item.prixd)}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  {readonly ? (
                    item.quantity
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value, 10))}
                      className="input w-20 text-right"
                    />
                  )}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  {readonly ? (
                    `${item.discount}${item.discount_type === 'percentage' ? '%' : ' FCFA'}`
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={item.discount_type}
                        onChange={(e) => onUpdateDiscount(
                          item.id,
                          item.discount,
                          e.target.value as 'percentage' | 'fixed'
                        )}
                        className="input w-24"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">FCFA</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max={item.discount_type === 'percentage' ? 100 : item.prixd * item.quantity}
                        value={item.discount}
                        onChange={(e) => onUpdateDiscount(
                          item.id,
                          parseFloat(e.target.value) || 0,
                          item.discount_type
                        )}
                        className="input w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap font-medium">
                  {formatCurrency(total)}
                </td>
                {!readonly && (
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ArticleTable;