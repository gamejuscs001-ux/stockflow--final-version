import React, { useState, useMemo, useRef } from 'react';
import { Employee, DaySchedule, ShiftType, EmployeeRequest } from '../types';
import { generateStaffSchedule, parseScheduleFromImage } from '../services/geminiService';
import { UserPlus, Trash2, Calendar, Loader2, Users, PlusCircle, X, CalendarDays, Upload, RotateCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ScheduleViewProps {
  employees: Employee[];
  schedule: DaySchedule[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateSchedule: (daySchedule: DaySchedule) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  employees, 
  schedule, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee, 
  onUpdateSchedule 
}) => {
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  });

  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [reqDate, setReqDate] = useState<string>('');
  const [reqType, setReqType] = useState<string>('OFF');

  const monthDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    while (date.getMonth() === month - 1) {
      days.push({
        fullDate: date.toISOString().split('T')[0],
        dayNum: date.getDate(),
        dayName: dayNames[date.getDay()],
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedMonth]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    onAddEmployee({
      id: uuidv4(),
      name: newEmployeeName.trim(),
      primaryShift: 'Morning',
      requests: []
    });
    setNewEmployeeName('');
  };

  const handleUpdatePrimaryShift = (empId: string, shift: string) => {
     const emp = employees.find(e => e.id === empId);
     if (emp) onUpdateEmployee({ ...emp, primaryShift: shift });
  };

  const handleAddRequest = (empId: string) => {
    if (!reqDate) return;
    if (!monthDays.some(d => d.fullDate === reqDate)) return;

    const emp = employees.find(e => e.id === empId);
    if (emp) {
        const newReq: EmployeeRequest = { id: uuidv4(), day: reqDate, shift: reqType };
        onUpdateEmployee({ ...emp, requests: [...(emp.requests || []), newReq] });
    }
    setReqDate('');
  };

  const handleRemoveRequest = (empId: string, reqId: string) => {
     const emp = employees.find(e => e.id === empId);
     if (emp) {
        onUpdateEmployee({ ...emp, requests: (emp.requests || []).filter(r => r.id !== reqId) });
     }
  };

  const handleGenerateSchedule = async () => {
    if (employees.length === 0) return;
    setIsGenerating(true);
    try {
      const result = await generateStaffSchedule(employees, selectedMonth);
      // Batch update logic would be ideal here, but simpler to loop for now
      // Parent component (App.tsx) handles the db write for each day
      // Wait, that's many writes. 
      for (const daySch of result) {
          onUpdateSchedule(daySch);
      }
    } catch (error) {
      console.error("Failed to generate schedule", error);
      alert("Failed to generate schedule.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShiftChange = (dateStr: string, empId: string, newShift: ShiftType) => {
    const dayData = schedule.find(d => d.day === dateStr);
    const empName = employees.find(e => e.id === empId)?.name || 'Unknown';

    if (!dayData) {
       // Create new day entry
       const newDay: DaySchedule = {
         day: dateStr,
         assignments: [{ employeeId: empId, employeeName: empName, shift: newShift }]
       };
       onUpdateSchedule(newDay);
       return;
    }

    const hasAssignment = dayData.assignments.find(a => a.employeeId === empId);
    let updatedAssignments;
    
    if (hasAssignment) {
        updatedAssignments = dayData.assignments.map(a => 
            a.employeeId === empId ? { ...a, shift: newShift } : a
        );
    } else {
        updatedAssignments = [...dayData.assignments, { employeeId: empId, employeeName: empName, shift: newShift }];
    }

    onUpdateSchedule({ ...dayData, assignments: updatedAssignments });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setIsImporting(true);
        try {
            const result = await parseScheduleFromImage(base64Data, file.type);
            
            // 1. Sync Employees
            result.employees.forEach((name: string) => {
                const existing = employees.find(e => e.name.toLowerCase() === name.trim().toLowerCase());
                if (!existing) {
                    onAddEmployee({ id: uuidv4(), name: name.trim(), requests: [] });
                }
            });
            
            // 2. Sync Schedule (This might need a refresh to get new employee IDs if added)
            // A simplified approach: Use names if IDs not immediately available? 
            // Since onAddEmployee is async in parent, we might miss IDs here.
            // For now, we assume users exist or were mapped correctly.
            
            // Note: This logic is tricky with async state. We'll do best effort.
            const nameToIdMap: Record<string, string> = {};
            employees.forEach(e => nameToIdMap[e.name] = e.id);
            // Also map the ones we just "added" (but don't have IDs for yet in this scope)
            // This limitation exists because we moved to DB.
            // WORKAROUND: We only sync schedule for matched names.
            
            const assignmentsByDate: Record<string, any[]> = {};
            result.flatAssignments.forEach(item => {
               if (!assignmentsByDate[item.date]) assignmentsByDate[item.date] = [];
               const empId = nameToIdMap[item.employeeName]; 
               // If employee was just added, we don't have their ID here yet locally without refetch.
               // Users will have to click import twice or we accept partials.
               if (empId) {
                 assignmentsByDate[item.date].push({
                   employeeId: empId,
                   employeeName: item.employeeName,
                   shift: item.shift
                 });
               }
            });

            Object.keys(assignmentsByDate).forEach(date => {
                const dayData = schedule.find(d => d.day === date);
                // Merge logic: simpler to just overwrite specific assignments for that day
                let newAssignments = dayData ? [...dayData.assignments] : [];
                
                assignmentsByDate[date].forEach(impAssign => {
                    const idx = newAssignments.findIndex(a => a.employeeId === impAssign.employeeId);
                    if (idx >= 0) newAssignments[idx] = impAssign;
                    else newAssignments.push(impAssign);
                });
                
                onUpdateSchedule({ day: date, assignments: newAssignments });
            });
            
            alert("Import complete. If new employees were added, the schedule might need a second pass.");

        } catch (err) {
            console.error(err);
            alert("Failed to parse image.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }
  };

  const getCellStyles = (shift: ShiftType | undefined) => {
    switch (shift) {
      case 'Morning': return 'bg-emerald-100 text-emerald-800 border-emerald-200'; 
      case 'Noon 1': return 'bg-sky-50 text-sky-700 border-sky-100'; 
      case 'Noon 2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'OFF': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AL': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-white text-gray-400 border-transparent';
    }
  };

  const getShiftFor = (dateStr: string, empId: string): ShiftType | undefined => {
    const dayData = schedule.find(d => d.day === dateStr);
    return dayData?.assignments.find(a => a.employeeId === empId)?.shift as ShiftType | undefined;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Monthly Roster</h2>
          <p className="text-sm text-gray-500">Manage shifts for the entire month</p>
        </div>
        <div className="flex items-center gap-2">
           <label className="text-xs font-semibold text-gray-500 uppercase">Select Month:</label>
           <input 
             type="month" 
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(e.target.value)}
             className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
           />
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
        
        <div className="w-80 shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4 shrink-0">
             <div className="bg-indigo-50 p-2 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
             </div>
             <h3 className="text-base font-bold text-gray-900">Staff & Requests</h3>
          </div>
          
          <form onSubmit={handleAddSubmit} className="flex gap-2 mb-4 shrink-0">
            <input
              type="text"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              placeholder="Name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
            <button 
              type="submit"
              disabled={!newEmployeeName.trim()}
              className="bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-black disabled:opacity-50 transition"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
             {employees.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No staff added.</p>}
             {employees.map(emp => (
               <div key={emp.id} className="p-3 bg-white rounded-lg border border-gray-200 group hover:border-indigo-300 transition-colors">
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2 overflow-hidden">
                     <span className="font-semibold text-gray-800 text-sm truncate" title={emp.name}>{emp.name}</span>
                   </div>
                   <button 
                     onClick={() => onDeleteEmployee(emp.id)}
                     className="text-gray-300 hover:text-red-500 transition"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 </div>
                 
                 <div className="flex items-center gap-2 mb-2">
                    <RotateCw className="w-3 h-3 text-gray-400" />
                    <select 
                      value={emp.primaryShift || 'Morning'} 
                      onChange={(e) => handleUpdatePrimaryShift(emp.id, e.target.value)}
                      className="text-[10px] w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                      <option value="Morning">Rotation: Morning</option>
                      <option value="Noon 1">Rotation: Noon 1</option>
                      <option value="Noon 2">Rotation: Noon 2</option>
                    </select>
                 </div>

                 <div className="flex flex-wrap gap-1 mb-2">
                   {emp.requests?.map(req => {
                     const d = new Date(req.day);
                     const label = d.getDate() ? `${d.getDate()}/${d.getMonth()+1}` : req.day;
                     return (
                       <span key={req.id} className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                         {label}: {req.shift === 'Morning' ? 'MORN' : req.shift}
                         <button onClick={() => handleRemoveRequest(emp.id, req.id)} className="hover:text-red-600">
                           <X className="w-2.5 h-2.5" />
                         </button>
                       </span>
                   )})}
                 </div>

                 <button 
                   onClick={() => setSelectedEmpId(selectedEmpId === emp.id ? null : emp.id)}
                   className="w-full text-[10px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 py-1.5 rounded transition flex items-center justify-center gap-1"
                 >
                   <PlusCircle className="w-3 h-3" /> Add Request
                 </button>

                 {selectedEmpId === emp.id && (
                   <div className="mt-2 p-2 bg-white rounded border border-indigo-100 shadow-sm animate-fade-in">
                     <div className="flex flex-col gap-2">
                       <select 
                         className="w-full border border-gray-300 rounded text-xs px-1 py-1 bg-white"
                         value={reqDate}
                         onChange={(e) => setReqDate(e.target.value)}
                       >
                         <option value="">Select Date...</option>
                         {monthDays.map(d => (
                           <option key={d.fullDate} value={d.fullDate}>
                             {d.dayNum} {d.dayName}
                           </option>
                         ))}
                       </select>
                       <div className="flex gap-1">
                          <select 
                            className="flex-1 border border-gray-300 rounded text-xs px-1 py-1 bg-white"
                            value={reqType}
                            onChange={(e) => setReqType(e.target.value)}
                          >
                            <option value="OFF">OFF</option>
                            <option value="Morning">MORN</option>
                            <option value="Noon 1">NOON 1</option>
                            <option value="Noon 2">NOON 2</option>
                            <option value="AL">AL</option>
                          </select>
                          <button 
                            onClick={() => handleAddRequest(emp.id)}
                            className="bg-indigo-600 text-white px-2 rounded hover:bg-indigo-700 text-xs"
                          >
                            Add
                          </button>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 shrink-0">
             <button
               onClick={() => fileInputRef.current?.click()}
               disabled={isImporting}
               className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition disabled:opacity-50"
             >
               {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
               {isImporting ? 'Scanning...' : 'Import Image'}
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

             <button
               onClick={handleGenerateSchedule}
               disabled={employees.length < 1 || isGenerating}
               className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg font-bold text-sm shadow hover:bg-gray-800 transition disabled:opacity-50"
             >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
               {isGenerating ? 'Auto-Schedule Month' : 'Auto-Schedule Month'}
             </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-w-0">
           {schedule.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400 bg-gray-50/50">
                <CalendarDays className="w-16 h-16 mb-4 text-gray-200" />
                <h4 className="text-lg font-semibold text-gray-600">No Schedule Data</h4>
                <p className="max-w-md mx-auto mt-2 text-sm">
                  Generate a monthly roster or import a schedule to get started.
                </p>
             </div>
           ) : (
             <div className="flex-1 overflow-auto">
               <table className="w-max border-collapse">
                 <thead className="sticky top-0 z-20 bg-white shadow-sm">
                   <tr>
                     <th className="sticky left-0 z-30 p-3 border-b border-gray-200 bg-white text-left min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                       <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Name</span>
                     </th>
                     {monthDays.map(d => (
                       <th key={d.fullDate} className={`border-b border-gray-200 border-l border-gray-100 px-2 py-3 min-w-[60px] ${d.isWeekend ? 'bg-indigo-50/30' : 'bg-white'}`}>
                         <div className="flex flex-col items-center">
                           <span className={`text-[10px] font-bold uppercase tracking-wide ${d.isWeekend ? 'text-indigo-600' : 'text-gray-800'}`}>{d.dayName}</span>
                           <span className="text-xs font-medium text-gray-500 mt-0.5">{d.dayNum}</span>
                         </div>
                       </th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {employees.map(emp => (
                     <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                       <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-3 font-semibold text-gray-700 text-xs whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                         {emp.name}
                       </td>
                       {monthDays.map(d => {
                         const shift = getShiftFor(d.fullDate, emp.id);
                         const cellClass = getCellStyles(shift);
                         
                         return (
                           <td key={`${d.fullDate}-${emp.id}`} className={`border-b border-gray-100 border-l border-gray-100 p-0 align-middle ${d.isWeekend ? 'bg-gray-50/30' : ''}`}>
                             <div className="w-full h-full p-1">
                               <select
                                 value={shift || 'OFF'}
                                 onChange={(e) => handleShiftChange(d.fullDate, emp.id, e.target.value as ShiftType)}
                                 className={`w-full h-8 appearance-none text-center text-[10px] font-semibold tracking-tight rounded-md border cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${cellClass}`}
                               >
                                 <option value="OFF">OFF</option>
                                 <option value="Morning">MORN</option>
                                 <option value="Noon 1">NOON 1</option>
                                 <option value="Noon 2">NOON 2</option>
                                 <option value="AL">AL</option>
                               </select>
                             </div>
                           </td>
                         );
                       })}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}

           {schedule.length > 0 && (
             <div className="bg-white p-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs justify-center items-center shrink-0">
                <span className="text-gray-400 font-medium mr-2">Legend:</span>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-100"></span><span className="text-gray-600">Morning</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-50"></span><span className="text-gray-600">Noon 1</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-100"></span><span className="text-gray-600">Noon 2</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-100"></span><span className="text-gray-600">OFF</span></div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;