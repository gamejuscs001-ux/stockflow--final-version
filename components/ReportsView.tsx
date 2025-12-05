import React from 'react';
import { AuditResult } from '../types';
import { CheckCircle2, AlertTriangle, FileSearch, Scale } from 'lucide-react';

interface ReportsViewProps {
  results: AuditResult[] | null;
  onRunAudit: () => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ results, onRunAudit }) => {
  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="bg-indigo-50 p-4 rounded-full mb-4">
          <FileSearch className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Generated</h3>
        <p className="text-gray-500 max-w-md mb-6">
          Import your "System Balance" data to compare it against your current inventory and generate a discrepancy report.
        </p>
        <button
          onClick={onRunAudit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <Scale className="w-4 h-4" />
          Run System Audit
        </button>
      </div>
    );
  }

  const mismatches = results.filter(r => r.status === 'MISMATCH');
  const matches = results.filter(r => r.status === 'MATCH');
  const totalDifference = results.reduce((acc, curr) => acc + curr.difference, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Records Checked</p>
            <p className="text-2xl font-bold text-gray-900">{results.length}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <Scale className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Mismatches Found</p>
            <p className={`text-2xl font-bold ${mismatches.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {mismatches.length}
            </p>
          </div>
          <div className={`p-3 rounded-full ${mismatches.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <AlertTriangle className={`w-6 h-6 ${mismatches.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Net Variance</p>
            <p className={`text-2xl font-bold ${totalDifference !== 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
              {totalDifference > 0 ? '+' : ''}{totalDifference.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-orange-50 rounded-full">
            <Scale className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Discrepancy Details</h3>
          <span className="text-xs text-gray-500">Generated just now</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">App Balance</th>
                <th className="px-6 py-3">System Balance</th>
                <th className="px-6 py-3">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.sort((a,b) => (a.status === 'MISMATCH' ? -1 : 1)).map((res, idx) => (
                <tr key={idx} className={`transition-colors ${res.status === 'MISMATCH' ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-3">
                    {res.status === 'MATCH' ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs px-2 py-1 bg-green-50 border border-green-100 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> MATCH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-medium text-xs px-2 py-1 bg-red-50 border border-red-100 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> MISMATCH
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono font-medium text-gray-700">{res.code}</td>
                  <td className="px-6 py-3 text-gray-500">{res.provider}</td>
                  <td className="px-6 py-3">{res.appBalance.toFixed(2)}</td>
                  <td className="px-6 py-3">{res.systemBalance.toFixed(2)}</td>
                  <td className={`px-6 py-3 font-bold ${res.difference === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                    {res.difference > 0 ? `+${res.difference.toFixed(2)}` : res.difference.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;