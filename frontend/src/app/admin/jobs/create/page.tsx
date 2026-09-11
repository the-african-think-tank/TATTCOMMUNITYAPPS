"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import toast from "react-hot-toast";
import {
    ArrowLeft, Briefcase, Building2, FileText, CheckSquare,
    Loader2, Send, TrendingUp, Lightbulb, BarChart3,
    Globe, DollarSign,
} from "lucide-react";
import { JOB_CATEGORIES } from "@/types/jobs";

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [...JOB_CATEGORIES];

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Seasonal", "Internship"];

const LOCATION_TYPES = ["Remote", "On-site", "Hybrid"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
    // Company
    companyName: string;
    companyWebsite: string;
    category: string;
    companyDescription: string;
    // Job
    title: string;
    type: string;
    locationType: string;
    locationChapter: string;
    salaryMin: string;
    salaryMax: string;
    salaryLabel: string;
    // Content
    description: string;
    requirements: string;
    qualifications: string;
}

const EMPTY_FORM: FormState = {
    companyName: "",
    companyWebsite: "",
    category: "Technology",
    companyDescription: "",
    title: "",
    type: "Full-time",
    locationType: "Remote",
    locationChapter: "",
    salaryMin: "",
    salaryMax: "",
    salaryLabel: "",
    description: "",
    requirements: "",
    qualifications: "",
};

// ── Reusable sub-components ────────────────────────────────────────────────────

function SectionHead({ icon, num, label }: { icon: React.ReactNode; num: string; label: string }) {
    return (
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
            <div className="size-8 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime border border-tatt-lime/20">
                {icon}
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tatt-lime">{num}</p>
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{label}</h3>
            </div>
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">
            {children}
        </label>
    );
}

