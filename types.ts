
export interface StockItem {
  id: string;
  date: string;
  code: string;
  provider: string;
  phoneNumber: string;
  amount: number;
  type: 'IN' | 'OUT' | 'TEMP_USE'; 
  orderNumber?: string;
  createdAt: number;
  createdBy?: string; // Username of creator
}

export type SortField = 'date' | 'amount' | 'provider';
export type SortOrder = 'asc' | 'desc';

export type ImportMode = 'ADD_STOCK' | 'CALCULATE_USAGE' | 'AUDIT_SYSTEM';

export interface ImportResult {
  success: boolean;
  data?: Omit<StockItem, 'id' | 'createdAt' | 'type'>[];
  error?: string;
}

export interface AuditResult {
  code: string;
  provider: string;
  phoneNumber: string;
  systemBalance: number;
  appBalance: number;
  difference: number;
  status: 'MATCH' | 'MISMATCH';
}

export type AccountStatus = 'OPEN' | 'CLOSED';

export type ViewType = 'dashboard' | 'list' | 'reports' | 'transaction_entry' | 'transaction_report' | 'schedule' | 'notes' | 'users';

export interface EmployeeRequest {
  id: string;
  day: string; // YYYY-MM-DD or Day Name
  shift: string; // "OFF", "Morning"...
}

export interface Employee {
  id: string;
  name: string;
  primaryShift?: string; // The shift they are rotating on for this month
  requests?: EmployeeRequest[]; // Structured requests
}

export type ShiftType = 'Morning' | 'Noon 1' | 'Noon 2' | 'Night' | 'OFF' | 'AL';

export interface DaySchedule {
  day: string; // YYYY-MM-DD
  assignments: {
    employeeId: string;
    employeeName: string;
    shift: ShiftType;
  }[];
}

export interface Note {
  id: string;
  content: string;
  author: string;
  color: string;
  createdAt: number;
  imageUrl?: string;
}

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  password: string; // stored as plain text for this local demo
  name: string;
  role: UserRole;
  permissions?: ViewType[]; // Granular permissions
}
