"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { 
  X, Upload, Loader2, Check, ArrowRight, ArrowLeft, 
  Building2, Briefcase, MapPin, Globe, DollarSign, 
  Target, GraduationCap, Info, FileText 
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const CATEGORIES = ["Green Energy", "FinTech", "Sustainability", "Policy & Govt", "AgriTech", "Education", "Healthcare", "E-commerce", "Other"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];

export default function JobPostPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "Green Energy",
    type: "Full-time",
    location: "",
    description: "",
    requirements: "",
    qualifications: "",
    companyName: "",
    companyWebsite: "",
    companyLogoUrl: "",
    salaryLabel: "",
    salaryMin: "",
    salaryMax: "",
  });

  // PRE-FILL BUSINESS DETAILS IF KIONGOZI
  useEffect(() => {
    if (user && user.communityTier === "KIONGOZI") {
      const userIndustryName = user.industry?.name;
      const matchedCategory = CATEGORIES.find(c => c === userIndustryName);

      setFormData(prev => ({
        ...prev,
        companyName: user.businessName || prev.companyName,
        companyWebsite: user.businessProfileLink || prev.companyWebsite,
        category: matchedCategory || prev.category,
      }));
    }
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-tatt-lime" /></div>;
  if (!user || user.communityTier !== "KIONGOZI") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="size-20 rounded-3xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime mb-6">
          <Briefcase className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4 tracking-tight">Kiongozi Access Only</h1>
        <p className="text-tatt-gray max-w-md mb-8 font-medium">
          Job posting is exclusive to Kiongozi members. Upgrade your membership to unlock this feature and connect with our talent pool.
        </p>
        <Link 
          href="/dashboard/membership"
          className="px-8 py-3.5 bg-tatt-lime text-tatt-black font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-tatt-lime/20 hover:scale-[1.02] transition-all"
        >
          View Membership Plans
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const body = new FormData();
    body.append("files", file);

    try {
      const { data } = await api.post<{ urls: string[] }>("/uploads/media", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.urls?.[0]) {
        setFormData(prev => ({ ...prev, companyLogoUrl: data.urls[0] || "" }));
        toast.success("Logo uploaded successfully");
      }
    } catch (err) {
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const validateStep1 = () => !!(formData.companyName);
  const validateStep2 = () => !!(formData.title && formData.location && formData.description);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
      };
      
      await api.post("/jobs", payload);
      toast.success("Job listing created successfully!");
      router.push("/dashboard/jobs");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <Link href="/dashboard/jobs" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray hover:text-tatt-lime transition-colors mb-4 group">
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Back to Board
            </Link>
            <h1 className="text-4xl font-black text-foreground tracking-tight">Post a New Opportunity</h1>
            <p className="text-tatt-gray mt-2 font-medium">Reach the Savanna Onyx community of high-impact professionals.</p>
          </div>
          
          <div className="hidden sm:flex gap-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center text-xs font-black transition-all border ${
                  step === s 
                    ? "bg-tatt-lime text-tatt-black border-tatt-lime shadow-lg shadow-tatt-lime/20" 
                    : step > s 
                      ? "bg-foreground text-background border-foreground" 
                      : "bg-background text-tatt-gray border-border"
                }`}>
                  {step > s ? <Check className="size-5" /> : s}
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${step === s ? "text-tatt-lime" : "text-tatt-gray"}`}>
                    {s === 1 ? "Company" : s === 2 ? "Overview" : "Requirements"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Form */}
          <div className="lg:col-span-8">
            <div className="bg-surface rounded-[40px] border border-border/50 p-8 sm:p-12 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-12">
                
                {/* STEP 1: COMPANY INFO */}
                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="size-10 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black">1</div>
                      <h2 className="text-2xl font-black text-foreground tracking-tight">Tell us about the employer</h2>
                    </div>

                    <div className="space-y-8">
                      {/* Logo Upload */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 p-6 bg-background/50 rounded-3xl border border-border/30">
                        <div className="relative group">
                          <div className="size-24 rounded-[30px] bg-background border border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-tatt-lime/50">
                            {formData.companyLogoUrl ? (
                              <img src={formData.companyLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="size-10 text-tatt-gray/40" />
                            )}
                          </div>
                          <label className="absolute -right-2 -bottom-2 size-8 rounded-full bg-tatt-lime text-tatt-black flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all">
                            <Upload className="size-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                          </label>
                          {uploading && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-[30px] z-10 backdrop-blur-sm">
                              <Loader2 className="size-6 animate-spin text-tatt-lime" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-foreground mb-1">Entity Branding</h3>
                          <p className="text-xs text-tatt-gray font-medium mb-3">Square logos work best. Up to 2MB as JPG or PNG.</p>
                          {formData.companyLogoUrl && (
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({ ...prev, companyLogoUrl: "" }))}
                              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Company / Brand Name *</label>
                          <div className="relative">
                            <input
                              type="text" name="companyName" value={formData.companyName} onChange={handleChange} required
                              placeholder="e.g. Savanna Onyx"
                              className="w-full px-5 py-4 pl-12 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                            />
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-tatt-gray" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Industry Category *</label>
                          <div className="relative">
                            <select
                              name="category" value={formData.category} onChange={handleChange} required
                              className="w-full px-5 py-4 pl-12 rounded-2xl border border-border bg-background text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-tatt-gray" />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Professional Website</label>
                          <div className="relative">
                            <input
                              type="url" name="companyWebsite" value={formData.companyWebsite} onChange={handleChange}
                              placeholder="https://example.com"
                              className="w-full px-5 py-4 pl-12 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                            />
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-tatt-gray" />
                          </div>
                          <p className="text-[9px] text-tatt-gray mt-2 font-black uppercase tracking-widest opacity-60 ml-2">Verified businesses build 80% more trust</p>
                        </div>
                      </div>

                      <div className="pt-6">
                        <button
                          type="button" onClick={() => validateStep1() && setStep(2)}
                          disabled={!validateStep1()}
                          className="w-full py-5 bg-foreground text-background font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:brightness-95 disabled:opacity-40 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                          Continue to Overview <ArrowRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: JOB OVERVIEW */}
                {step === 2 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-10">
                      <button onClick={() => setStep(1)} className="p-2 -ml-2 hover:text-tatt-lime transition-colors"><ArrowLeft className="size-5" /></button>
                      <div className="size-10 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black">2</div>
                      <h2 className="text-2xl font-black text-foreground tracking-tight">The Core Details</h2>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Role Designation / Title *</label>
                        <div className="relative">
                          <input
                            type="text" name="title" value={formData.title} onChange={handleChange} required
                            placeholder="e.g. Lead Product Strategist"
                            className="w-full px-5 py-4 pl-12 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                          />
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-tatt-gray" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Employment Nature *</label>
                          <select
                            name="type" value={formData.type} onChange={handleChange} required
                            className="w-full px-5 py-4 rounded-2xl border border-border bg-background text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                          >
                            {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Primary Location *</label>
                          <div className="relative">
                            <input
                              type="text" name="location" value={formData.location} onChange={handleChange} required
                              placeholder="e.g. Remote / Lagos / Nairobi"
                              className="w-full px-5 py-4 pl-12 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                            />
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-tatt-gray" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Salary Visibility</label>
                          <input
                            type="text" name="salaryLabel" value={formData.salaryLabel} onChange={handleChange}
                            placeholder="e.g. Competitive / Negotiable"
                            className="w-full px-5 py-4 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Min Monthly ($)</label>
                          <input
                            type="number" name="salaryMin" value={formData.salaryMin} onChange={handleChange}
                            placeholder="e.g. 2000"
                            className="w-full px-5 py-4 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Max Monthly ($)</label>
                          <input
                            type="number" name="salaryMax" value={formData.salaryMax} onChange={handleChange}
                            placeholder="e.g. 5000"
                            className="w-full px-5 py-4 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Role Synopsis / Mission *</label>
                        <textarea
                          name="description" value={formData.description} onChange={handleChange} required
                          placeholder="Describe the impact of this role and the day-to-day operations..." rows={6}
                          className="w-full px-5 py-4 rounded-3xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium resize-none leading-relaxed"
                        />
                      </div>

                      <div className="pt-6">
                        <button
                          type="button" onClick={() => validateStep2() && setStep(3)}
                          disabled={!validateStep2()}
                          className="w-full py-5 bg-foreground text-background font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:brightness-95 disabled:opacity-40 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                          Requirements & Submit <ArrowRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: REQUIREMENTS & SUBMIT */}
                {step === 3 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-10">
                      <button onClick={() => setStep(2)} className="p-2 -ml-2 hover:text-tatt-lime transition-colors"><ArrowLeft className="size-5" /></button>
                      <div className="size-10 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black">3</div>
                      <h2 className="text-2xl font-black text-foreground tracking-tight">Final Requirements</h2>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Key Performance Indicators / Requirements</label>
                        <textarea
                          name="requirements" value={formData.requirements} onChange={handleChange}
                          placeholder="List essential skills, tools, or metrics for success..." rows={6}
                          className="w-full px-5 py-4 rounded-3xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium resize-none leading-relaxed"
                        />
                        <p className="text-[9px] text-tatt-gray mt-2 font-black uppercase tracking-widest opacity-60 ml-2">Tip: Use bullet points for better readability</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Preferred Qualifications</label>
                        <textarea
                          name="qualifications" value={formData.qualifications} onChange={handleChange}
                          placeholder="Academic records, certificates, or years of verified experience..." rows={4}
                          className="w-full px-5 py-4 rounded-3xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium resize-none leading-relaxed italic"
                        />
                      </div>

                      <div className="p-8 bg-tatt-lime/5 rounded-[32px] border border-tatt-lime/20 relative overflow-hidden group">
                        <div className="relative z-10">
                          <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-lime mb-4">
                            <span className="size-2 bg-tatt-lime rounded-full animate-pulse"></span> Instant Launch
                          </h4>
                          <p className="text-foreground text-sm font-bold leading-relaxed max-w-lg mb-6">
                            Your opportunity will be visible to thousands of verified Savanna Onyx professionals immediately upon submission.
                          </p>
                          <button
                            type="submit" disabled={loading}
                            className="w-full py-5 bg-tatt-lime text-tatt-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-tatt-lime/30 hover:brightness-105 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                          >
                            {loading ? <Loader2 className="size-5 animate-spin" /> : "Verify & Finalize Post"}
                          </button>
                        </div>
                        <div className="absolute right-0 top-0 p-4 opacity-5 translate-x-1/4 -translate-y-1/4 group-hover:rotate-12 transition-transform duration-700">
                          <Check className="size-48" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Sidebar / Preview */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-8 space-y-8">
              {/* Preview Card */}
              <div className="bg-surface rounded-3xl border border-border p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 font-black text-[8px] uppercase tracking-widest">Live Preview</div>
                
                <div className="flex items-start justify-between mb-6">
                  <div className="size-14 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black text-lg border border-tatt-lime/10">
                    {formData.companyLogoUrl ? (
                      <img src={formData.companyLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      (formData.companyName || "C").charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="px-3 py-1 bg-background border border-border rounded-full text-[8px] font-black uppercase tracking-wider text-tatt-gray">{formData.type}</span>
                </div>

                <h3 className="text-lg font-black text-foreground mb-1 leading-tight group-hover:text-tatt-lime transition-colors">
                  {formData.title || "Target Role Title"}
                </h3>
                <p className="text-tatt-gray text-xs font-bold mb-4 italic">{formData.companyName || "Organization Brand"}</p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-tatt-gray bg-background px-3 py-1.5 rounded-xl border border-border">
                    <MapPin className="size-2.5" /> {formData.location || "Location"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-tatt-gray bg-background px-3 py-1.5 rounded-xl border border-border">
                    <Briefcase className="size-2.5" /> {formData.category}
                  </span>
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between">
                  <p className="text-[10px] font-black text-tatt-lime uppercase tracking-widest">
                    {formData.salaryLabel || (formData.salaryMin ? `$${formData.salaryMin} - $${formData.salaryMax}` : "Competitive")}
                  </p>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <ArrowRight className="size-3 text-tatt-gray" />
                  </div>
                </div>
              </div>

              {/* Guidance */}
              <div className="bg-background rounded-3xl border border-border p-8">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-6">
                  <Info className="size-4 text-tatt-lime" /> Pro Tips
                </h4>
                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <div className="size-5 rounded-md bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black text-[10px] shrink-0">1</div>
                    <p className="text-xs text-tatt-gray font-medium leading-relaxed">Include clear KPIs in your description to attract high-performance candidates.</p>
                  </li>
                  <li className="flex gap-4">
                    <div className="size-5 rounded-md bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black text-[10px] shrink-0">2</div>
                    <p className="text-xs text-tatt-gray font-medium leading-relaxed">Add a company website to increase application quality by 45%.</p>
                  </li>
                  <li className="flex gap-4">
                    <div className="size-5 rounded-md bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black text-[10px] shrink-0">3</div>
                    <p className="text-xs text-tatt-gray font-medium leading-relaxed">Kiongozi posts receive a <strong>Verified Spotlight</strong> badge on the board.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
