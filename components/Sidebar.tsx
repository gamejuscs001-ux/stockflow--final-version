
import React, { useRef } from 'react';
import { LayoutGrid, List, FileText, Plus, Database, PenTool, ClipboardList, Download, UploadCloud, Trash2, CalendarClock, StickyNote, LogOut, Users } from 'lucide-react';
import { ViewType, User } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onImportClick: () => void;
  onExport: () => void;
  onRestore: (file: File) => void;
  onReset: () => void;
  onLogout: () => void;
  currentUser: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onImportClick, onExport, onRestore, onReset, onLogout, currentUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems: { id: ViewType; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'list', label: 'Inventory List', icon: List },
    { id: 'reports', label: 'Audit Reports', icon: FileText },
    { id: 'transaction_entry', label: 'Transaction Record', icon: PenTool },
    { id: 'transaction_report', label: 'Transaction Report', icon: ClipboardList },
    { id: 'schedule', label: 'Staff Schedule', icon: CalendarClock },
    { id: 'notes', label: 'Team Notes', icon: StickyNote },
    { id: 'users', label: 'Manage Users', icon: Users, adminOnly: true },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onRestore(file);
    }
    // Reset input so the same file can be selected again if needed
    if (event.target) event.target.value = '';
  };

  // Permission Checker
  const canAccess = (itemId: ViewType, adminOnly?: boolean) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; // Admin accesses everything
    if (adminOnly) return false; // Non-admin cannot access adminOnly items
    return currentUser.permissions?.includes(itemId) || false; // Check explicit permissions
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex h-full shrink-0">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <Database className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
          StockFlow
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <button
          onClick={onImportClick}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all shadow-sm hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 mb-6"
        >
          <Plus className="w-4 h-4" />
          Quick Action
        </button>

        <nav className="space-y-1 mb-8">
          {navItems.map((item) => {
            if (!canAccess(item.id, item.adminOnly)) return null;

            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Data Management Section */}
        {currentUser?.role === 'admin' && (
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              System Admin
            </h3>
            <div className="space-y-1">
              <button
                onClick={onExport}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Download className="w-4 h-4 text-gray-400" />
                Backup Data
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-gray-400" />
                Restore Data
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange}
              />
              
              {/* Reset Button */}
              <button
                onClick={onReset}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors mt-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset System
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="mb-3 px-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 truncate">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
            </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
