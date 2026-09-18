"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/services/api";
import {
    Loader2,
    CheckCircle2,
    Brain,
    CalendarDays,
    FileEdit,
    MapPin,
    Info,
    Plus,
    X,
    Check,
    Phone,
    UserCircle,
} from "lucide-react";
import type { ApplyVolunteerPayload } from "@/types/volunteers";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
    friday: "Fri", saturday: "Sat", sunday: "Sun",
};
const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;
type TimeSlot = typeof TIME_SLOTS[number];

const SKILL_OPTIONS = [
    "Mentoring", "Event Coordination", "Tech Support", "Graphic Design",
    "Social Media", "Public Speaking", "Research", "Community Outreach",
    "Fundraising", "Grant Writing", "Translation", "Legal Aid",
];

interface Chapter { id: string; name: string; code: string; }

type VolunteerApplyFormProps = {
    roleId?: string | undefined;
    onSuccess?: (() => void) | undefined;
    compact?: boolean | undefined;
};

// Track active cells: Record<day, Set<TimeSlot>>
type AvailGrid = Record<string, Set<TimeSlot>>;

function gridToApiFormat(grid: AvailGrid): Record<string, string[]> {
    const TIME_RANGES: Record<TimeSlot, string> = {
        Morning: "09:00-12:00",
        Afternoon: "12:00-17:00",
        Evening: "17:00-21:00",
    };
    const result: Record<string, string[]> = {};
    for (const day of DAYS) {
        const slots = Array.from(grid[day] || []).map((s) => TIME_RANGES[s]);
        if (slots.length > 0) result[day] = slots;
    }
    return result;
}

function gridHasAny(grid: AvailGrid) {
    return DAYS.some((d) => (grid[d]?.size ?? 0) > 0);
}

