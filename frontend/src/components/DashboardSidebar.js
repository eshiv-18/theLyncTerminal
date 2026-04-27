import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, DollarSign, Users, CreditCard, GitBranch,
  Link2, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';

const NAV = [
  { id: 'all', label: 'Overview', icon: LayoutDashboard },
  { id: 'finances', label: 'Finances', icon: DollarSign, connKey: 'zoho' },
  { id: 'sales', label: 'Sales & CRM', icon: Users, connKey: 'hubspot' },
  { id: 'payments', label: 'Payments', icon: CreditCard, connKey: 'razorpay' },
  { id: 'engineering', label: 'Engineering', icon: GitBranch, connKey: 'github' },
];

export default function DashboardSidebar({ active, onChange, connected, collapsed, onCollapse }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  return (
    <aside className={`hidden lg:flex flex-col sticky top-20 self-start shrink-0 transition-all duration-300 ease-in-out glass-sidebar rounded-r-2xl ${collapsed ? 'w-16' : 'w-52'}`}>
      {/* Collapse toggle */}
      <button onClick={onCollapse}
        className="self-end mb-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        {collapsed ? <ChevronRight className="h-4 w-4"/> : <ChevronLeft className="h-4 w-4"/>}
      </button>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(item => {
          const isActive = active === item.id;
          const isConnected = item.connKey ? connected[item.connKey] : true;
          return (
            <button key={item.id} onClick={() => onChange(item.id)}
              className={`group w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'} ${
                isActive
                  ? 'bg-[#0055BE] text-white shadow-sm shadow-[#0055BE]/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}>
              <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? '' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}/>
              {!collapsed && (
                <>
                  <span className="text-[13px] font-medium truncate">{item.label}</span>
                  {item.connKey && (
                    <div className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}/>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom pinned actions */}
      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-0.5">
        <button onClick={() => navigate('/integrations')}
          className={`group w-full flex items-center gap-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-150 ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}>
          <Link2 className="h-[18px] w-[18px] shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"/>
          {!collapsed && <span className="text-[13px] font-medium">Integrations</span>}
        </button>
        <button onClick={handleLogout}
          className={`group w-full flex items-center gap-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-150 ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}>
          <LogOut className="h-[18px] w-[18px] shrink-0 text-slate-400 group-hover:text-rose-500"/>
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export { NAV as FILTERS };
