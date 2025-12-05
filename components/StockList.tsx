
import React from 'react';
import { StockItem, AccountStatus } from '../types';
import { Trash2, ArrowDownCircle, ArrowUpCircle, Lock, Unlock, ClipboardList } from 'lucide-react';

interface StockListProps {
  items: StockItem[];
  statusMap: Record<string, AccountStatus>;
  onDelete: (id: string) => void;
}

const StockList: React.FC<StockListProps> = ({ items, statusMap, onDelete }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
        <p className="text-gray-400">No records found. Use "Quick Action" in the sidebar to add data.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Code / Status</th>
              <th className="px-6 py-4">Details / Order No</th>
              <th className="px-6 py-4">Phone Number</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const status = statusMap[item.code] || 'CLOSED';
              const isTemp = item.type === 'TEMP_USE';
              
              return (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                   {item.type === 'IN' && (
                     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                       <ArrowDownCircle className="w-3 h-3" /> IN
                     </span>
                   )}
                   {item.type === 'OUT' && (
                     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                       <ArrowUpCircle className="w-3 h-3" /> OUT
                     </span>
                   )}
                   {item.type === 'TEMP_USE' && (
                     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                       <ClipboardList className="w-3 h-3" /> TEMP
                     </span>
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-700">{item.code}</span>
                    {status === 'OPEN' ? (
                      <span title="Account OPEN" className="p-0.5 rounded text-green-600 bg-green-50 border border-green-100">
                        <Unlock className="w-3 h-3" />
                      </span>
                    ) : (
                      <span title="Account CLOSED" className="p-0.5 rounded text-gray-400 bg-gray-50 border border-gray-100">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isTemp ? (
                     <span className="font-mono text-xs font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded">
                       {item.orderNumber || 'No Order #'}
                     </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {item.provider}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-gray-900">{item.phoneNumber}</td>
                <td className={`px-6 py-4 text-right font-medium ${
                    item.type === 'OUT' ? 'text-emerald-600' : 
                    item.type === 'TEMP_USE' ? 'text-amber-600' : 'text-indigo-600'
                }`}>
                  {item.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
        <span>Showing {items.length} records</span>
      </div>
    </div>
  );
};

export default StockList;
