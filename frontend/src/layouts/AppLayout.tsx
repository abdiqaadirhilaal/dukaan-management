import {
  BarChart3,
  HandCoins,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  ReceiptText,
  Store,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

const ALL: Role[] = ['admin', 'cashier'];

const NAV: { to: string; label: string; icon: typeof Users; roles: Role[]; end?: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/sales/new', label: 'New sale', icon: PlusCircle, roles: ALL },
  { to: '/sales', label: 'Sales', icon: ReceiptText, roles: ALL, end: true },
  { to: '/customers', label: 'Customers', icon: Users, roles: ALL },
  { to: '/products', label: 'Products', icon: Package, roles: ALL },
  { to: '/debts', label: 'Debts', icon: Wallet, roles: ALL },
  { to: '/payments', label: 'Payments', icon: HandCoins, roles: ALL },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { to: '/activity', label: 'Activity log', icon: History, roles: ['admin'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  if (!user) return null;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen lg:pl-64">
      {open && <div className="no-print fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto bg-slate-900 text-slate-200 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5 text-lg font-semibold text-white">
          <Store className="h-6 w-6 text-emerald-400" />
          Dukaan
        </div>
        <nav className="space-y-1 px-3 py-4">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="mr-1 text-right">
            <p className="text-sm font-medium leading-tight text-slate-800">{user.fullName}</p>
            <Badge tone={user.role === 'admin' ? 'emerald' : 'sky'}>{user.role}</Badge>
          </div>
          <button onClick={() => setChangingPassword(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Change password" title="Change password">
            <KeyRound className="h-5 w-5" />
          </button>
          <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Sign out" title="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Outlet />
      </main>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  );
}
