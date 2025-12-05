
import React, { useState } from 'react';
import { PenTool, Save, AlertCircle } from 'lucide-react';

interface TransactionFormProps {
  availableCodes: string[];
  onSubmit: (data: { date: string; code: string; orderNumber: string; amount: number }) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ availableCodes, onSubmit }) => {
  const [code, setCode] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedCode = code.trim().toUpperCase();

    if (!formattedCode || !orderNumber || !amount) {
      setError("All fields are required.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    onSubmit({
      date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      code: formattedCode,
      orderNumber,
      amount: numAmount
    });

    // Reset form mostly, keep date
    setOrderNumber('');
    setAmount('');
    setCode('');
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-sm";

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          Transaction Record
        </h2>
        <p className="text-amber-100 text-sm mt-1">
          Record pending orders here. Deducts from physical balance only.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Account Code
          </label>
          <div className="relative">
            <input
              list="account-options"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Type or select account (e.g. C130)"
              className={inputClasses}
            />
            <datalist id="account-options">
              {availableCodes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <p className="text-xs text-gray-500 mt-1">Type to filter. New codes are accepted.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Order Number
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. ORD-9923"
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Cost Amount
          </label>
          <div className="relative">
             <span className="absolute left-4 top-3.5 text-gray-500 font-medium">$</span>
             <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputClasses} pl-8`}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black transition-colors shadow-lg shadow-gray-200"
        >
          <Save className="w-4 h-4" />
          Save Record
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
