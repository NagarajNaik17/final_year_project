import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, FileText, UploadCloud, LogOut, CheckCircle, Clock, UserPlus } from 'lucide-react';
import WalletConnector from './WalletConnector';
import TransactionModal from './TransactionModal';

export default function SharedLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || 'User';
  const username = localStorage.getItem('username') || 'Guest';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const getSidebarLinks = () => {
    if (role === 'Super Admin') {
      return [
        { name: 'Dashboard', path: '/superadmin', icon: Home },
        { name: 'Pending Documents', path: '/superadmin/pending', icon: Clock },
        { name: 'All Admins', path: '/superadmin/all', icon: Users },
        { name: 'Create Admin', path: '/superadmin/create-admin', icon: Users },
      ];
    }
    if (role === 'Admin') {
      return [
        { name: 'Dashboard', path: '/admin', icon: Home },
        { name: 'All Users', path: '/admin/users', icon: Users },
        { name: 'Create User', path: '/admin/create-user', icon: UserPlus },
        { name: 'My Documents', path: '/admin/my-documents', icon: FileText },
      ];
    }
    return [
      { name: 'My Documents', path: '/user', icon: FileText },
    ];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">DV</div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800">DocuVerify</span>
        </div>
        <div className="flex items-center space-x-6">
          <WalletConnector />
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right">
              <div className="font-bold text-slate-800">{username}</div>
              <div className="text-xs text-slate-500 font-medium">{role}</div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-inner z-10 hidden md:flex">
          <nav className="flex-1 px-4 py-6 space-y-1">
            {getSidebarLinks().map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || (location.pathname === '/superadmin' && link.path === '/superadmin');
              return (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.path ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        &copy; 2026 Document Verification System. All rights reserved. Version 2.0
      </footer>
      <TransactionModal />
    </div>
  );
}
