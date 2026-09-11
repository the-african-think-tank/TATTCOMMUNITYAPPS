"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Store, 
  MapPin, 
  Globe, 
  Filter, 
  ArrowRight, 
  ShieldCheck,
  Building2,
  Zap,
  ChevronDown,
  ExternalLink,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import api from "@/services/api";

interface BusinessPartner {
  id: string;
  name: string;
  category: string;
  website: string;
  locationText: string;
  perkOffer: string;
  logoUrl: string;
  chapter?: { name: string };
}

// --- Custom Components ---

const CardLogo = ({ src, name }: { src?: string; name: string }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <Store className="text-tatt-black opacity-20" size={36} strokeWidth={1.5} />;
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

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  icon: Icon
}: {
  label: string,
  value: string,
  options: { label: string, value: string }[],
  onChange: (value: string) => void,
  icon: any
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative group/filter flex-1 min-w-[240px]">
      <div className="absolute -top-2.5 left-5 px-2 bg-surface text-[10px] font-black uppercase tracking-widest text-tatt-gray z-10 transition-colors group-focus-within/filter:text-tatt-lime">
        {label}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-surface border rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-foreground flex items-center justify-between transition-all shadow-sm ${isOpen ? 'border-tatt-lime ring-4 ring-tatt-lime/10' : 'border-border hover:border-tatt-lime/40'}`}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className={`transition-colors ${isOpen ? 'text-tatt-lime' : 'text-tatt-gray'}`} />
          <span>{options.find(opt => opt.value === value)?.label || value}</span>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-tatt-lime' : 'text-tatt-gray'}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-surface border border-border rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-[320px] overflow-y-auto no-scrollbar py-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-6 py-4 text-xs font-bold uppercase tracking-widest text-left transition-all flex items-center justify-between hover:bg-tatt-lime/5 ${value === opt.value ? 'bg-tatt-lime/10 text-tatt-lime' : 'text-tatt-gray hover:text-foreground'}`}
                >
                  {opt.label}
                  {value === opt.value && <CheckCircle size={14} className="text-tatt-lime" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function MemberBusinessCenter() {
  const [businesses, setBusinesses] = useState<BusinessPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [chapterId, setChapterId] = useState('All');
  const [chapters, setChapters] = useState<{id: string, name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBusiness, setHasBusiness] = useState(false);

  const categories = ['All', 'Agriculture & Food', 'Technology & Innovation', 'Healthcare & Wellness', 'Creative & Media', 'Finance & FinTech', 'Manufacturing & Trade', 'Education & Research'];

  useEffect(() => {
    fetchChapters();
    fetchBusinesses();
    checkMyBusiness();
  }, [category, chapterId]);
  
  const checkMyBusiness = async () => {
    try {
      const url = '/business-directory/profile-managed';
      console.log(`[Diagnostic] Calling endpoint: ${url}`);
      const { data } = await api.get(url);
      console.log("Profile data:", data);
      if (data) setHasBusiness(true);
    } catch (err) {
      setHasBusiness(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data } = await api.get('/chapters');
      setChapters(data);
    } catch (err) {
      console.error("Failed to fetch chapters:", err);
    }
  };

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      let params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (chapterId !== 'All') params.append('chapterId', chapterId);
      
      const { data } = await api.get(`/business-directory/list?${params.toString()}`);
      setBusinesses(data);
    } catch (error) {
      console.error("Error fetching directory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackClick = async (bizId: string, websiteUrl: string) => {
    try {
      await api.post(`/business-directory/${bizId}/click`);
    } catch (err) {
      console.error("Failed to track click:", err);
    }
    window.open(websiteUrl, '_blank');
  };

  const filteredBusinesses = businesses.filter(b => {
    const query = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query) ||
      (b.chapter?.name && b.chapter.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700 p-4 lg:p-8">
      {/* Hero Section */}
      <div className="relative bg-surface border border-border rounded-[40px] p-8 lg:p-14 overflow-hidden group shadow-sm">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
          <Globe size={400} className="text-tatt-lime" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6 bg-tatt-lime/10 w-fit px-4 py-1.5 rounded-full border border-tatt-lime/20">
            <ShieldCheck size={16} className="text-tatt-lime" />
            <span className="text-[10px] font-black uppercase tracking-widest text-tatt-lime">Impact Ecosystem</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-foreground leading-tight tracking-tight mb-6">
            The TATT <span className="text-tatt-lime underline decoration-wavy underline-offset-8">Business Center</span>
          </h1>
          <p className="text-tatt-gray text-lg font-medium leading-relaxed mb-8">
            Access exclusive perks, discounts, and professional services from vetted businesses within the TATT community. This is our parallel economy in action.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {!hasBusiness ? (
              <Link 
                href="/dashboard/business-center/apply"
                className="w-full sm:w-auto bg-tatt-lime text-tatt-black px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-tatt-lime/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                List Your Business <ArrowRight size={18} />
              </Link>
            ) : (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
                <ShieldCheck size={20} className="text-tatt-lime" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Venture Already Listed</span>
              </div>
            )}
            <p className="text-tatt-gray text-xs font-bold italic border-l-2 border-border pl-4">Empowering the African professional network.</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 max-w-4xl">
           <FilterSelect 
             label="Industry Sector" 
             value={category} 
             options={categories.map(cat => ({ label: cat === 'All' ? 'Every Industry' : cat, value: cat }))} 
             onChange={setCategory} 
             icon={Building2} 
           />
           <FilterSelect 
             label="Operations Chapter" 
             value={chapterId} 
             options={[
               { label: 'All Chapters', value: 'All' },
               ...chapters.map(ch => ({ label: ch.name, value: ch.id }))
             ]} 
             onChange={setChapterId} 
             icon={MapPin} 
           />
        </div>

        <div className="relative max-w-md w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
            <input
              type="text"
              placeholder="Search ventures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-2xl pl-14 pr-6 py-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 transition-all placeholder:text-tatt-gray/40 shadow-sm"
            />
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-surface border border-border rounded-[32px] h-[400px] animate-pulse"></div>
          ))}
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="bg-surface border border-border rounded-[40px] p-24 text-center shadow-sm">
            <div className="size-24 bg-background rounded-full flex items-center justify-center mx-auto mb-8 text-tatt-gray">
                <Store size={48} className="opacity-20" />
            </div>
            <h3 className="text-2xl font-black text-foreground">No businesses discovered yet</h3>
            <p className="text-tatt-gray mt-2 font-medium">Become the first in this category! List your business today.</p>
            <Link href="/dashboard/business-center/apply" className="mt-8 inline-flex text-tatt-lime font-bold hover:underline">Apply now</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBusinesses.map((biz) => (
            <div key={biz.id} className="relative bg-surface border border-border rounded-2xl p-5 hover:border-tatt-lime/50 transition-all duration-300 group overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5">
              
              {/* Card Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center text-center">
                <div className="size-14 bg-white rounded-xl flex items-center justify-center overflow-hidden mb-3 shadow-sm group-hover:scale-105 transition-transform duration-300 border border-border group-hover:border-tatt-lime/30 shrink-0">
                  <CardLogo src={biz.logoUrl} name={biz.name} />
                </div>
                
                <span className="text-tatt-lime text-[9px] font-black uppercase tracking-[0.18em] mb-2 px-2.5 py-0.5 bg-tatt-lime/10 border border-tatt-lime/20 rounded-full">
                  {biz.category}
                </span>
                
                <h3 className="text-base font-black text-foreground group-hover:text-tatt-black transition-colors mb-2 line-clamp-2 min-h-[2.5rem] flex items-center justify-center tracking-tight leading-snug">
                  {biz.name}
                </h3>
                
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-tatt-gray text-[9px] font-black uppercase tracking-wider mb-4">
                  <div className="flex items-center gap-1 bg-background border border-border/80 px-2.5 py-0.5 rounded-full">
                    <MapPin size={10} className="text-tatt-lime shrink-0" />
                    <span className="truncate max-w-[100px]">{biz.locationText || 'Global'}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-background border border-border/80 px-2.5 py-0.5 rounded-full">
                    <Building2 size={10} className="text-tatt-lime shrink-0" />
                    <span className="truncate max-w-[100px]">{biz.chapter?.name || 'TATT HQ'}</span>
                  </div>
                </div>

                <div className="w-full bg-background/60 border border-border/80 rounded-xl p-3.5 mb-4 text-left relative group/perk">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={12} className="text-tatt-lime fill-tatt-lime" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-tatt-gray">Member Perk</span>
                  </div>
                  <p className="text-xs font-medium text-foreground/90 line-clamp-2 leading-relaxed">
                    {biz.perkOffer}
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-3 border-t border-border/80 flex items-center justify-between gap-3">
                <Link 
                  href={`/dashboard/business-center/${biz.id}`}
                  className="text-[11px] font-black uppercase tracking-wider text-tatt-gray hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Globe size={13} /> View Details
                </Link>
                <button 
                  onClick={() => handleTrackClick(biz.id, biz.website)}
                  className="bg-tatt-lime text-tatt-black font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-tatt-lime/10 cursor-pointer whitespace-nowrap"
                >
                  Redeem Perk <ArrowRight size={12} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Values CTA */}
      <div className="bg-background border border-border rounded-[40px] p-12 text-center shadow-sm">
        <h3 className="text-2xl font-black text-foreground mb-4 font-sans tracking-tight">Values-Driven Commercial Ecosystem</h3>
        <p className="text-tatt-gray max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
          The Business Center is more than a directory; it's a statement of economic unity. By supporting member businesses, we strengthen the collective prosperity of the Diaspora and the Continent.
        </p>
        {!hasBusiness && (
          <Link 
              href="/dashboard/business-center/apply"
              className="inline-flex items-center gap-3 text-tatt-lime font-black uppercase tracking-[0.2em] text-xs hover:gap-5 transition-all py-4 px-8 rounded-2xl border border-tatt-lime/20 bg-surface shadow-sm"
          >
              Add Your Venture <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
