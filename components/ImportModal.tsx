
import React, { useState } from 'react';
import { parseStockDataWithGemini } from '../services/geminiService';
import { StockItem, ImportMode } from '../types';
import { Loader2, Wand2, ClipboardPaste, X, ArrowDownToLine, ArrowRightLeft, Scale } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Omit<StockItem, 'id' | 'createdAt' | 'type'>[], mode: ImportMode) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>('ADD_STOCK');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const formatDateForDisplay = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  };

  const processParsedData = (data: any[]) => {
    // Post-processing to ensure dates exist and formatting is consistent
    return data.map(item => ({
      ...item,
      code: item.code.replace(/-$/, '').trim(), // Remove trailing hyphen if parsed that way
      date: item.date || formatDateForDisplay(selectedDate),
      amount: item.amount === null || isNaN(item.amount) ? 0 : item.amount
    }));
  };

  const handleManualParse = () => {
    setError(null);
    try {
      const lines = inputText.trim().split('\n');
      const parsed = lines.map(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return null;

        // Mode: Audit / System Check (Format: "1. C101- Name ... Amount")
        if (mode === 'AUDIT_SYSTEM') {
           const parts = cleanLine.split(/\s+/);
           
           if (parts.length < 3) return null;

           let code = parts[1].replace('-', '').trim();
           const lastPart = parts[parts.length - 1];
           const amount = parseFloat(lastPart.replace(/,/g, ''));
           
           // If code is empty (maybe space between C315 and -), try to merge
           if (!code && parts.length > 2) code = parts[2];

           const provider = parts.length > 4 ? parts[3] : 'System';
           const phone = parts.length > 4 ? parts[2] : (parts[2] || '');

           if (isNaN(amount)) return null;

           return {
             date: formatDateForDisplay(selectedDate),
             code,
             provider,
             phoneNumber: phone,
             amount
           };
        }

        // Mode: Usage/Ending Balance (Expect 4 parts: Code, Provider, Phone, Amount)
        else if (mode === 'CALCULATE_USAGE') {
           const parts = cleanLine.split(/\s+/);
           const code = parts[0];
           const provider = parts[1];
           const phone = parts[2];
           let amount = 0;
           
           if (parts.length >= 4) {
             const val = parseFloat(parts[parts.length - 1]);
             if (!isNaN(val)) amount = val;
           }

           if (!code || !provider) return null;

           return {
             date: formatDateForDisplay(selectedDate),
             code,
             provider,
             phoneNumber: phone,
             amount
           };
        } 
        
        // Mode: Stock IN (Expect 5 parts: Date, Code, Provider, Phone, Amount)
        else {
          const parts = cleanLine.split(/\s+/);
          if (parts.length < 5) return null;
          return {
            date: parts[0],
            code: parts[1],
            provider: parts[2],
            phoneNumber: parts[3],
            amount: parseFloat(parts[4])
          };
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      if (parsed.length === 0) {
        setError("Could not parse text. Please check the format or use Smart Import.");
        return;
      }
      onImport(parsed, mode);
      onClose();
      setInputText('');
    } catch (e) {
      setError("Error parsing text manually.");
    }
  };

  const handleSmartParse = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const rawResult = await parseStockDataWithGemini(inputText);
      const processedResult = processParsedData(rawResult);
      onImport(processedResult, mode);
      onClose();
      setInputText('');
    } catch (err) {
      setError("AI Parsing failed. Please check your API key or input format.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-indigo-600" />
              Import Data
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setMode('ADD_STOCK')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'ADD_STOCK' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Stock IN
            </button>
            <button
              onClick={() => setMode('CALCULATE_USAGE')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'CALCULATE_USAGE' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              End Balance
            </button>
            <button
              onClick={() => setMode('AUDIT_SYSTEM')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'AUDIT_SYSTEM' 
                  ? 'bg-white text-orange-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              System Audit
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <p className="text-sm text-gray-600">
              {mode === 'ADD_STOCK' && "Paste new stock records to add to inventory."}
              {mode === 'CALCULATE_USAGE' && "Paste ending balances to calculate confirmed usage."}
              {mode === 'AUDIT_SYSTEM' && "Paste System Balance report to find mismatches."}
            </p>
            <div className="flex items-center gap-2">
                 <label className="text-xs font-semibold text-gray-500 uppercase">Date:</label>
                 <input 
                   type="date" 
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                 />
            </div>
          </div>

          <textarea
            className={`w-full h-64 p-4 border rounded-lg focus:ring-2 font-mono text-xs sm:text-sm resize-none transition-colors ${
              mode === 'ADD_STOCK' 
                ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                : mode === 'CALCULATE_USAGE'
                ? 'border-emerald-200 bg-emerald-50/30 focus:ring-emerald-500 focus:border-emerald-500'
                : 'border-orange-200 bg-orange-50/30 focus:ring-orange-500 focus:border-orange-500'
            }`}
            placeholder={
              mode === 'ADD_STOCK' 
                ? `30-Nov-2025\tC105\tCelcom\t0138456954\t776.30`
                : mode === 'CALCULATE_USAGE'
                ? `C105\tCelcom\t0138456954\t50.22`
                : `1. R101- Temp01 20,000.00\n2. C315- 01119938648 Celcom 942.38`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          
          <div className="mt-2 text-xs text-gray-400">
            {mode === 'ADD_STOCK' && "Format: Date | Code | Provider | Phone | Amount"}
            {mode === 'CALCULATE_USAGE' && "Format: Code | Provider | Phone | Ending Balance"}
            {mode === 'AUDIT_SYSTEM' && "Format: Index. Code- Phone Provider Amount"}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end bg-gray-50">
          <button
            onClick={handleManualParse}
            disabled={!inputText || isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 disabled:opacity-50 transition"
          >
            Standard Import
          </button>
          
            <button
              onClick={handleSmartParse}
              disabled={!inputText || isProcessing}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 transition shadow-md ${
                mode === 'ADD_STOCK' 
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:ring-indigo-500'
                  : mode === 'CALCULATE_USAGE'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 focus:ring-orange-500'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  AI Smart Import
                </>
              )}
            </button>
          
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
