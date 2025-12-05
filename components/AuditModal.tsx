import React from 'react';
import { AuditResult } from '../types';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AuditResult[];
}

const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, results }) => {
  if (!isOpen) return null;

  const mismatches = results.filter(r => r.status === 'MISMATCH');
  const matches = results.filter(r => r.status === 'MATCH');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Audit Report
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 bg-orange-50 border-b border-orange-100">
           <div className="flex gap-6 text-sm">
             <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">Total Checked:</span> {results.length}
             </div>
             <div className="flex items-center gap-2 text-red-600">
                <span className="font-bold">Mismatches:</span> {mismatches.length}
             </div>
             <div className="flex items-center gap-2 text-green-600">
                <span className="font-bold">Matched:</span> {matches.length}
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">App Balance</th>
                <th className="px-4 py-2">System Balance</th>
                <th className="px-4 py-2">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.sort((a,b) => (a.status === 'MISMATCH' ? -1 : 1)).map((res, idx) => (
                <tr key={idx} className={res.status === 'MISMATCH' ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-2">
                    {res.status === 'MATCH' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs px-2 py-1 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> MATCH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs px-2 py-1 bg-red-100 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> DIFF
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono font-medium">{res.code}</td>
                  <td className="px-4 py-2">{res.appBalance.toFixed(2)}</td>
                  <td className="px-4 py-2">{res.systemBalance.toFixed(2)}</td>
                  <td className={`px-4 py-2 font-bold ${res.difference === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                    {res.difference > 0 ? `+${res.difference.toFixed(2)}` : res.difference.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditModal;
