import React from 'react';
import { Printer } from 'lucide-react';
import { supabase } from '../../config/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PrintButtonProps {
  ticketId: string;
  format?: 'detailed' | 'pos';
  onError?: (error: Error) => void;
  onPrint?: () => void;
  className?: string;
  children?: React.ReactNode;
  'data-format'?: string;
}

const PrintButton: React.FC<PrintButtonProps> = ({ 
  ticketId, 
  format = 'detailed', 
  onError,
  onPrint,
  className = '',
  children,
  'data-format': dataFormat,
  ...props
}) => {
  const handlePrint = async () => {
    try {
      // Get ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_items (
            id,
            quantity,
            unit_price,
            discount,
            discount_type,
            article:articles!inner(
              id,
              cb,
              nom
            )
          )
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Get company settings
      const { data: company, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (companyError) throw companyError;

      // Calculate totals
      const subTotal = ticket.ticket_items.reduce((sum: number, item: any) => {
        const itemTotal = item.unit_price * item.quantity;
        const discount = item.discount_type === 'percentage' 
          ? (itemTotal * (item.discount || 0)) / 100
          : (item.discount || 0);
        return sum + (itemTotal - discount);
      }, 0);

      // Create PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: format === 'pos' ? [80, 297] : 'a4'
      });

      // Set font
      doc.setFont('helvetica');
      doc.setFontSize(format === 'pos' ? 10 : 12);

      // Add header
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 10;

      // Add logo if exists
      if (company.logo_url) {
        const img = new Image();
        img.src = company.logo_url;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        // Calculate logo dimensions to fit width while maintaining aspect ratio
        const maxWidth = format === 'pos' ? 40 : 60;
        const ratio = img.width / img.height;
        const width = Math.min(maxWidth, pageWidth - 20);
        const height = width / ratio;

        doc.addImage(img, 'JPEG', (pageWidth - width) / 2, yPos, width, height);
        yPos += height + 5;
      }

      // Company name
      doc.setFontSize(format === 'pos' ? 12 : 16);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      // Company info
      doc.setFontSize(format === 'pos' ? 8 : 10);
      doc.setFont('helvetica', 'normal');
      doc.text(company.address, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.text(`Tel: ${company.phone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Ticket info
      doc.setFontSize(format === 'pos' ? 10 : 12);
      doc.text(`Reçu de Ventes`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.text(new Date().toLocaleString('fr-FR'), pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Client info
      doc.setFontSize(format === 'pos' ? 8 : 10);
      doc.text(`Client: ${ticket.client_nom || 'Client Comptant'}`, 10, yPos);
      yPos += 4;
      doc.text(`ID Vente: ${ticket.reference}`, 10, yPos);
      yPos += 8;

      // Items table
      const tableColumns = format === 'pos' 
        ? [
            { header: 'Article', dataKey: 'nom' },
            { header: 'Qté', dataKey: 'quantity' },
            { header: 'Total', dataKey: 'total' }
          ]
        : [
            { header: 'Article', dataKey: 'nom' },
            { header: 'Qté', dataKey: 'quantity' },
            { header: 'P.U', dataKey: 'unit_price' },
            { header: 'Remise', dataKey: 'discount' },
            { header: 'Total', dataKey: 'total' }
          ];

      const tableData = ticket.ticket_items.map((item: any) => {
        const itemTotal = item.unit_price * item.quantity;
        const discount = item.discount_type === 'percentage'
          ? (itemTotal * (item.discount || 0)) / 100
          : (item.discount || 0);
        const total = itemTotal - discount;

        return {
          nom: item.article.nom,
          quantity: item.quantity,
          unit_price: item.unit_price.toLocaleString('fr-FR'),
          discount: item.discount ? `${item.discount}${item.discount_type === 'percentage' ? '%' : ' FCFA'}` : '-',
          total: total.toLocaleString('fr-FR')
        };
      });

      // @ts-ignore
      doc.autoTable({
        columns: tableColumns,
        body: tableData,
        startY: yPos,
        styles: {
          fontSize: format === 'pos' ? 8 : 10,
          cellPadding: format === 'pos' ? 1 : 2
        },
        theme: 'grid'
      });

      // Get the last Y position after the table
      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 10;

      // Add totals
      doc.text(`Total HT: ${subTotal.toLocaleString('fr-FR')} XAF`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 4;
      doc.text(`CSS 1%: ${(subTotal * 0.01).toLocaleString('fr-FR')} XAF`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 4;
      doc.text(`TVA 18%: ${(subTotal * 0.18).toLocaleString('fr-FR')} XAF`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 4;
      doc.text(`Total Remis: ${(subTotal * 0.19).toLocaleString('fr-FR')} XAF`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 6;

      // Total TTC
      doc.setFontSize(format === 'pos' ? 10 : 12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total TTC: ${ticket.montant.toLocaleString('fr-FR')} XAF`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 10;

      // Footer
      doc.setFontSize(format === 'pos' ? 6 : 8);
      doc.setFont('helvetica', 'normal');
      doc.text('Politique de retour', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;

      const splitReturn = doc.splitTextToSize(company.return_policy, pageWidth - 20);
      doc.text(splitReturn, pageWidth / 2, yPos, { align: 'center' });

      // Save the PDF
      doc.save(`ticket_${ticket.reference}.pdf`);

      // Notify completion
      onPrint?.();

    } catch (err) {
      console.error('Error printing:', err);
      onError?.(err as Error);
    }
  };

  return (
    <button
      onClick={handlePrint}
      className={`btn bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 ${className}`}
      title={format === 'pos' ? 'Format Ticket' : 'Format A4'}
      data-format={dataFormat}
      {...props}
    >
      {children || (
        <>
          <Printer className="h-5 w-5 mr-2" />
          {format === 'pos' ? 'Format Ticket' : 'Format A4'}
        </>
      )}
    </button>
  );
};

export default PrintButton;