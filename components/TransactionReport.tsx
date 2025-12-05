
import React, { useMemo } from 'react';
import { StockItem, User } from '../types';
import { ClipboardList, TrendingDown, Trash2 } from 'lucide-react';

interface TransactionReportProps {
  items: StockItem[];
  currentUser: User;
  onDelete: (id: string) => void;
}

const TransactionReport: React.FC<TransactionReportProps> = ({ items, currentUser, onDelete }) => {
  const tempItems = useMemo(() => items.filter(i => i.type === 'TEMP_USE'), [items]);
  
  // Calculate balances
  const calculatedTransactions = useMemo(() => {
    // 1. Group all items by code
    const grouped: Record<string, StockItem[]> = {};
    items.forEach(i => {
      if (!grouped[i.code]) grouped[i.code] = [];
      grouped[i.code].push(i);
    });

    const results: any[] = [];

    // 2. Iterate through each account to calculate running balance
    Object.keys(grouped).forEach(code => {
      // Sort chronologically
      const sorted = grouped[code].sort((a, b) => a.createdAt - b.createdAt);
      
      let currentBalance = 0;

      sorted.forEach(item => {
        if (item.type === 'IN') {
          currentBalance += item.amount;
        } else if (item.type === 'OUT') {
          currentBalance -= item.amount;
        } else if (item.type === 'TEMP_USE') {
          // For temp use, capture the state
          const balanceBefore = currentBalance;
          currentBalance -= item.amount; // deduct cost
          const balanceAfter = currentBalance;

          results.push({
            id: item.id,
            date: item.date,
            orderNumber: item.orderNumber || 'N/A',
            code: item.code,
            amount: item.amount,
            balanceBefore,
            balanceAfter,
            createdAt: item.createdAt,
            createdBy: item.createdBy || 'System'
          });
        }
      });
    });

    // Sort by most recent for display
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }, [items]);

  const totalUsage = tempItems.reduce((acc, curr) => acc + curr.amount, 0);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const canDelete = (itemCreator: string) => {
      if (currentUser.role === 'admin') return true;
      return itemCreator === currentUser.username;
  };

  if (tempItems.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
         <div className="bg-amber-50 p-4 rounded-full inline-block mb-4">
             <ClipboardList className="w-8 h-8 text-amber-500" />
         </div>
         <h3 className="text-lg font-semibold text-gray-900">No Transactions Recorded</h3>
         <p className="text-gray-400 mt-1">Use "Transaction Record" to add pending orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-500">Total Pending Cost</p>
             <p className="text-2xl font-bold text-amber-600">${totalUsage.toFixed(2)}</p>
           </div>
           <div className="p-3 bg-amber-50 rounded-full">
             <TrendingDown className="w-6 h-6 text-amber-600" />
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-500">Transactions Recorded</p>
             <p className="text-2xl font-bold text-gray-900">{calculatedTransactions.length}</p>
           </div>
           <div className="p-3 bg-gray-100 rounded-full">
             <ClipboardList className="w-6 h-6 text-gray-600" />
           </div>
        </div>
      </div>

      {/* Detailed Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-3">Date / Time</th>
                <th className="px-6 py-3">Created By</th>
                <th className="px-6 py-3">Order Number</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3 text-right text-gray-400">Opening Balance</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3 text-right text-gray-800">Balance Left</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calculatedTransactions.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                        <span>{item.date}</span>
                        <span className="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-medium text-indigo-600">{item.createdBy}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{item.orderNumber}</td>
                  <td className="px-6 py-3 font-mono text-gray-600 font-medium">{item.code}</td>
                  
                  {/* Opening Balance */}
                  <td className="px-6 py-3 text-right font-mono text-gray-400">
                    {item.balanceBefore.toFixed(2)}
                  </td>

                  {/* Cost */}
                  <td className="px-6 py-3 text-right text-amber-600 font-bold">
                    - {item.amount.toFixed(2)}
                  </td>

                  {/* Balance Left */}
                  <td className={`px-6 py-3 text-right font-mono font-medium ${item.balanceAfter < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {item.balanceAfter.toFixed(2)}
                  </td>

                  <td className="px-6 py-3 text-center">
                    {canDelete(item.createdBy) && (
                        <button 
                            onClick={() => {
                                if(window.confirm("Delete this transaction?")) onDelete(item.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete Transaction"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
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

export default TransactionReport;
