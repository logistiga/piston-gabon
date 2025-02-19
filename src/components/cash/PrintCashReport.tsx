import React, { useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface PrintCashReportProps {
  date: string;
  stats: {
    totalBalance: number;
    dailyIncome: number;
    dailyExpense: number;
    dailyBankIncome: number;
    dailyBankExpense: number;
    totalBankBalance: number;
  };
  operations: any[];
  onClose: () => void;
}

const PrintCashReport: React.FC<PrintCashReportProps> = ({
  date,
  stats,
  operations,
  onClose
}) => {
  useEffect(() => {
    printReport();
  }, []);

  const printReport = async () => {
    try {
      // Get company settings
      const { data: company } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .single();

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      // Format date
      const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Generate HTML content
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Rapport de Caisse - ${formattedDate}</title>
          <style>
            @page { size: A4; margin: 2cm; }
            body { 
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .company-info {
              font-size: 14px;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
            }
            .summary {
              margin-bottom: 40px;
              border: 1px solid #000;
              padding: 20px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .summary-item {
              margin-bottom: 10px;
            }
            .summary-label {
              font-weight: bold;
            }
            .transactions {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .transactions th, .transactions td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .transactions th {
              background-color: #f3f4f6;
            }
            .amount {
              text-align: right;
            }
            .income {
              color: #059669;
            }
            .expense {
              color: #dc2626;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 10px;
              padding-top: 20px;
              border-top: 1px solid #000;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${company?.name || 'PISTON GABON'}</div>
            <div class="company-info">${company?.address || ''}</div>
            <div class="company-info">Tel: ${company?.phone || ''}</div>
          </div>

          <div class="report-title">
            Rapport de Caisse du ${formattedDate}
          </div>

          <div class="summary">
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Solde de Caisse:</div>
                <div class="${stats.totalBalance >= 0 ? 'income' : 'expense'}">${formatCurrency(stats.totalBalance)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Solde Bancaire:</div>
                <div class="${stats.totalBankBalance >= 0 ? 'income' : 'expense'}">${formatCurrency(stats.totalBankBalance)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Encaissements du Jour:</div>
                <div class="income">${formatCurrency(stats.dailyIncome)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Décaissements du Jour:</div>
                <div class="expense">${formatCurrency(stats.dailyExpense)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Opérations Bancaires Reçues:</div>
                <div class="income">${formatCurrency(stats.dailyBankIncome)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Opérations Bancaires Émises:</div>
                <div class="expense">${formatCurrency(stats.dailyBankExpense)}</div>
              </div>
            </div>
          </div>

          <table class="transactions">
            <thead>
              <tr>
                <th>Heure</th>
                <th>Type</th>
                <th>Description</th>
                <th>Référence</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              ${operations.map(op => `
                <tr>
                  <td>${new Date(op.operation_date).toLocaleTimeString('fr-FR')}</td>
                  <td>${op.operation_type === 'income' ? 'Encaissement' : 'Décaissement'}</td>
                  <td>${op.description || op.reason}</td>
                  <td>${op.reference_or_supplier || ''}</td>
                  <td class="amount ${op.operation_type === 'income' ? 'income' : 'expense'}">
                    ${op.operation_type === 'income' ? '+' : '-'} ${formatCurrency(op.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
            <p>${company?.name || 'PISTON GABON'} - ${company?.address || ''}</p>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => {
                window.close();
                window.opener.postMessage('printComplete', '*');
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();

      // Listen for print complete message
      window.addEventListener('message', (event) => {
        if (event.data === 'printComplete') {
          onClose();
        }
      }, { once: true });

    } catch (err) {
      console.error('Error printing report:', err);
      onClose();
    }
  };

  return null;
};

export default PrintCashReport;