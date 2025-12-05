
import React, { useState } from 'react';
import { User, UserRole, ViewType } from '../types';
import { UserPlus, Trash2, Shield, User as UserIcon, CheckSquare, Square } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User | null;
}

const PERMISSION_OPTIONS: { id: ViewType; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'list', label: 'Inventory List' },
  { id: 'reports', label: 'Audit Reports' },
  { id: 'transaction_entry', label: 'Transaction Entry' },
  { id: 'transaction_report', label: 'Transaction Report' },
  { id: 'schedule', label: 'Staff Schedule' },
  { id: 'notes', label: 'Team Notes' },
];

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onDeleteUser, currentUser }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [selectedPermissions, setSelectedPermissions] = useState<ViewType[]>(['dashboard', 'list', 'schedule', 'notes']);
  const [error, setError] = useState<string | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setError("All fields are required.");
      return;
    }

    if (users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setError("Username already exists.");
      return;
    }

    const newUser: User = {
      id: uuidv4(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
      role: newRole,
      permissions: newRole === 'admin' ? undefined : selectedPermissions
    };

    onAddUser(newUser);
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewRole('staff');
    setSelectedPermissions(['dashboard', 'list', 'schedule', 'notes']); // Reset to defaults
  };

  const togglePermission = (viewId: ViewType) => {
    setSelectedPermissions(prev => 
      prev.includes(viewId) ? prev.filter(p => p !== viewId) : [...prev, viewId]
    );
  };

  const handleDelete = (id: string) => {
    if (currentUser?.id === id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user?")) {
      onDeleteUser(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
           <div className="p-2 bg-indigo-100 rounded-lg">
             <UserPlus className="w-5 h-5 text-indigo-700" />
           </div>
           Create New Account
        </h2>
        
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Display Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username</label>
              <input 
                type="text" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="login_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="text" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Secret123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          {newRole === 'staff' && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Access Permissions</label>
              <div className="flex flex-wrap gap-3">
                {PERMISSION_OPTIONS.map((perm) => (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => togglePermission(perm.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedPermissions.includes(perm.id) 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {selectedPermissions.includes(perm.id) ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    {perm.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className="bg-indigo-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Create User
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
           <h3 className="font-semibold text-gray-800">Existing Users</h3>
        </div>
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Access</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {users.map(user => (
               <tr key={user.id} className="hover:bg-gray-50">
                 <td className="px-6 py-3 font-medium text-gray-900">{user.name}</td>
                 <td className="px-6 py-3">{user.username}</td>
                 <td className="px-6 py-3">
                   <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                     user.role === 'admin' ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-800'
                   }`}>
                     {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                     {user.role}
                   </span>
                 </td>
                 <td className="px-6 py-3 max-w-xs truncate">
                   {user.role === 'admin' 
                     ? <span className="text-gray-400 italic">Full Access</span> 
                     : <span className="text-gray-500" title={user.permissions?.join(', ')}>{user.permissions?.length || 0} pages allowed</span>
                   }
                 </td>
                 <td className="px-6 py-3 text-right">
                   {user.id !== currentUser?.id && (
                     <button 
                       onClick={() => handleDelete(user.id)}
                       className="text-gray-400 hover:text-red-600 transition"
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
  );
};

export default UserManagement;
