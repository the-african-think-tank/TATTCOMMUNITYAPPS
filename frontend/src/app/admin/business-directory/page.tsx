"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Store, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  Globe, 
  MapPin, 
  X,
  ExternalLink,
  ArrowRight,
  Lock as LockIcon,
} from "lucide-react";
import Link from "next/link";
import api from "@/services/api";

interface BusinessPartner {
  id: string;
  name: string;
  category: string;
  foundingYear: number;
  website: string;
  locationText: string;
  missionAlignment: string;
  perkOffer: string;
  logoUrl: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'INACTIVE';
  contactEmail: string;
  contactName: string;
  createdAt: string;
  clickCount: number;
  isStrategic?: boolean;
}

const BusinessLogo = ({ src, name }: { src?: string; name: string }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <Store className="text-tatt-black opacity-10" size={24} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="size-full object-cover"
      onError={() => setError(true)}
    />
  );
};

export default function AdminBusinessDirectory() {
  const [businesses, setBusinesses] = useState<BusinessPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activePartners: 0, pendingApplications: 0, memberRedemptions: 0 });
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const statusParam = activeTab === 'ALL' ? '' : `?status=${activeTab}`;
      const [businessesRes, statsRes] = await Promise.all([
        api.get(`/business-directory/all${statusParam}`),
        api.get('/business-directory/stats')
      ]);
      setBusinesses(businessesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch business directory data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'DECLINED') => {
    try {
      await api.patch(`/business-directory/${id}/status`, { status });
      fetchData();
    } catch (error) {
      console.error("Failed to update business status:", error);
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-tatt-black capitalize">Business Partner Directory</h1>
          <p className="text-tatt-gray font-medium mt-1">Manage and curate the TATT economic ecosystem.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border pb-8 pt-6 px-6 rounded-3xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={80} className="text-tatt-lime" />
          </div>
          <p className="text-tatt-gray text-xs font-black uppercase tracking-widest mb-1">Active Partners</p>
          <h3 className="text-4xl font-black text-tatt-black">{stats.activePartners}</h3>
        </div>

        <div className="bg-white border border-border pb-8 pt-6 px-6 rounded-3xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Clock size={80} className="text-amber-500" />
          </div>
          <p className="text-tatt-gray text-xs font-black uppercase tracking-widest mb-1">Pending Applications</p>
          <h3 className="text-4xl font-black text-tatt-black">{stats.pendingApplications}</h3>
        </div>

        <div className="bg-white border border-border pb-8 pt-6 px-6 rounded-3xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Globe size={80} className="text-tatt-lime" />
          </div>
          <p className="text-tatt-gray text-xs font-black uppercase tracking-widest mb-1">Total Clicks</p>
          <h3 className="text-4xl font-black text-tatt-black">{stats.memberRedemptions}</h3>
        </div>
      </div>

      {/* Main Content Area (Table) */}
      <div className="bg-white border border-border rounded-3xl overflow-hidden shadow-sm">
        {/* Tabs & Search */}
        <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white">
          <div className="flex bg-background p-1 rounded-2xl w-fit border border-border">
            {(['ALL', 'PENDING', 'APPROVED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab ? "bg-white shadow-sm text-tatt-black ring-1 ring-offset-0 ring-border" : "text-tatt-gray hover:text-tatt-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
            <input
              type="text"
              placeholder="Search by business name or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-3 text-sm text-tatt-black focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 transition-all placeholder:text-tatt-gray/40 shadow-inner"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 border-4 border-tatt-lime/20 border-t-tatt-lime rounded-full animate-spin"></div>
              <p className="text-tatt-gray font-bold animate-pulse">Loading Directory...</p>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="size-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 text-tatt-gray">
                <Store size={40} className="opacity-20" />
              </div>
              <h3 className="text-xl font-black text-tatt-black">No partners found</h3>
              <p className="text-tatt-gray max-w-sm mx-auto mt-2 font-medium">No records match the current status filter or search query.</p>
            </div>
          ) : (
            <table className="w-full text-left table-auto">
              <thead className="bg-background/50 text-[10px] uppercase font-bold text-tatt-gray tracking-widest border-b border-border sticky top-0 bg-background z-10">
                <tr>
                  <th className="px-8 py-5">Partner Venture</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Total Clicks</th>
                  <th className="px-8 py-5">Dated</th>
                  <th className="px-8 py-5 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBusinesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-background/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          <BusinessLogo src={biz.logoUrl} name={biz.name} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-tatt-black">{biz.name}</p>
                            {biz.isStrategic && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-tatt-black text-white shrink-0">
                                Corporate Partner
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-tatt-lime font-bold uppercase tracking-widest">{biz.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        biz.status === 'APPROVED' ? 'bg-tatt-lime/20 text-tatt-lime' : 
                        biz.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500' : 
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {biz.status}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-tatt-black">{biz.clickCount}</span>
                        <span className="text-[10px] text-tatt-gray font-bold uppercase">Clicks</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-tatt-gray font-bold uppercase tracking-tighter">{new Date(biz.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/admin/business-directory/${biz.id}`}
                          className="h-10 px-6 rounded-xl bg-white border border-border flex items-center justify-center text-tatt-black font-black text-[10px] uppercase tracking-widest hover:bg-tatt-black hover:text-white transition-all shadow-sm shadow-black/5 active:scale-95"
                        >
                          View Details
                        </Link>
                        {biz.status === 'PENDING' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(biz.id, 'APPROVED');
                            }}
                            className="h-10 px-6 rounded-xl bg-tatt-lime text-tatt-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-sm shadow-tatt-lime/10 active:scale-95"
                          >
                            Quick Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
