import React from 'react';
import { Printer } from 'lucide-react';

interface PrintDialogProps {
  ticketId: string;
  onClose: () => void;
  onPrint: (format: 'detailed' | 'pos') => void;
}

const PrintDialog: React.FC<PrintDialogProps> = ({ ticketId, onClose, onPrint }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Imprimer le ticket ?</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => onPrint('detailed')}
            className="btn bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 p-4 h-auto flex flex-col items-center"
          >
            <Printer className="h-8 w-8 mb-2" />
            <span>Format A4</span>
          </button>

          <button
            onClick={() => onPrint('pos')}
            className="btn bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 p-4 h-auto flex flex-col items-center"
          >
            <Printer className="h-8 w-8 mb-2" />
            <span>Format Ticket</span>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Ne pas imprimer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintDialog;