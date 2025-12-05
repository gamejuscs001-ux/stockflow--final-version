
import React, { useState, useEffect, useMemo } from 'react';
import { StockItem, ImportMode, AuditResult, AccountStatus, ViewType, Employee, DaySchedule, Note, User } from './types';
import Dashboard from './components/Dashboard';
import StockList from './components/StockList';
import ImportModal from './components/ImportModal';
import Sidebar from './components/Sidebar';
import ReportsView from './components/ReportsView';
import TransactionForm from './components/TransactionForm';
import TransactionReport from './components/TransactionReport';
import ScheduleView from './components/ScheduleView';
import NotesView from './components/NotesView';
import LoginScreen from './components/LoginScreen';
import UserManagement from './components/UserManagement';
import Toast from './components/Toast';
import { generateDataInsights } from './services/geminiService';
import { db } from './services/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Sparkles, Menu, Database } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const AUTH_SESSION_KEY = 'stockflow_auth_user'; // Keep session local for now

const App: React.FC = () => {
  // Auth State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Data State
  const [items, setItems] = useState<StockItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // UI State
  const [view, setView] = useState<ViewType>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditResult[] | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // --- FIREBASE SUBSCRIPTIONS ---

  // Helper to create admin if DB is empty
  const createDefaultAdmin = async () => {
      // Double check before writing to avoid loops
      const snapshot = await getDocs(collection(db, 'users'));
      if (!snapshot.empty) return;

      const defaultAdmin: User = {
        id: uuidv4(),
        username: 'gjweng',
        password: '123456@abc',
        name: 'Gjweng',
        role: 'admin'
      };
      await setDoc(doc(db, 'users', defaultAdmin.id), defaultAdmin);
      console.log("Default admin created");
  };

  // Helper to create default employees if DB is empty
  const createDefaultEmployees = async () => {
    const snapshot = await getDocs(collection(db, 'employees'));
    if (!snapshot.empty) return;

    const defaultStaffNames = [
      "Weng GPC 0012",
      "Ailsa GPC 0081",
      "Teong GPC 0082",
      "Brooke GPC",
      "Eunice GPC 0087",
      "Valerie GPC 0041",
      "Gemini GPC 0043"
    ];

    const batch = writeBatch(db);
    defaultStaffNames.forEach(name => {
      const id = uuidv4();
      const emp: Employee = {
        id, 
        name, 
        primaryShift: 'Noon 2', // Defaulting to Noon 2 as per request history, editable later
        requests: []
      };
      batch.set(doc(db, 'employees', id), emp);
    });
    
    await batch.commit();
    console.log("Default employees created");
  };

  useEffect(() => {
    // 1. Subscribe to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => doc.data() as User);
      setUsers(userList);
      
      // If empty, create admin immediately
      if (snapshot.empty) {
         createDefaultAdmin();
      }
    });

    // 2. Subscribe to Inventory
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const itemList = snapshot.docs.map(doc => doc.data() as StockItem);
      setItems(itemList);
    });

    // 3. Subscribe to Employees
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const empList = snapshot.docs.map(doc => doc.data() as Employee);
      // Sort to keep UI consistent, or rely on names
      setEmployees(empList.sort((a,b) => a.name.localeCompare(b.name)));
      
      if (snapshot.empty) {
        createDefaultEmployees();
      }
    });

    // 4. Subscribe to Schedule
    const unsubSchedule = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      const schList = snapshot.docs.map(doc => doc.data() as DaySchedule);
      setSchedule(schList);
    });

    // 5. Subscribe to Notes
    const unsubNotes = onSnapshot(collection(db, 'notes'), (snapshot) => {
      const noteList = snapshot.docs.map(doc => doc.data() as Note);
      setNotes(noteList.sort((a,b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubUsers();
      unsubInventory();
      unsubEmployees();
      unsubSchedule();
      unsubNotes();
    };
  }, []);

  // --- AUTH LOGIC ---

  // Restore session
  useEffect(() => {
    const restoreSession = async () => {
       // Wait slightly for users to load from DB
       if (users.length > 0) {
         const sessionUserId = sessionStorage.getItem(AUTH_SESSION_KEY);
         if (sessionUserId) {
           const found = users.find(u => u.id === sessionUserId);
           if (found) setCurrentUser(found);
         }
         setAuthLoading(false);
       } else {
         // If no users exist yet (fresh DB), wait a bit then finish loading
         setTimeout(() => setAuthLoading(false), 2000);
       }
    };
    restoreSession();
  }, [users]);

  // Security Check: Enforce permissions when view changes or user changes
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && view !== 'dashboard') {
        const allowed = currentUser.permissions || [];
        if (!allowed.includes(view)) {
            setView('dashboard');
            setNotification("Access Denied: You do not have permission for that page.");
        }
    }
  }, [view, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setView('dashboard');
  };

  // --- DATA ACTIONS (WRITES) ---

  // Inventory
  const handleTransactionSubmit = async (data: { date: string; code: string; orderNumber: string; amount: number }) => {
    const newItem: StockItem = {
        id: uuidv4(),
        date: data.date,
        code: data.code,
        provider: 'Temp Use',
        phoneNumber: '', 
        orderNumber: data.orderNumber,
        amount: data.amount,
        type: 'TEMP_USE',
        createdAt: Date.now(),
        createdBy: currentUser?.username || 'Unknown' // Track creator
    };
    
    await setDoc(doc(db, 'inventory', newItem.id), newItem);
    setNotification("Transaction saved to Cloud!");
  };

  const handleImport = async (importedItems: Omit<StockItem, 'id' | 'createdAt' | 'type'>[], mode: ImportMode) => {
    const timestamp = Date.now();
    const batch = writeBatch(db);
    let count = 0;
    
    // For Audit Mode, we don't save to DB, just show report
    if (mode === 'AUDIT_SYSTEM') {
        const officialInventoryMap = new Map<string, number>();
        items.forEach(item => {
          const currentOfficial = officialInventoryMap.get(item.code) || 0;
          if (item.type === 'IN') officialInventoryMap.set(item.code, currentOfficial + item.amount);
          else if (item.type === 'OUT') officialInventoryMap.set(item.code, currentOfficial - item.amount);
        });

        const results: AuditResult[] = importedItems.map(item => {
          const appBalance = officialInventoryMap.get(item.code) || 0;
          const diff = appBalance - item.amount;
          return {
            code: item.code,
            provider: item.provider,
            phoneNumber: item.phoneNumber,
            appBalance,
            systemBalance: item.amount,
            difference: diff,
            status: Math.abs(diff) < 0.05 ? 'MATCH' : 'MISMATCH'
          };
        });
        setAuditResults(results);
        setView('reports'); 
        setInsights(null);
        setNotification("Audit generated (not saved to DB).");
        return; 
    }

    // Logic for ADD_STOCK or CALCULATE_USAGE
    
    const officialInventoryMap = new Map<string, number>();
    items.forEach(item => {
      const currentOfficial = officialInventoryMap.get(item.code) || 0;
      if (item.type === 'IN') officialInventoryMap.set(item.code, currentOfficial + item.amount);
      else if (item.type === 'OUT') officialInventoryMap.set(item.code, currentOfficial - item.amount);
    });

    importedItems.forEach(item => {
       const newId = uuidv4();
       
       if (mode === 'ADD_STOCK') {
          const currentStatus = accountStatusMap[item.code] || 'CLOSED';
          if (currentStatus === 'CLOSED') {
             const newItem: StockItem = { ...item, id: newId, createdAt: timestamp, type: 'IN' };
             batch.set(doc(db, 'inventory', newId), newItem);
             count++;
          }
       } else if (mode === 'CALCULATE_USAGE') {
          const currentStatus = accountStatusMap[item.code] || 'CLOSED';
          if (currentStatus === 'OPEN') {
              const currentBalance = officialInventoryMap.get(item.code) || 0;
              const diff = currentBalance - item.amount;
              if (Math.abs(diff) > 0.01) {
                  const type = diff > 0 ? 'OUT' : 'IN';
                  const newItem: StockItem = {
                      ...item, id: newId, createdAt: timestamp, 
                      amount: parseFloat(Math.abs(diff).toFixed(2)),
                      type 
                  };
                  batch.set(doc(db, 'inventory', newId), newItem);
                  count++;
              }
          }
       }
    });

    if (count > 0) {
        await batch.commit();
        setNotification(`Synced ${count} records to Cloud.`);
        if (view === 'reports') setView('list');
    } else {
        setNotification("No new records to sync.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteDoc(doc(db, 'inventory', id));
    setNotification("Record deleted from Cloud.");
  };

  // Employees
  const handleAddEmployee = async (emp: Employee) => {
      await setDoc(doc(db, 'employees', emp.id), emp);
  };
  const handleUpdateEmployee = async (emp: Employee) => {
      await setDoc(doc(db, 'employees', emp.id), emp);
  };
  const handleDeleteEmployee = async (id: string) => {
      await deleteDoc(doc(db, 'employees', id));
  };

  // Schedule
  const handleUpdateScheduleDay = async (daySchedule: DaySchedule) => {
      // Use the date string as ID for easier lookups
      await setDoc(doc(db, 'schedule', daySchedule.day), daySchedule);
  };
  
  // Notes
  const handleAddNote = async (note: Note) => {
      await setDoc(doc(db, 'notes', note.id), note);
  };
  const handleDeleteNote = async (id: string) => {
      await deleteDoc(doc(db, 'notes', id));
  };

  // Users
  const handleAddUser = async (user: User) => {
      await setDoc(doc(db, 'users', user.id), user);
  };
  const handleDeleteUser = async (id: string) => {
      await deleteDoc(doc(db, 'users', id));
  };


  // --- HELPERS ---

  const handleGenerateInsights = async () => {
    if (items.length === 0) return;
    setLoadingInsights(true);
    const result = await generateDataInsights(items);
    setInsights(result);
    setLoadingInsights(false);
  };

  const handleExportData = () => {
    const exportData = { items, employees, schedule, notes, users };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StockFlow_CloudBackup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification("Cloud data backed up.");
  };

  const handleRestoreData = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (window.confirm("Restore will OVERWRITE Cloud data. Proceed?")) {
            setNotification("Restoring... Do not close.");
            
            // Helper to batch upload
            const uploadCollection = async (collName: string, data: any[]) => {
                if (!data || data.length === 0) return;
                const batch = writeBatch(db);
                let opCount = 0;
                for (const item of data) {
                    batch.set(doc(db, collName, item.id || item.day), item);
                    opCount++;
                    if (opCount >= 450) { // Firestore batch limit 500
                        await batch.commit();
                        opCount = 0;
                    }
                }
                if (opCount > 0) await batch.commit();
            };

            await uploadCollection('inventory', parsed.items);
            await uploadCollection('employees', parsed.employees);
            await uploadCollection('schedule', parsed.schedule);
            await uploadCollection('notes', parsed.notes);
            if (parsed.users) await uploadCollection('users', parsed.users);

            setNotification("Restore Complete! Data is live.");
            setView('dashboard');
        }
      } catch (err) {
        alert("Error restoring file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (window.confirm("DANGER: This will WIPE ALL DATA from the Cloud Database.\n\nAre you sure?")) {
        // We can't delete collections easily from client, have to delete docs one by one
        const clearColl = async (collName: string) => {
            const snap = await getDocs(collection(db, collName));
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        };

        await clearColl('inventory');
        await clearColl('schedule');
        await clearColl('notes');
        // Do NOT clear users or employees generally, but user asked for reset
        await clearColl('employees');
        
        setNotification("Cloud database cleared (Users preserved).");
        setView('dashboard');
    }
  };

  // Status Computation
  const { accountStatusMap, uniqueCodes } = useMemo(() => {
    const map: Record<string, AccountStatus> = {};
    const transactionsByCode: Record<string, StockItem[]> = {};
    const codes = new Set<string>();
    items.forEach(item => {
      codes.add(item.code);
      if (!transactionsByCode[item.code]) transactionsByCode[item.code] = [];
      transactionsByCode[item.code].push(item);
    });
    Object.keys(transactionsByCode).forEach(code => {
      const txs = transactionsByCode[code].sort((a, b) => a.createdAt - b.createdAt);
      const lastTx = txs[txs.length - 1];
      if (lastTx.type === 'IN' || lastTx.type === 'TEMP_USE') map[code] = 'OPEN';
      else map[code] = 'CLOSED';
    });
    return { accountStatusMap: map, uniqueCodes: Array.from(codes).sort() };
  }, [items]);

  const getPageTitle = () => {
    switch (view) {
      case 'dashboard': return 'Dashboard Overview';
      case 'list': return 'Inventory Records';
      case 'reports': return 'Audit Reports';
      case 'transaction_entry': return 'Record Transaction';
      case 'transaction_report': return 'Transaction Report';
      case 'schedule': return 'Staff Schedule & Roster';
      case 'notes': return 'Team Notes';
      case 'users': return 'User Management';
      default: return 'StockFlow';
    }
  };

  // Loading Screen
  if (authLoading) {
     return <div className="h-screen flex items-center justify-center bg-slate-900 text-white flex-col gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse">Connecting to Cloud Database...</p>
     </div>;
  }

  // Login Screen
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Toast message={notification} onClose={() => setNotification(null)} />
      
      <Sidebar 
        currentView={view} 
        onChangeView={setView} 
        onImportClick={() => setIsImportModalOpen(true)} 
        onExport={handleExportData}
        onRestore={handleRestoreData}
        onReset={handleResetData}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">StockFlow Cloud</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 p-4 absolute top-16 left-0 right-0 z-40 shadow-lg">
            <div className="space-y-2">
              <button onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50">Dashboard</button>
              <button onClick={() => { setView('list'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50">Inventory</button>
              <button onClick={() => { setView('schedule'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50">Staff Schedule</button>
              <button onClick={() => { setView('notes'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50">Team Notes</button>
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg text-red-600">Logout</button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
            <div className="shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
              <p className="text-sm text-gray-500 mt-1">Live Database Connection Active</p>
            </div>

            {(view === 'dashboard' || view === 'list') && items.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm relative overflow-hidden group shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Sparkles className="w-24 h-24 text-violet-500" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">AI Assistant</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {insights || "Ready to analyze your live stock movements."}
                    </p>
                    {!insights && (
                      <button onClick={handleGenerateInsights} disabled={loadingInsights} className="text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50">
                        {loadingInsights ? 'Analyzing Cloud Data...' : 'Generate Insights'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 animate-fade-in min-h-0">
              {view === 'dashboard' && <Dashboard data={items} />}
              {view === 'list' && <StockList items={items} statusMap={accountStatusMap} onDelete={handleDeleteItem} />}
              {view === 'reports' && <ReportsView results={auditResults} onRunAudit={() => setIsImportModalOpen(true)} />}
              {view === 'transaction_entry' && <TransactionForm availableCodes={uniqueCodes} onSubmit={handleTransactionSubmit} />}
              {view === 'transaction_report' && (
                <TransactionReport 
                  items={items} 
                  currentUser={currentUser}
                  onDelete={handleDeleteItem}
                />
              )}
              {view === 'schedule' && (
                <ScheduleView 
                  employees={employees} 
                  schedule={schedule}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onUpdateSchedule={handleUpdateScheduleDay}
                />
              )}
              {view === 'notes' && (
                <NotesView 
                  notes={notes} 
                  currentUser={currentUser}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                />
              )}
              {view === 'users' && currentUser.role === 'admin' && (
                <UserManagement 
                   users={users} 
                   onAddUser={handleAddUser}
                   onDeleteUser={handleDeleteUser}
                   currentUser={currentUser} 
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport} 
      />
    </div>
  );
};

export default App;