const fieldCls = "w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-tatt-gray focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCreateJobPage() {
    const router = useRouter();
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [chapters, setChapters] = useState<any[]>([]);

    useEffect(() => {
        api.get("/chapters").then(res => setChapters(res.data)).catch(() => {});
    }, []);

    const upd = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

    const buildPayload = () => {
        const locationStr = form.locationType === "Remote" 
            ? "Remote (Global)" 
            : `${form.locationType} (${form.locationChapter || "TATT Global Office"})`;
        // Build a human-readable salary label if not explicitly set
        let salaryLabel = form.salaryLabel.trim();
        if (!salaryLabel && (form.salaryMin || form.salaryMax)) {
            salaryLabel = form.salaryMin && form.salaryMax
                ? `$${Number(form.salaryMin).toLocaleString()} – $${Number(form.salaryMax).toLocaleString()} / yr`
                : form.salaryMin
                    ? `From $${Number(form.salaryMin).toLocaleString()} / yr`
                    : `Up to $${Number(form.salaryMax).toLocaleString()} / yr`;
        }

        // Merge company description into job description if both present
        const fullDescription = [
            form.companyDescription.trim()
                ? `**About ${form.companyName || "the Company"}**\n${form.companyDescription.trim()}`
                : null,
            form.description.trim() ? form.description.trim() : null,
        ].filter(Boolean).join("\n\n");

        return {
            title: form.title.trim(),
            companyName: form.companyName.trim(),
            location: locationStr,
            type: form.type,
            category: form.category,
            description: fullDescription || undefined,
            requirements: form.requirements.trim() || undefined,
            qualifications: form.qualifications.trim() || undefined,
            companyWebsite: form.companyWebsite.trim() || undefined,
            salaryLabel: salaryLabel || undefined,
            salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
            salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        };
    };

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { toast.error("Job title is required."); return; }
        if (!form.companyName.trim()) { toast.error("Company name is required."); return; }
        setLoading(true);
        try {
            await api.post("/admin/jobs", buildPayload());
            toast.success("Job listing published successfully!");
            router.push("/admin/jobs");
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to publish listing.");
        } finally {
            setLoading(false);
        }
    };

    const completeness = (() => {
        const fields = [form.title, form.companyName, form.locationType, form.type, form.category, form.description];
        return Math.round((fields.filter(f => f.trim() !== "").length / fields.length) * 100);
    })();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Sticky top bar */}
            <div className="sticky top-0 z-30 bg-surface border-b border-border px-4 sm:px-8 h-14 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/admin/jobs"
                        className="flex items-center gap-2 text-tatt-gray hover:text-foreground transition-colors text-sm font-medium">
                        <ArrowLeft className="size-4" /> Jobs Center
                    </Link>
                    <span className="text-border">·</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-tatt-lime">Create Job Opportunity</span>
                </div>
                <button
                    form="create-job-form"
                    type="submit"
                    disabled={loading}
                    className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-tatt-lime text-black font-black text-[10px] uppercase tracking-widest hover:brightness-95 disabled:opacity-60 transition-all"
                >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Publish Posting
                </button>
            </div>

            {/* Page heading */}
            <div className="px-4 sm:px-8 pt-8 pb-4">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tatt-lime mb-1">Admin / Jobs / Create</p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase">Create Job Opportunity</h1>
                <p className="text-tatt-gray text-sm mt-1 max-w-xl">
                    Define the requirements for a new placement. Published listings are immediately visible to all verified TATT members.
                </p>
            </div>

            <form id="create-job-form" onSubmit={handlePublish} className="px-4 sm:px-8 pb-20">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-6">

                    {/* ── LEFT COLUMN ─────────────────────────────────────── */}
                    <div className="xl:col-span-2 space-y-6">

                        {/* Section 1 — Company */}
                        <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
                            <SectionHead icon={<Building2 className="size-4" />} num="01" label="Hiring Company Information" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="sm:col-span-1">
                                    <FieldLabel>Company Name *</FieldLabel>
                                    <input
                                        type="text" required value={form.companyName}
                                        onChange={e => upd("companyName", e.target.value)}
                                        placeholder="e.g. AfroTech Dynamics"
                                        className={fieldCls}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <FieldLabel>Company Website</FieldLabel>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray pointer-events-none" />
                                        <input
                                            type="url" value={form.companyWebsite}
                                            onChange={e => upd("companyWebsite", e.target.value)}
                                            placeholder="https://company.com"
                                            className={`${fieldCls} pl-10`}
                                        />
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <FieldLabel>Industry / Category *</FieldLabel>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat} type="button"
                                                onClick={() => upd("category", cat)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                    form.category === cat
                                                        ? "bg-tatt-lime text-black border-tatt-lime shadow-sm"
                                                        : "bg-background border-border text-tatt-gray hover:border-tatt-lime"
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <FieldLabel>Company Description</FieldLabel>
                                    <textarea
                                        rows={3} value={form.companyDescription}
                                        onChange={e => upd("companyDescription", e.target.value)}
                                        placeholder="Briefly describe the company mission, culture, and values..."
                                        className={`${fieldCls} resize-none`}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Section 2 — Job Details */}
                        <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
                            <SectionHead icon={<Briefcase className="size-4" />} num="02" label="Job Opportunity Details" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="sm:col-span-2">
                                    <FieldLabel>Job Title *</FieldLabel>
                                    <input
                                        type="text" required value={form.title}
                                        onChange={e => upd("title", e.target.value)}
                                        placeholder="e.g. Senior Policy Analyst"
                                        className={`${fieldCls} text-base font-bold`}
                                    />
                                </div>

                                <div>
                                    <FieldLabel>Role Type *</FieldLabel>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {JOB_TYPES.map(t => (
                                            <button
                                                key={t} type="button"
                                                onClick={() => upd("type", t)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                    form.type === t
                                                        ? "bg-tatt-lime text-black border-tatt-lime shadow-sm"
                                                        : "bg-background border-border text-tatt-gray hover:border-tatt-lime"
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Location Mode *</FieldLabel>
                                    <div className="flex flex-col gap-3">
                                        <select
                                            value={form.locationType}
                                            onChange={e => upd("locationType", e.target.value)}
                                            className={fieldCls}
                                        >
                                            {LOCATION_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                        
                                        {form.locationType !== "Remote" && (
                                            <select
                                                value={form.locationChapter}
                                                onChange={e => upd("locationChapter", e.target.value)}
                                                className={`${fieldCls} border-tatt-lime/30 bg-tatt-lime/5`}
                                                required
                                            >
                                                <option value="">Select Target Chapter / Office...</option>
                                                {chapters.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name} ({c.code || "TATT"})</option>
                                                ))}
                                                <option value="TATT Global Office">TATT Global Office (Accra, Ghana)</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <FieldLabel>Salary Range (Annual USD)</FieldLabel>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray text-xs font-bold select-none">$</span>
                                            <input
                                                type="number" min={0} value={form.salaryMin}
                                                onChange={e => upd("salaryMin", e.target.value)}
                                                placeholder="Min"
                                                className={`${fieldCls} pl-7`}
                                            />
                                        </div>
                                        <span className="text-tatt-gray font-black text-sm">—</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray text-xs font-bold select-none">$</span>
                                            <input
                                                type="number" min={0} value={form.salaryMax}
                                                onChange={e => upd("salaryMax", e.target.value)}
                                                placeholder="Max"
                                                className={`${fieldCls} pl-7`}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-tatt-gray mt-1.5">
                                        Or enter a custom label below (e.g. "Competitive", "$80K–$100K / yr")
                                    </p>
                                    <input
                                        type="text" value={form.salaryLabel}
                                        onChange={e => upd("salaryLabel", e.target.value)}
                                        placeholder="Custom salary label (overrides range if set)"
                                        className={`${fieldCls} mt-2 text-xs`}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Section 3 — Requirements */}
                        <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
                            <SectionHead icon={<FileText className="size-4" />} num="03" label="Requirements & Responsibilities" />
                            <div className="space-y-6">
                                <div>
                                    <FieldLabel>Detailed Job Description</FieldLabel>
                                    <textarea
                                        rows={8} value={form.description}
                                        onChange={e => upd("description", e.target.value)}
                                        placeholder="Outline the primary purpose of this role, main responsibilities, and day-to-day duties..."
                                        className={`${fieldCls} resize-none leading-relaxed`}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Key Requirements <span className="text-tatt-gray font-light normal-case tracking-normal">(one per line)</span></FieldLabel>
                                    <textarea
                                        rows={5} value={form.requirements}
                                        onChange={e => upd("requirements", e.target.value)}
                                        placeholder={"- 5+ years experience in cloud infrastructure\n- Mastery of Python or TypeScript\n- Experience with Pan-African data regulation"}
                                        className={`${fieldCls} resize-none font-mono text-xs`}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Desired Qualifications <span className="text-tatt-gray font-light normal-case tracking-normal">(optional)</span></FieldLabel>
                                    <textarea
                                        rows={3} value={form.qualifications}
                                        onChange={e => upd("qualifications", e.target.value)}
                                        placeholder="Additional certifications, soft skills, or nice-to-have experience..."
                                        className={`${fieldCls} resize-none`}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
                    <div className="space-y-5">

                        {/* Action card — sticky */}
                        <div className="sticky top-20 space-y-5">
                            <div className="bg-tatt-black rounded-2xl p-7">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tatt-lime/70 mb-1">Final Review</p>
                                <h4 className="text-white text-lg font-black leading-tight">Ready to Publish?</h4>
                                <p className="text-white/50 text-xs mt-2 leading-relaxed">
                                    Published roles are immediately visible to all verified TATT members with access to the Job Board.
                                </p>

                                {/* Completeness bar */}
                                <div className="mt-5 mb-6">
                                    <div className="flex justify-between mb-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Form Completeness</span>
                                        <span className={`text-[9px] font-black ${completeness === 100 ? "text-tatt-lime" : "text-white/60"}`}>{completeness}%</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-tatt-lime rounded-full transition-all"
                                            style={{ width: `${completeness}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        type="submit" form="create-job-form" disabled={loading}
                                        className="w-full bg-tatt-lime text-black py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.99] transition-all disabled:opacity-60"
                                    >
                                        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                        Publish Job Posting
                                    </button>
                                    <Link href="/admin/jobs"
                                        className="w-full bg-white/5 text-white/80 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.99] transition-all"
                                    >
                                        Cancel
                                    </Link>
                                </div>

                                <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Visibility</span>
                                        <span className="text-white text-[10px] font-black uppercase px-2 py-1 bg-white/10 rounded-lg">Public</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Posting Fee</span>
                                        <span className="text-white text-[10px] font-black">$0.00 (Admin)</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Alert Triggers</span>
                                        <span className="text-tatt-lime text-[10px] font-black">Auto ✓</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tip card */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-tatt-lime/5 border border-tatt-lime/20 rounded-2xl p-4 flex flex-col gap-3">
                                    <Lightbulb className="size-5 text-tatt-lime" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-tatt-lime">Pro Tip</p>
                                    <p className="text-[10px] leading-snug text-tatt-gray">
                                        Adding a salary range increases applicant quality by <strong>45%</strong> on this platform.
                                    </p>
                                </div>
                                <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
                                    <BarChart3 className="size-5 text-tatt-gray" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-tatt-gray">Reach</p>
                                    <p className="text-[10px] leading-snug text-tatt-gray">
                                        Estimated <strong className="text-foreground">2,400+</strong> qualified professionals in your category.
                                    </p>
                                </div>
                            </div>

                            {/* Mobile publish button */}
                            <div className="xl:hidden">
                                <button
                                    type="submit" form="create-job-form" disabled={loading}
                                    className="w-full py-4 rounded-xl bg-tatt-lime text-black font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-60 transition-all"
                                >
                                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    Publish Job Posting
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
