"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { 
  Handshake, 
  Search, 
  Filter, 
  ArrowRight, 
  Lock, 
  ShieldCheck,
  Zap,
  Loader2,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Building2,
  User,
  Mail,
  Phone,
  Send,
  X
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Partnership {
  id: string;
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  isLocked: boolean;
  tierAccess: string[];
}

export default function PartnershipsDirectory() {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Corporate Partner Enquiry Inline Form States
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  const [enquiryForm, setEnquiryForm] = useState({
    orgName: "",
    contactName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "",
    email: user?.email || "",
    phone: "",
    details: ""
  });

  useEffect(() => {
    if (user) {
      setEnquiryForm(prev => ({
        ...prev,
        contactName: prev.contactName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: prev.email || user.email || ""
      }));
    }
  }, [user]);

  const categories = ["All", "Travel", "Logistics", "Finance", "Healthcare", "Technology", "Education", "Lifestyle"];

  useEffect(() => {
    const fetchPartnerships = async () => {
      try {
        const { data } = await api.get("/partnerships/my-benefits");
        setPartnerships(data);
      } catch (error) {
        console.error("Failed to fetch partnerships:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPartnerships();
  }, []);

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryForm.orgName.trim() || !enquiryForm.contactName.trim() || !enquiryForm.email.trim() || !enquiryForm.details.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingEnquiry(true);
    try {
      const subject = `Corporate Partnership Inquiry: ${enquiryForm.orgName.trim()}`;
      const description = `Organisation Name: ${enquiryForm.orgName.trim()}\nContact Person: ${enquiryForm.contactName.trim()}\nEmail: ${enquiryForm.email.trim()}\nPhone / WhatsApp: ${enquiryForm.phone.trim() || 'N/A'}\n\nPartnership Proposal & Details:\n${enquiryForm.details.trim()}`;

      await api.post("/support/tickets", {
        subject,
        description,
        category: "PARTNERSHIP"
      });

      setEnquirySubmitted(true);
      toast.success("Partnership enquiry submitted successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit enquiry. Please try again.");
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const filteredPartnerships = partnerships.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="bg-surface border border-border rounded-[40px] p-8 lg:p-12 overflow-hidden relative group shadow-sm">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 pointer-events-none group-hover:rotate-0">
          <Handshake size={320} className="text-tatt-lime" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6 bg-tatt-lime/10 w-fit px-4 py-1.5 rounded-full border border-tatt-lime/20">
            <ShieldCheck size={16} className="text-tatt-lime" />
            <span className="text-[10px] font-black uppercase tracking-widest text-tatt-lime">Verified Network</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-foreground leading-[0.9] tracking-tight mb-6">
            Partner <span className="text-tatt-lime italic">Perks</span> & Benefits
          </h1>
          <p className="text-tatt-gray text-lg font-medium leading-relaxed mb-8 max-w-2xl">
            Exclusive corporate partnerships negotiated for the TATT community. Access preferential rates, services, and opportunities within our trusted ecosystem.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer active:scale-95 ${
                activeCategory === cat 
                  ? "bg-tatt-lime text-tatt-black shadow-lg shadow-tatt-lime/20" 
                  : "bg-surface border border-border text-tatt-gray hover:border-tatt-lime/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
          <input
            type="text"
            placeholder="Search partners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-12 pr-6 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 transition-all placeholder:text-tatt-gray/40 shadow-sm"
          />
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-3xl border border-border h-[280px] animate-pulse" />
          ))}
        </div>
      ) : filteredPartnerships.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center text-tatt-gray space-y-4 bg-surface rounded-[40px] border border-border shadow-sm">
          <Handshake size={64} className="opacity-10" />
          <div>
            <h3 className="text-xl font-black text-foreground">No partners found</h3>
            <p className="text-sm font-medium mt-1">Try adjusting your category or search terms.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPartnerships.map((p) => (
            <Link
              key={p.id}
              href={p.isLocked ? "/dashboard/upgrade" : `/dashboard/partnerships/${p.id}`}
              className={`group relative flex flex-col bg-surface border border-border rounded-3xl p-6 transition-all hover:border-tatt-lime hover:shadow-xl hover:shadow-tatt-lime/5 overflow-hidden ${p.isLocked ? "grayscale-[0.8] opacity-80" : ""}`}
            >
              {p.isLocked && (
                <div className="absolute top-4 right-4 z-10 size-8 bg-black/80 rounded-full flex items-center justify-center border border-white/10">
                  <Lock size={14} className="text-tatt-lime" />
                </div>
              )}
              
              <div className="size-16 bg-white rounded-2xl flex items-center justify-center p-3 mb-6 shadow-md border border-border group-hover:scale-110 transition-transform duration-500">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt={p.name} className="size-full object-contain" />
                ) : (
                  <Handshake className="size-8 text-tatt-gray" />
                )}
              </div>

              <div className="space-y-2 mb-6 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-lime">{p.category}</p>
                <h3 className="text-xl font-black text-foreground truncate">{p.name}</h3>
                <p className="text-xs text-tatt-gray font-medium line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="pt-6 border-t border-border flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray group-hover:text-foreground transition-colors">
                  {p.isLocked ? "Upgrade Required" : "Access Benefit"}
                </span>
                <ChevronRight className={`size-4 transition-transform group-hover:translate-x-1 ${p.isLocked ? "text-tatt-gray" : "text-tatt-lime"}`} />
              </div>

              {/* Tier Access Badge */}
              <div className="absolute -bottom-2 -right-2 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="flex -space-x-2">
                    {p.tierAccess.map(t => (
                      <div key={t} title={t} className="size-5 rounded-full border border-surface bg-tatt-black flex items-center justify-center text-[7px] font-bold text-white uppercase">
                        {t.charAt(0)}
                      </div>
                    ))}
                 </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Support / Corporate Partner Enquiry Section */}
      <div className="bg-tatt-black rounded-[40px] p-8 md:p-14 relative overflow-hidden text-white shadow-2xl transition-all">
         <div className="absolute inset-0 bg-gradient-to-br from-tatt-lime/5 to-transparent pointer-events-none" />
         
         {!showEnquiryForm && !enquirySubmitted && (
           <div className="relative z-10 max-w-2xl mx-auto space-y-6 text-center animate-in fade-in duration-500">
              <div className="size-14 bg-tatt-lime/10 rounded-2xl flex items-center justify-center mx-auto border border-tatt-lime/20 text-tatt-lime">
                 <Zap className="size-6 fill-tatt-lime" />
              </div>
              <h3 className="text-3xl font-black italic tracking-tight">Become a Corporate Partner</h3>
              <p className="text-tatt-gray-light font-medium tracking-tight">
                Does your organisation serve the African Diaspora? Join our network of verified partners and provide value to our {user?.chapterName || "exclusive"} community.
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => setShowEnquiryForm(true)}
                  className="inline-flex items-center gap-2 text-tatt-lime font-black uppercase tracking-[0.2em] text-xs hover:gap-4 transition-all cursor-pointer active:scale-95 bg-tatt-lime/10 hover:bg-tatt-lime/20 px-6 py-3 rounded-full border border-tatt-lime/30"
                >
                  Inquire about Partnership <ArrowRight size={16} />
                </button>
              </div>
           </div>
         )}

         {showEnquiryForm && !enquirySubmitted && (
           <div className="relative z-10 max-w-2xl mx-auto space-y-6 text-left animate-in fade-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-lime">Direct Inquiry Form</span>
                    <h3 className="text-2xl font-black text-white tracking-tight mt-1">Become a Corporate Partner</h3>
                 </div>
                 <button
                    onClick={() => setShowEnquiryForm(false)}
                    className="p-2 text-tatt-gray hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer active:scale-95"
                    title="Close form"
                 >
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleSubmitEnquiry} className="space-y-4 pt-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] uppercase tracking-widest font-black text-tatt-gray mb-1.5">Organisation Name *</label>
                       <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                          <input 
                             required
                             type="text"
                             placeholder="e.g., Diaspora Tech Labs"
                             value={enquiryForm.orgName}
                             onChange={(e) => setEnquiryForm({ ...enquiryForm, orgName: e.target.value })}
                             className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-tatt-lime transition-all placeholder:text-white/20"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="block text-[10px] uppercase tracking-widest font-black text-tatt-gray mb-1.5">Contact Person Name *</label>
                       <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                          <input 
                             required
                             type="text"
                             placeholder="e.g., Jane Doe"
                             value={enquiryForm.contactName}
                             onChange={(e) => setEnquiryForm({ ...enquiryForm, contactName: e.target.value })}
                             className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-tatt-lime transition-all placeholder:text-white/20"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] uppercase tracking-widest font-black text-tatt-gray mb-1.5">Contact Email *</label>
                       <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                          <input 
                             required
                             type="email"
                             placeholder="jane@organisation.org"
                             value={enquiryForm.email}
                             onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                             className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-tatt-lime transition-all placeholder:text-white/20"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="block text-[10px] uppercase tracking-widest font-black text-tatt-gray mb-1.5">Phone / WhatsApp (Optional)</label>
                       <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                          <input 
                             type="text"
                             placeholder="+1 (555) 000-0000"
                             value={enquiryForm.phone}
                             onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                             className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-tatt-lime transition-all placeholder:text-white/20"
                          />
                       </div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-tatt-gray mb-1.5">Partnership Proposal & Value Offered *</label>
                    <textarea 
                       required
                       rows={4}
                       placeholder="Briefly describe your organisation, proposed partnership offer, and value for TATT members..."
                       value={enquiryForm.details}
                       onChange={(e) => setEnquiryForm({ ...enquiryForm, details: e.target.value })}
                       className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none focus:border-tatt-lime transition-all placeholder:text-white/20 custom-scrollbar"
                    />
                 </div>

                 <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                       type="button"
                       onClick={() => setShowEnquiryForm(false)}
                       className="px-5 py-3 text-xs font-black uppercase tracking-widest text-tatt-gray hover:text-white transition-colors cursor-pointer active:scale-95"
                    >
                       Cancel
                    </button>
                    <button
                       type="submit"
                       disabled={submittingEnquiry}
                       className="inline-flex items-center gap-2 bg-tatt-lime text-tatt-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] hover:brightness-105 transition-all shadow-lg shadow-tatt-lime/20 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       {submittingEnquiry ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                       {submittingEnquiry ? "Submitting..." : "Submit Enquiry"}
                    </button>
                 </div>
              </form>
           </div>
         )}

         {enquirySubmitted && (
           <div className="relative z-10 max-w-xl mx-auto space-y-6 text-center animate-in zoom-in-95 duration-500 py-4">
              <div className="size-16 bg-tatt-lime/20 text-tatt-lime rounded-full flex items-center justify-center mx-auto border border-tatt-lime/40">
                 <CheckCircle2 size={36} />
              </div>
              <h3 className="text-3xl font-black italic tracking-tight">Partnership Enquiry Received!</h3>
              <p className="text-tatt-gray-light font-medium tracking-tight leading-relaxed">
                Thank you for your interest in partnering with TATT. Our Partnerships Team has received your details and will review your proposal shortly.
              </p>
              <button 
                onClick={() => {
                   setEnquirySubmitted(false);
                   setShowEnquiryForm(false);
                   setEnquiryForm({
                      orgName: "",
                      contactName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "",
                      email: user?.email || "",
                      phone: "",
                      details: ""
                   });
                }}
                className="bg-tatt-lime text-tatt-black px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-105 transition-all cursor-pointer active:scale-95 shadow-md shadow-tatt-lime/20"
              >
                Done
              </button>
           </div>
         )}
      </div>
    </div>
  );
}