export function VolunteerApplyForm({ roleId, onSuccess, compact = false }: VolunteerApplyFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);

    // Skill chips
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [customSkill, setCustomSkill] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Availability grid
    const [availGrid, setAvailGrid] = useState<AvailGrid>(
        DAYS.reduce((acc, d) => ({ ...acc, [d]: new Set<TimeSlot>() }), {} as AvailGrid)
    );

    // Chapter
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedChapterId, setSelectedChapterId] = useState("");

    // Statement
    const [reasonForApplying, setReasonForApplying] = useState("");
    const [questionsForAdmin, setQuestionsForAdmin] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [birthDate, setBirthDate] = useState("");

    // Role Details (if applicable)
    const [role, setRole] = useState<any>(null);
    const [roleLoading, setRoleLoading] = useState(false);

    // Completion %
    const completion = Math.min(
        100,
        Math.round(
            (selectedSkills.length > 0 ? 25 : 0) +
            (gridHasAny(availGrid) ? 25 : 0) +
            (reasonForApplying.trim().length >= 30 ? 35 : Math.round((reasonForApplying.trim().length / 30) * 35)) +
            (agreed ? 15 : 0)
        )
    );

    useEffect(() => {
        api.get("/chapters").then((r) => setChapters(r.data)).catch(() => {});
        
        if (roleId) {
            setRoleLoading(true);
            api.get(`/volunteers/roles/${roleId}`)
                .then((r) => {
                    setRole(r.data);
                    if (r.data.chapterId) setSelectedChapterId(r.data.chapterId);
                })
                .catch(() => {})
                .finally(() => setRoleLoading(false));
        }
    }, [roleId]);

    const toggleSkill = (skill: string) => {
        setSelectedSkills((prev) =>
            prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
        );
    };

    const addCustomSkill = () => {
        const trimmed = customSkill.trim();
        if (trimmed && !selectedSkills.includes(trimmed)) {
            setSelectedSkills((prev) => [...prev, trimmed]);
        }
        setCustomSkill("");
        setShowCustomInput(false);
    };

    const toggleCell = (day: string, slot: TimeSlot) => {
        setAvailGrid((prev) => {
            const currentSet = prev[day] || new Set<TimeSlot>();
            const nextSet = new Set(currentSet);
            if (nextSet.has(slot)) nextSet.delete(slot);
            else nextSet.add(slot);
            return { ...prev, [day]: nextSet };
        });
    };

    const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSkills.length === 0) { setError("Please select at least one skill."); return; }
        if (!gridHasAny(availGrid)) { setError("Please select at least one availability slot."); return; }
        if (!agreed) { setError("Please agree to the Volunteer Conduct Agreement."); return; }

        setSubmitting(true);
        setError(null);
        try {
            const payload: ApplyVolunteerPayload = {
                roleId: roleId || undefined,
                interestsAndSkills: selectedSkills,
                weeklyAvailability: gridToApiFormat(availGrid),
                hoursAvailablePerWeek: Object.values(gridToApiFormat(availGrid)).flat().length * 4,
                reasonForApplying,
                questionsForAdmin: questionsForAdmin.trim() || undefined,
                phoneNumber: phoneNumber.trim() || undefined,
                birthDate: birthDate || undefined,
            };
            await api.post("/volunteers/apply", payload);
            setSuccess(true);
            onSuccess?.();
        } catch (err: unknown) {
            const res = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response
                : undefined;
            setError(res?.data?.message || "Failed to submit application. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="p-8 rounded-2xl bg-tatt-lime/10 border border-tatt-lime/30 text-center">
                <div className="size-16 rounded-full bg-tatt-lime/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-8 w-8 text-tatt-lime" />
                </div>
                <h3 className="text-xl font-black text-foreground mb-2">Application Submitted!</h3>
                <p className="text-tatt-gray text-sm">
                    Thank you! We&apos;ll review your application and get back to you soon. You can track your application status on the Volunteers page.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-0">
            {/* Page header */}
            <div className="mb-8 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
                    {role ? (
                        <>Applying for <span className="text-tatt-lime italic uppercase tracking-tighter">{role.name}</span></>
                    ) : (
                        "Join the TATT-U Volunteer Network"
                    )}
                </h2>
                <p className="text-tatt-gray text-sm max-w-lg">
                    {role 
                        ? `You are applying for a strategic role within the ${role.chapter?.name || 'Global'} hub. Please provide your details below.`
                        : "Empower your community. Complete the details below to begin your journey with our global movement."
                    }
                </p>
                
                {role && (
                    <div className="mt-4 p-4 rounded-2xl bg-surface border border-border flex items-center gap-4 animate-in slide-in-from-left duration-500">
                        <div className="size-12 rounded-xl bg-tatt-lime flex items-center justify-center text-tatt-black">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-tatt-gray tracking-widest">{role.location}</p>
                            <p className="text-xs font-bold text-foreground">{role.weeklyHours}h/wk Commitment Required</p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-3">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* ── Left / main column ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Interests & Skills */}
                    <section className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="size-9 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0">
                                <Brain className="h-5 w-5" />
                            </span>
                            <h3 className="text-base font-bold text-foreground">Interests &amp; Skills</h3>
                        </div>
                        <p className="text-sm text-tatt-gray mb-4">Select areas where you can contribute your expertise.</p>
                        <div className="flex flex-wrap gap-2">
                            {SKILL_OPTIONS.map((skill) => {
                                const active = selectedSkills.includes(skill);
                                return (
                                    <button
                                        type="button"
                                        key={skill}
                                        onClick={() => toggleSkill(skill)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all cursor-pointer
                                            ${active
                                                ? "border-tatt-lime bg-tatt-lime/10 text-tatt-lime-dark"
                                                : "border-border text-tatt-gray hover:border-tatt-lime/50 hover:text-foreground"
                                            }`}
                                    >
                                        {active && <Check className="h-3 w-3" />}
                                        {skill}
                                    </button>
                                );
                            })}
                            {/* Custom skills already added */}
                            {selectedSkills.filter(s => !SKILL_OPTIONS.includes(s)).map((skill) => (
                                <button
                                    type="button"
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border border-tatt-lime bg-tatt-lime/10 text-tatt-lime-dark cursor-pointer"
                                >
                                    <Check className="h-3 w-3" /> {skill}
                                    <X className="h-3 w-3 ml-0.5" />
                                </button>
                            ))}
                            {/* Add custom */}
                            {showCustomInput ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={customSkill}
                                        onChange={(e) => setCustomSkill(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } if (e.key === "Escape") { setShowCustomInput(false); } }}
                                        placeholder="Custom skill..."
                                        className="px-3 py-1.5 rounded-full text-sm border border-tatt-lime bg-background text-foreground focus:outline-none w-32"
                                    />
                                    <button type="button" onClick={addCustomSkill} className="text-tatt-lime hover:text-tatt-lime-dark">
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => setShowCustomInput(false)} className="text-tatt-gray hover:text-foreground">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowCustomInput(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-tatt-lime/40 bg-tatt-lime/5 text-tatt-lime-dark hover:border-tatt-lime/70 cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Custom
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Contact & Personal details */}
                    <section className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="size-9 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0">
                                <UserCircle className="h-5 w-5" />
                            </span>
                            <h3 className="text-base font-bold text-foreground">Personal Details</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-tatt-gray" /> Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. +233 24 123 4567"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Date of Birth</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Availability Grid */}
                    <section className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="size-9 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0">
                                <CalendarDays className="h-5 w-5" />
                            </span>
                            <h3 className="text-base font-bold text-foreground">Your Availability</h3>
                        </div>
                        <div className="overflow-x-auto -mx-2 px-2">
                            <table className="w-full border-collapse min-w-[480px]">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-[10px] text-tatt-gray uppercase font-bold text-left w-20">Slot</th>
                                        {DAYS.map((d) => (
                                            <th key={d} className="p-2 text-[10px] text-tatt-gray uppercase font-bold text-center">{DAY_SHORT[d]}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {TIME_SLOTS.map((slot) => (
                                        <tr key={slot} className="border-t border-border/50">
                                            <td className="p-2 text-xs font-bold text-tatt-gray">{slot}</td>
                                            {DAYS.map((day) => {
                                                const active = availGrid[day]?.has(slot);
                                                return (
                                                    <td key={day} className="p-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCell(day, slot)}
                                                            className={`w-full h-8 rounded-lg transition-all cursor-pointer
                                                                ${active
                                                                    ? "bg-tatt-lime shadow-sm"
                                                                    : "bg-background border border-border hover:border-tatt-lime/40 hover:bg-tatt-lime/5"
                                                                }`}
                                                            aria-label={`${day} ${slot} ${active ? "selected" : "not selected"}`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-[11px] text-tatt-gray italic flex items-center gap-1">
                            <Info className="h-3 w-3 shrink-0" />
                            Click a slot to toggle your availability. All times in your local timezone.
                        </p>
                    </section>

                    {/* Statement of Intent */}
                    <section className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="size-9 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0">
                                <FileEdit className="h-5 w-5" />
                            </span>
                            <h3 className="text-base font-bold text-foreground">Why join TATT-U?</h3>
                        </div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Tell us about your motivation and what you hope to achieve.
                        </label>
                        <textarea
                            value={reasonForApplying}
                            onChange={(e) => setReasonForApplying(e.target.value)}
                            placeholder="I want to join the network because..."
                            rows={5}
                            required
                            className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-tatt-gray focus:ring-2 focus:ring-tatt-lime focus:border-transparent outline-none resize-none transition-all"
                        />
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Questions for admin <span className="text-tatt-gray font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={questionsForAdmin}
                                onChange={(e) => setQuestionsForAdmin(e.target.value)}
                                placeholder="Any questions about the role or process?"
                                rows={2}
                                className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-tatt-gray focus:ring-2 focus:ring-tatt-lime focus:border-transparent outline-none resize-none transition-all"
                            />
                        </div>
                        <div className="mt-5 flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="tatt-terms"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-border accent-tatt-lime shrink-0"
                            />
                            <label htmlFor="tatt-terms" className="text-xs text-tatt-gray leading-relaxed cursor-pointer">
                                I agree to the TATT-U Volunteer Conduct Agreement and Privacy Policy. I understand my application will be reviewed by regional leads.
                            </label>
                        </div>
                    </section>

                    {/* Action bar */}
                    <div className="flex items-center justify-end gap-4 pb-4">
                        <button
                            type="button"
                            onClick={() => onSuccess?.()}
                            className="px-5 py-3 text-sm font-bold text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 bg-tatt-lime text-tatt-black font-black text-sm uppercase tracking-widest rounded-xl shadow-md hover:brightness-105 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? "Submitting..." : "Submit Application"}
                        </button>
                    </div>
                </div>

                {/* ── Right sidebar ── */}
                <div className="space-y-5">
                    {/* Chapter selector */}
                    <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm sticky top-6">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="size-9 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0">
                                <MapPin className="h-5 w-5" />
                            </span>
                            <h3 className="text-base font-bold text-foreground">Chapter</h3>
                        </div>

                        <label className="block text-[11px] font-bold uppercase text-tatt-gray tracking-wider mb-2">Primary Chapter</label>
                        <div className="relative">
                            <select
                                value={selectedChapterId}
                                onChange={(e) => setSelectedChapterId(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 pr-8 text-sm text-foreground appearance-none focus:ring-2 focus:ring-tatt-lime outline-none cursor-pointer"
                            >
                                <option value="">Select a chapter...</option>
                                {chapters.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedChapter && (
                            <div className="mt-3 p-3 bg-tatt-lime/5 rounded-xl border border-tatt-lime/20">
                                <p className="text-xs font-semibold text-foreground leading-relaxed">
                                    You are applying for the{" "}
                                    <span className="text-tatt-lime-dark font-bold">{selectedChapter.name}</span> chapter.
                                    Local events and physical volunteering opportunities will be based here.
                                </p>
                            </div>
                        )}

                        <hr className="my-5 border-border" />

                        {/* Completion */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-foreground">Application Status</h4>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-tatt-gray">Completion</span>
                                <span className="font-black text-foreground">{completion}%</span>
                            </div>
                            <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-tatt-lime h-full rounded-full transition-all duration-500"
                                    style={{ width: `${completion}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="h-4 w-4 text-tatt-lime shrink-0 mt-0.5" />
                                <p className="text-[11px] text-tatt-gray">Your profile is verified and ready for fast-track processing.</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <Info className="h-4 w-4 text-tatt-lime-dark shrink-0 mt-0.5" />
                                <p className="text-[11px] text-tatt-gray">Your data is encrypted and only visible to regional leads.</p>
                            </div>
                        </div>
                    </section>

                    {/* Help block */}
                    <div className="bg-tatt-black rounded-2xl border border-tatt-lime/10 p-5">
                        <h4 className="font-bold text-white mb-2 text-sm">Need assistance?</h4>
                        <p className="text-xs text-white/50 mb-4 leading-relaxed">
                            If you&apos;re unsure about any section, contact our regional support team or browse our FAQs.
                        </p>
                        <Link
                            href="/dashboard/support"
                            className="block w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white text-center transition-colors cursor-pointer"
                        >
                            Contact Support
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile sticky submit */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-30">
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-tatt-lime text-tatt-black font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Submitting..." : "Submit Application"}
                </button>
            </div>
        </form>
    );
}
