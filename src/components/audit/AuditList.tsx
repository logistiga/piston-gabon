import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Filter, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../config/supabase';

const ITEMS_PER_PAGE = 20;

const AuditList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ table: '', operation: '', dateStart: '', dateEnd: '' });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadLogs();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filters, currentPage]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('audit_logs_view')
        .select('*', { count: 'exact' })
        .order('operation_date', { ascending: false });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) query = query.eq(key, value);
      });
      
      if (searchTerm) {
        query = query.or(`table_name.ilike.%${searchTerm}%, operation_type.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      setLogs(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => format(new Date(date), 'PPp', { locale: fr });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Journal d'Audit</h1>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Rechercher..."
          className="input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary">
          <Filter className="h-5 w-5 mr-2" /> Filtres
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 grid grid-cols-4 gap-4">
          {['Table', 'Opération', 'Date début', 'Date fin'].map((label, idx) => (
            <div key={idx}>
              <label className="text-sm font-medium">{label}</label>
              <input
                type={idx > 1 ? 'date' : 'text'}
                className="input"
                value={filters[label.toLowerCase()] || ''}
                onChange={(e) => setFilters({ ...filters, [label.toLowerCase()]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              {['Date', 'Utilisateur', 'Table', 'Type', 'IP', 'Source', 'Ordinateur'].map((header) => (
                <th key={header} className="text-left px-4 py-3 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm">{formatDate(log.operation_date)}</td>
                <td className="px-4 py-4 text-sm">{log.user_email || 'Inconnu'}</td>
                <td className="px-4 py-4 text-sm">{log.table_name}</td>
                <td className="px-4 py-4 text-sm">{log.operation_type}</td>
                <td className="px-4 py-4 text-sm">{log.ip_address}</td>
                <td className="px-4 py-4 text-sm">{log.source}</td>
                <td className="px-4 py-4 text-sm">{log.computer_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="btn btn-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>Page {currentPage} / {totalPages}</span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="btn btn-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AuditList;