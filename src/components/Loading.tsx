import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  );
};

export default Loading;