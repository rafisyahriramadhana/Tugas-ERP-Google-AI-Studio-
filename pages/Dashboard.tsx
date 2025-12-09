import React, { useEffect, useState } from 'react';
import { FinancialSummary, Transaction, Product } from '../types';
import { generateExecutiveSummary } from '../services/geminiService';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Sparkles, AlertCircle } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

interface DashboardProps {
  summary: FinancialSummary;
  transactions: Transaction[];
  products: Product[];
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, transactions, products }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchInsight = async () => {
      if (!process.env.API_KEY) {
        setAiSummary("API Key missing. Please configure Gemini API.");
        return;
      }
      setLoadingAi(true);
      const topProducts = [...products].sort((a, b) => b.price - a.price); // Mock logic for top products
      const text = await generateExecutiveSummary(summary, transactions, topProducts);
      if (isMounted) {
        setAiSummary(text);
        setLoadingAi(false);
      }
    };
    
    // Only fetch if we haven't fetched yet or if specific trigger (here just on mount for simplicity)
    fetchInsight();

    return () => { isMounted = false; };
  }, [summary, transactions, products]);

  const chartData = [
    { name: 'Mon', revenue: 4000, profit: 2400 },
    { name: 'Tue', revenue: 3000, profit: 1398 },
    { name: 'Wed', revenue: 2000, profit: 9800 },
    { name: 'Thu', revenue: 2780, profit: 3908 },
    { name: 'Fri', revenue: 1890, profit: 4800 },
    { name: 'Sat', revenue: 2390, profit: 3800 },
    { name: 'Sun', revenue: 3490, profit: 4300 },
  ];

  return (
    <div className="space-y-6">
      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BrainCircuitIcon size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3 text-emerald-300">
            <Sparkles size={18} />
            <h3 className="text-sm font-bold uppercase tracking-widest">CFO AI Insight</h3>
          </div>
          {loadingAi ? (
             <div className="animate-pulse space-y-2 max-w-2xl">
               <div className="h-4 bg-white/20 rounded w-3/4"></div>
               <div className="h-4 bg-white/20 rounded w-1/2"></div>
             </div>
          ) : (
            <p className="text-slate-200 leading-relaxed max-w-3xl font-light text-lg">
              {aiSummary}
            </p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Revenue" 
          value={`Rp ${summary.revenue.toLocaleString()}`} 
          trend="+12.5%" 
          isPositive={true} 
          icon={DollarSign}
        />
        <StatsCard 
          title="Net Profit" 
          value={`Rp ${summary.netProfit.toLocaleString()}`} 
          trend="+8.2%" 
          isPositive={true} 
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard 
          title="Expenses" 
          value={`Rp ${summary.expenses.toLocaleString()}`} 
          trend="-2.4%" 
          isPositive={true} // Lower expenses is good
          icon={Wallet}
          color="blue"
        />
        <StatsCard 
          title="Low Stock Alert" 
          value="4 Items" 
          trend="Action Needed" 
          isPositive={false} 
          icon={AlertCircle}
          color="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Revenue & Profit Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} fillOpacity={0} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Sales by Category</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Food', value: 65 },
                { name: 'Bev', value: 45 },
                { name: 'Clean', value: 30 },
                { name: 'Other', value: 20 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const BrainCircuitIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5a3 3 0 1 0-5.997.6L2 15l4 4" />
    <path d="m22 2-5 5" />
    <path d="m14.288 7.7 5.125 5.125" />
    <path d="M22 15h-9.988l-2.012 2.012" />
  </svg>
);

const StatsCard = ({ title, value, trend, isPositive, icon: Icon, color = 'emerald' }: any) => {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-hover hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color] || 'bg-slate-50 text-slate-600'}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPositive ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-red-500" />}
        <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend}
        </span>
        <span className="text-xs text-slate-400">vs last month</span>
      </div>
    </div>
  );
};