"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { 
  Building2, ShoppingBag, TrendingUp, TrendingDown,
  Download, Search, Bell, Grid, Banknote, 
  ChevronLeft, ChevronRight, Loader2, ArrowUpRight, 
  ArrowDownRight, Filter, Calendar, Users, Briefcase, 
  History, DollarSign, Wallet, ShieldCheck, Globe, CreditCard,
  Repeat
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

// Custom Premium Select Component
const PremiumSelect = ({ 
  label, 
  value, 
  onChange, 
  options, 
  icon: Icon 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  options: { id: string, name: string }[],
  icon: any
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value) || options[0];

  return (
    <div className="flex flex-col gap-2 min-w-[180px] relative">
      <label className="text-[9px] font-black text-tatt-gray uppercase tracking-widest ml-1 opacity-70">{label}</label>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-background border border-border text-xs font-bold rounded-xl px-4 py-3 flex items-center justify-between group hover:border-tatt-lime/50 transition-all outline-none"
      >
        <div className="flex items-center gap-3">
          <Icon className="size-3.5 text-tatt-gray group-hover:text-tatt-lime transition-colors" />
          <span className="truncate max-w-[120px]">{selectedOption?.name}</span>
        </div>
        <ChevronRight className={`size-3 text-tatt-gray transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 py-1 max-h-[250px] overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors flex items-center justify-between ${
                  value === opt.id ? "bg-tatt-lime/10 text-tatt-lime" : "text-tatt-gray hover:bg-background hover:text-foreground"
                }`}
              >
                {opt.name}
                {value === opt.id && <ShieldCheck className="size-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Mock icons if Lucide doesn't have exactly what's needed
const MaterialIcon = ({ icon }: { icon: string }) => <span className="material-symbols-outlined">{icon}</span>;

interface RevenueStats {
  totalRevenue: number;
  subRevenue: number;
  productRevenue: number;
  growth: number;
  transactionCount: number;
}

interface TrendData {
  month: string;
  revenue: number;
}

interface Transaction {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  status: string;
  referenceNumber: string;
  membershipTier?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function RevenueCenterPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [chapterRevenue, setChapterRevenue] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    timeRange: "month",
    chapterId: "all",
    tier: "all",
  });
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isSuperAdmin = user?.systemRole === "SUPERADMIN";

  const fetchData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      // Calculate start date based on timeRange to sync with Dashboard expectations
      let startDate: string | undefined;
      const now = new Date();
      if (filters.timeRange === "week") {
        const d = new Date(); d.setDate(now.getDate() - 7);
        startDate = d.toISOString();
      } else if (filters.timeRange === "month") {
        const d = new Date(); d.setDate(now.getDate() - 30);
        startDate = d.toISOString();
      } else if (filters.timeRange === "year") {
        const d = new Date(); d.setFullYear(now.getFullYear() - 1);
        startDate = d.toISOString();
      }

      const [statsRes, trendsRes, transRes, metaRes, distRes] = await Promise.all([
        api.get("/admin/revenue/stats", { 
          params: { 
            chapterId: filters.chapterId !== "all" ? filters.chapterId : undefined, 
            tier: filters.tier !== "all" ? filters.tier : undefined,
            startDate
          } 
        }),
        api.get("/admin/revenue/trends", { params: { chapterId: filters.chapterId !== "all" ? filters.chapterId : undefined } }),
        api.get("/admin/revenue/transactions", { params: { page, limit: 10, chapterId: filters.chapterId !== "all" ? filters.chapterId : undefined } }),
        api.get("/admin/revenue/metadata"),
        api.get("/admin/revenue/by-chapter"),
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setTransactions(transRes.data.data);
      setTotalPages(transRes.data.meta.totalPages);
      setChapters(metaRes.data.chapters);
      setTiers(metaRes.data.tiers);
      setChapterRevenue(distRes.data);
    } catch (err) {
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }, [filters, page, isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-tatt-lime" /></div>;
  
  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <ShieldCheck className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4 tracking-tight">Access Restricted</h1>
        <p className="text-tatt-gray max-w-md mb-8 font-medium">
          The Revenue Center contains sensitive financial information and is only accessible to Tier-1 Super Administrators.
        </p>
        <button onClick={() => window.location.href = "/dashboard"} className="px-8 py-3.5 bg-foreground text-background font-black text-xs uppercase tracking-widest rounded-xl transition-all">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-tatt-lime selection:text-tatt-black">
      {/* Top Navbar Simulation if not provided by layout */}
      <header className="flex justify-between items-center w-full px-8 h-18 bg-surface dark:bg-[#121212] font-bold text-sm tracking-tight shadow-sm border-b border-border sticky top-0 z-30 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
            <input 
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 text-xs focus:ring-1 focus:ring-tatt-lime py-2.5 outline-none transition-all placeholder:text-tatt-gray/50" 
              placeholder="Search financial records..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-border pr-6">
            <button className="text-tatt-gray hover:text-tatt-lime transition-colors relative">
              <Bell className="size-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-tatt-lime rounded-full border-2 border-surface"></span>
            </button>
            <button className="text-tatt-gray hover:text-tatt-lime transition-colors">
              <Grid className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] tracking-widest font-black text-tatt-lime uppercase leading-none mb-1">Superadmin</p>
              <p className="leading-none text-xs font-bold">{user.firstName} {user.lastName}</p>
            </div>
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-border shadow-sm" />
            ) : (
              <div className="size-10 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black border border-tatt-lime/20">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header & Filter Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-2 rounded-full bg-tatt-lime animate-pulse"></div>
              <span className="text-[10px] tracking-widest font-black text-tatt-gray uppercase">Financial Control Center</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-foreground leading-[0.9]">Revenue Dashboard</h2>
            <p className="text-tatt-gray mt-3 font-medium text-sm">Real-time fiscal monitoring and growth analytics for TATT Global.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end bg-surface p-4 rounded-3xl border border-border shadow-sm w-full lg:w-auto">
            <PremiumSelect 
              label="Time Range" 
              value={filters.timeRange}
              icon={Calendar}
              onChange={(val) => setFilters(prev => ({ ...prev, timeRange: val }))}
              options={[
                { id: "week", name: "Last 7 Days" },
                { id: "month", name: "Monthly View" },
                { id: "year", name: "Annual Review" }
              ]}
            />
            
            <PremiumSelect 
              label="Chapter Division" 
              value={filters.chapterId}
              icon={Globe}
              onChange={(val) => setFilters(prev => ({ ...prev, chapterId: prev.chapterId === val ? "all" : val }))}
              options={[
                { id: "all", name: "Global Operations" },
                ...chapters.map(c => ({ id: c.id, name: c.name }))
              ]}
            />

            <PremiumSelect 
              label="Taxonomy Tier" 
              value={filters.tier}
              icon={Users}
              onChange={(val) => {
                // If clicking the current filter or Aggregate, reset to all
                if (val === 'all' || filters.tier === val) {
                  setFilters(prev => ({ ...prev, tier: 'all' }));
                } else {
                  setFilters(prev => ({ ...prev, tier: val }));
                }
              }}
              options={[
                { id: "all", name: "Aggregate Tiers" },
                ...tiers
              ]}
            />

            <button className="bg-tatt-lime text-tatt-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:shadow-xl hover:shadow-tatt-lime/20 transition-all active:scale-95 text-xs uppercase tracking-widest h-[48px] self-end mb-[2px]">
              <Download className="size-4" />
              Export
            </button>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Main Card: Total Revenue */}
          <div className="lg:col-span-5 bg-tatt-black text-white rounded-[40px] p-10 relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 right-0 p-10 opacity-10 font-black text-9xl -translate-y-1/4 translate-x-1/4 select-none group-hover:scale-110 transition-transform duration-700">
              $
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Wallet className="size-6 text-tatt-lime" />
                </div>
                <span className="text-[10px] tracking-[0.3em] font-black text-tatt-lime uppercase">
                  {filters.timeRange === 'week' ? 'Weekly' : filters.timeRange === 'month' ? 'Monthly' : 'Annual'} Revenue
                </span>
              </div>
              <div className="flex flex-col mt-4">
                <div className="flex items-baseline gap-4">
                  <h3 className="text-7xl font-black tracking-tighter leading-none">
                    {loading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
                  </h3>
                  <div className="flex items-center gap-1.5 text-tatt-lime font-black text-xs bg-white/10 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm self-center">
                    {stats?.growth && stats.growth >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {stats?.growth ? `${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%` : '0%'}
                  </div>
                </div>
                <p className="text-white/40 mt-6 text-sm font-medium leading-relaxed max-w-sm">
                  System performance is currently <span className="text-white">4% above</span> the projected baseline for the current fiscal quarter.
                </p>
              </div>
            </div>
            
            <div className="mt-12 flex gap-12 relative z-10">
               <div>
                 <p className="text-[9px] font-black text-tatt-lime uppercase tracking-widest mb-1 opacity-50">Transactions</p>
                 <p className="text-2xl font-black">{stats?.transactionCount || 0}</p>
               </div>
               <div>
                 <p className="text-[9px] font-black text-tatt-lime uppercase tracking-widest mb-1 opacity-50">Growth Index</p>
                 <p className="text-2xl font-black">1.4x</p>
               </div>
            </div>
          </div>

          {/* Secondary Streams */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-surface rounded-[32px] p-8 border border-border shadow-sm flex flex-col justify-between h-1/2 hover:border-tatt-lime/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="size-14 rounded-2xl bg-tatt-lime/10 flex items-center justify-center border border-tatt-lime/10 group-hover:bg-tatt-lime group-hover:text-tatt-black transition-all">
                  <CreditCard className="size-7" />
                </div>
                <div className="text-[10px] font-black text-tatt-gray bg-background px-3 py-1 rounded-full border border-border">74.6% of total</div>
              </div>
              <div className="mt-4">
                <span className="text-[9px] tracking-widest font-black text-tatt-gray uppercase">Subscription Revenue</span>
                <h4 className="text-4xl font-black text-foreground mt-1 leading-none">{loading ? "..." : formatCurrency(stats?.subRevenue || 0)}</h4>
              </div>
              <div className="mt-4 h-1.5 w-full bg-background rounded-full overflow-hidden">
                <div className="h-full bg-tatt-lime transition-all duration-1000" style={{ width: '74.6%' }}></div>
              </div>
            </div>

            <div className="bg-surface rounded-[32px] p-8 border border-border shadow-sm flex flex-col justify-between h-1/2 hover:border-tatt-lime/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="size-14 rounded-2xl bg-tatt-bronze/10 flex items-center justify-center border border-tatt-bronze/10 group-hover:bg-tatt-bronze group-hover:text-tatt-black transition-all">
                  <ShoppingBag className="size-7" />
                </div>
                <div className="text-[10px] font-black text-tatt-gray bg-background px-3 py-1 rounded-full border border-border">25.4% of total</div>
              </div>
              <div className="mt-4">
                <span className="text-[9px] tracking-widest font-black text-tatt-gray uppercase">Product Sales</span>
                <h4 className="text-4xl font-black text-foreground mt-1 leading-none">{loading ? "..." : formatCurrency(stats?.productRevenue || 0)}</h4>
              </div>
              <div className="mt-4 h-1.5 w-full bg-background rounded-full overflow-hidden">
                <div className="h-full bg-tatt-bronze transition-all duration-1000" style={{ width: '25.4%' }}></div>
              </div>
            </div>
          </div>

          {/* Regional Snapshot */}
          <div className="lg:col-span-3 bg-surface rounded-[32px] p-8 border border-border shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-1 w-8 bg-tatt-lime rounded-full"></div>
              <span className="text-[10px] tracking-widest font-black text-tatt-gray uppercase">Chapter Distribution</span>
            </div>
            
            <div className="flex-1 space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {chapterRevenue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                  <Globe className="size-8" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Regional Data</p>
                </div>
              ) : chapterRevenue.map((dist, i) => {
                const colors = ["bg-tatt-lime", "bg-tatt-bronze", "bg-foreground", "bg-tatt-gray/40"];
                const maxRevenue = Math.max(...chapterRevenue.map(d => Number(d.total))) || 1;
                const pct = (Number(dist.total) / maxRevenue) * 100;
                
                return (
                  <div key={dist.chapterId} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black text-foreground leading-none truncate max-w-[150px]">{dist.chapter?.name || "Global / OS"}</p>
                        <p className="text-[9px] font-bold text-tatt-gray uppercase tracking-widest mt-1">{dist.chapter?.code || "UNKN"}</p>
                      </div>
                      <p className="text-sm font-black text-foreground">{formatCurrency(Number(dist.total))}</p>
                    </div>
                    <div className="w-full bg-background h-2.5 rounded-xl overflow-hidden border border-border/10">
                      <div className={`h-full ${colors[i % 4]} rounded-full transition-all duration-1000 delay-300`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button className="mt-10 w-full py-3.5 border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-tatt-lime hover:border-tatt-lime transition-all">
              View Detailed Analytics
            </button>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="bg-surface rounded-[40px] px-10 py-12 border border-border shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-16 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="size-5 text-tatt-lime" />
                <span className="text-[10px] tracking-[0.2em] font-black text-tatt-gray uppercase">Forecasting & Trends</span>
              </div>
              <h3 className="text-3xl font-black text-foreground tracking-tight">Financial Performance Matrix</h3>
            </div>
            <div className="flex gap-8 bg-background px-6 py-3 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-lg bg-tatt-lime shadow-lg shadow-tatt-lime/30"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Current Year</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-lg bg-tatt-gray/20 border border-border"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Previous Year</span>
              </div>
            </div>
          </div>

          <div className="relative h-[300px] mt-10 w-full group">
            {/* Visual Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between opacity-5">
              {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-foreground"></div>)}
            </div>
            
            {/* Abstract Line SVG */}
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d1d105" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#d1d105" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {trends.length > 0 && (
                <>
                  {/* Area Fill */}
                  <path 
                    d={`M 0,300 ${trends.map((t, i) => {
                      const x = (i / (trends.length - 1)) * 1200;
                      const maxVal = Math.max(...trends.map(d => d.revenue)) || 1;
                      const y = 300 - (t.revenue / maxVal) * 250;
                      return `L ${x},${y}`;
                    }).join(' ')} V 300 H 0 Z`} 
                    fill="url(#chartGradient)" className="transition-all duration-700"
                  />
                  {/* Main Path */}
                  <path 
                    d={`M 0,${300 - ((trends[0]?.revenue || 0) / (Math.max(...trends.map(d => d.revenue)) || 1)) * 250} ${trends.map((t, i) => {
                      const x = (i / (trends.length - 1)) * 1200;
                      const maxVal = Math.max(...trends.map(d => d.revenue)) || 1;
                      const y = 300 - (t.revenue / maxVal) * 250;
                      return `L ${x},${y}`;
                    }).slice(1).join(' ')}`} 
                    fill="none" stroke="#d1d105" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" 
                    className="drop-shadow-[0_10px_15px_rgba(209,209,0,0.3)] transition-all duration-1000"
                  />
                </>
              )}
            </svg>
            
            {/* Data Labels */}
            <div className="absolute inset-0 flex items-end justify-between px-2 pt-10">
              {trends.length === 0 ? (
                ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
                  <div key={m} className="flex flex-col items-center gap-4">
                    <div className="w-1 h-32 bg-foreground/5 rounded-full"></div>
                    <span className="text-[11px] font-black text-tatt-gray uppercase tracking-widest">{m}</span>
                  </div>
                ))
              ) : trends.map((t) => (
                <div key={t.month} className="flex flex-col items-center gap-4">
                  <div className="w-1 h-32 bg-foreground/5 rounded-full transition-all group-hover:bg-tatt-lime/10"></div>
                  <span className="text-[11px] font-black text-tatt-gray uppercase tracking-widest">{t.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-surface rounded-[40px] border border-border shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="px-10 py-8 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface/50">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-tatt-lime/5 flex items-center justify-center border border-tatt-lime/10">
                <History className="size-5 text-tatt-lime" />
              </div>
              <div>
                <h4 className="text-[10px] tracking-[0.2em] font-black text-tatt-gray uppercase">Transaction Register</h4>
                <p className="text-xl font-black text-foreground">Detailed Fiscal Activity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-widest hover:bg-background transition-colors text-tatt-gray">
                 <Filter className="size-3.5" /> Filter Log
               </button>
               <button className="text-xs font-black text-tatt-lime uppercase tracking-widest px-4 py-2.5 rounded-xl bg-tatt-lime/5 hover:bg-tatt-lime/10 transition-colors">
                 Full Audit
               </button>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-background/50">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray border-b border-border">Timestamp</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray border-b border-border">Entity Control ID</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray border-b border-border">Fiscal Source</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray border-b border-border">Details / Meta</th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray border-b border-border text-right">Amount (USD)</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray border-b border-border text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="size-8 animate-spin text-tatt-lime" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Decrypting financial stream...</p>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <ShoppingBag className="size-12" />
                        <p className="text-sm font-medium">No financial movements detected for this period.</p>
                      </div>
                    </td>
                  </tr>
                ) : transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-background/40 transition-all group">
                    <td className="px-10 py-6">
                      <p className="text-xs font-black text-foreground">{format(new Date(tx.createdAt), "MMM dd, yyyy")}</p>
                      <p className="text-[9px] font-bold text-tatt-gray uppercase tracking-widest mt-0.5">{format(new Date(tx.createdAt), "HH:mm:ss")}</p>
                    </td>
                    <td className="px-6 py-6">
                      <div className="font-mono text-[10px] text-tatt-gray bg-background border border-border px-3 py-1.5 rounded-lg inline-block font-bold">
                        {tx.referenceNumber || `#TX-${tx.id.slice(0, 8).toUpperCase()}`}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="flex items-center gap-2">
                        <div className={`size-8 rounded-lg flex items-center justify-center border ${tx.type === 'SUBSCRIPTION' ? 'bg-tatt-lime/10 text-tatt-lime border-tatt-lime/10' : 'bg-tatt-bronze/10 text-tatt-bronze border-tatt-bronze/10'}`}>
                          {tx.type === 'SUBSCRIPTION' ? <MaterialIcon icon="subscriptions" /> : <MaterialIcon icon="shopping_bag" />}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground">{tx.type}</span>
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-xs font-black text-foreground">{tx.membershipTier ? `${tx.membershipTier} Member` : "Product Purchase"}</p>
                      <p className="text-[10px] text-tatt-gray truncate max-w-[150px]">{tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : "Direct Transaction"}</p>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className="text-sm font-black text-foreground tracking-tighter">{formatCurrency(tx.amount)}</span>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${
                        tx.status === 'COMPLETED' 
                          ? "bg-green-500/10 text-green-600 border-green-500/10" 
                          : tx.status === 'PENDING' 
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/10" 
                            : "bg-red-500/10 text-red-600 border-red-500/10"
                      }`}>
                        <span className={`size-1.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-green-500' : tx.status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`}></span>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-10 py-6 bg-background/30 flex items-center justify-between border-t border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Section Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="size-10 rounded-xl border border-border flex items-center justify-center hover:bg-surface disabled:opacity-40 transition-all active:scale-95"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="px-4 text-xs font-black">{page}</div>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="size-10 rounded-xl border border-border flex items-center justify-center hover:bg-surface disabled:opacity-40 transition-all active:scale-95"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
