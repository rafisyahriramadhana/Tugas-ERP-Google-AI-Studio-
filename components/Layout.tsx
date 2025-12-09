import React from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BrainCircuit, 
  Store,
  LogOut,
  Database
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.POS, label: 'Point of Sales', icon: ShoppingCart },
    { id: AppView.INVENTORY, label: 'Inventory', icon: Package },
    { id: AppView.AI_ANALYST, label: 'AI Analyst', icon: BrainCircuit },
    { id: AppView.DATA_MANAGEMENT, label: 'Data Management', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-lg">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Kelontong<span className="text-emerald-400">ERP</span></h1>
            <p className="text-xs text-slate-400">Enterprise Edition</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors px-4 py-2 w-full">
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <header className="bg-white h-16 border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">
            {navItems.find(n => n.id === currentView)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-slate-900">Prof. Accountant</p>
              <p className="text-xs text-slate-500">Super Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
              PA
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};