"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ChevronLeft, 
    ChevronRight, 
    Bell, 
    HelpCircle, 
    CheckCircle, 
    Plus, 
    X, 
    Eye, 
    CheckCircle2,
    Clock,
    Award,
    Calendar,
    ArrowLeft,
    Loader2
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

export default function CreateVolunteerRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [chapters, setChapters] = useState<any[]>([]);
    
    // Form State
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        chapterId: "",
        weeklyHours: 10,
        durationMonths: 6,
        description: "",
        responsibilities: [] as string[],
        requiredSkills: [] as string[],
        openUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
        grade: "Contributor"
    });

    const [newResp, setNewResp] = useState("");
    const [newSkill, setNewSkill] = useState("");
    const [isGradeOpen, setIsGradeOpen] = useState(false);

    const grades = ["Contributor", "Lead", "Senior Advisor", "Fellow"];

    useEffect(() => {
        const fetchChapters = async () => {
            try {
                const res = await api.get("/chapters");
                setChapters(res.data);
                if (res.data.length > 0) {
                    setFormData(prev => ({ 
                        ...prev, 
                        chapterId: res.data[0].id,
                        location: res.data[0].location || res.data[0].name 
                    }));
                }
            } catch (err) {
                toast.error("Failed to load chapters");
            }
        };
        fetchChapters();
    }, []);

    const handleAddResp = () => {
        if (!newResp.trim()) return;
        setFormData(prev => ({
            ...prev,
            responsibilities: [...prev.responsibilities, newResp.trim()]
        }));
        setNewResp("");
    };

    const handleRemoveResp = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            responsibilities: prev.responsibilities.filter((_, i) => i !== idx)
        }));
    };

    const handleAddSkill = () => {
        if (!newSkill.trim()) return;
        if (formData.requiredSkills.includes(newSkill.trim())) {
            setNewSkill("");
            return;
        }
        setFormData(prev => ({
            ...prev,
            requiredSkills: [...prev.requiredSkills, newSkill.trim()]
        }));
        setNewSkill("");
    };

    const handleRemoveSkill = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            requiredSkills: prev.requiredSkills.filter(s => s !== skill)
        }));
    };

    const handleSubmit = async (draft = false) => {
        // Hard validations
        if (!formData.name.trim()) {
            toast.error("Role Title is required");
            return;
        }
        if (!formData.location.trim()) {
            toast.error("Location is required");
            return;
        }
        if (!formData.chapterId) {
            toast.error("Please select a target chapter");
            return;
        }
        if (!formData.description.trim()) {
            toast.error("Description is required");
            return;
        }
        if (!formData.openUntil) {
            toast.error("Application Deadline is required");
            return;
        }
        if (formData.weeklyHours <= 0) {
            toast.error("Commitment hours must be greater than 0");
            return;
        }

        setLoading(true);
        try {
            await api.post("/volunteers/roles", {
                ...formData,
                isActive: !draft,
                // Ensure number types for backend compatibility
                weeklyHours: Number(formData.weeklyHours),
                durationMonths: Number(formData.durationMonths)
            });
            toast.success(draft ? "Role saved as draft" : "Volunteer role published successfully!");
            router.push("/admin/volunteers");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to create role. Please check all fields.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background text-foreground animate-in fade-in duration-700">
            {/* Top Nav */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 md:px-10 bg-surface sticky top-0 z-40">
                <div className="flex items-center gap-2 text-sm text-tatt-gray">
                    <button onClick={() => router.push('/admin/volunteers')} className="hover:text-tatt-lime transition-colors">Volunteers</button>
                    <ChevronRight size={14} className="opacity-40" />
                    <span className="text-foreground font-bold">Create New Role</span>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    <button className="text-tatt-gray hover:text-tatt-lime relative">
                        <Bell size={20} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
                    </button>
                    <button className="text-tatt-gray hover:text-tatt-lime">
                        <HelpCircle size={20} />
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto py-12 px-6">
                {/* Header */}
                <div className="mb-10 space-y-3">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-tatt-lime transition-all mb-4">
                        <ArrowLeft size={14} /> Back to Dashboard
                    </button>
                    <h2 className="text-4xl font-black text-foreground tracking-tight">Create Volunteer Role</h2>
                    <p className="text-tatt-gray max-w-2xl font-medium leading-relaxed">Define an impact-driven opportunity within the TATT ecosystem. High-quality listings attract experienced professionals.</p>
                </div>

                {/* Role Metadata Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm hover:border-tatt-lime/30 transition-all group">
                        <Clock className="text-tatt-lime mb-2 group-hover:scale-110 transition-transform" size={24} />
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-wider mb-1">Commitment (Hrs/Wk)</p>
                        <input 
                            type="number"
                            value={formData.weeklyHours}
                            onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
                            className="w-full border-none bg-transparent p-0 text-foreground font-black text-lg focus:ring-0 placeholder:text-tatt-gray/30" 
                            placeholder="e.g. 10" 
                        />
                    </div>
                    <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm hover:border-tatt-lime/30 transition-all group relative">
                        <Award className="text-tatt-lime mb-2 group-hover:scale-110 transition-transform" size={24} />
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-wider mb-1">Impact Level</p>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setIsGradeOpen(!isGradeOpen)}
                                className="w-full text-left flex items-center justify-between text-foreground font-black text-lg outline-none"
                            >
                                {formData.grade}
                                <ChevronRight size={18} className={`transition-transform duration-300 ${isGradeOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {isGradeOpen && (
                                <div className="absolute top-full left-0 w-full bg-surface border border-border rounded-xl mt-2 py-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                                    {grades.map(g => (
                                        <button 
                                            key={g}
                                            onClick={() => {
                                                setFormData({ ...formData, grade: g });
                                                setIsGradeOpen(false);
                                            }}
                                            className={`w-full text-left px-5 py-3 text-sm font-bold transition-all hover:bg-tatt-lime/10 ${
                                                formData.grade === g ? 'text-tatt-lime' : 'text-foreground'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm hover:border-tatt-lime/30 transition-all group">
                        <Calendar className="text-tatt-lime mb-2 group-hover:scale-110 transition-transform" size={24} />
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-wider mb-1">Duration (Months)</p>
                        <input 
                            type="number"
                            value={formData.durationMonths}
                            onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                            className="w-full border-none bg-transparent p-0 text-foreground font-black text-lg focus:ring-0 placeholder:text-tatt-gray/30" 
                            placeholder="e.g. 6" 
                        />
                    </div>
                </div>

                {/* Form Sections */}
                <div className="space-y-16">
                    {/* About the Role */}
                    <section className="space-y-6">
                        <h3 className="text-2xl font-black text-foreground border-l-4 border-tatt-lime pl-4 uppercase tracking-tight italic">About the Role</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-2">Role Title</label>
                                <input 
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-surface border border-border rounded-xl p-4 focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime transition-all text-foreground font-bold outline-none shadow-sm" 
                                    placeholder="e.g. Community Outreach Lead" 
                                    type="text"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-2">Target Chapter</label>
                                <select 
                                    value={formData.chapterId}
                                    onChange={(e) => {
                                        const chapter = chapters.find(c => c.id === e.target.value);
                                        setFormData({ 
                                            ...formData, 
                                            chapterId: e.target.value,
                                            location: chapter?.location || chapter?.name || ""
                                        });
                                    }}
                                    className="w-full bg-surface border border-border rounded-xl p-4 focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime transition-all text-foreground font-bold outline-none shadow-sm cursor-pointer"
                                >
                                    {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-2">Specific Location</label>
                                <input 
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-surface border border-border rounded-xl p-4 focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime transition-all text-foreground font-bold outline-none shadow-sm" 
                                    placeholder="e.g. Accra, Ghana or Remote" 
                                    type="text"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-2">Application Deadline</label>
                                <input 
                                    value={formData.openUntil}
                                    onChange={(e) => setFormData({ ...formData, openUntil: e.target.value })}
                                    className="w-full bg-surface border border-border rounded-xl p-4 focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime transition-all text-foreground font-bold outline-none shadow-sm" 
                                    type="date"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-2">Description</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-surface border border-border rounded-xl p-4 focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime transition-all text-foreground font-medium leading-relaxed outline-none shadow-sm min-h-[160px]" 
                                    placeholder="Describe the mission, impact, and cultural context of this role..." 
                                    rows={6}
                                ></textarea>
                            </div>
                        </div>
                    </section>

                    {/* Key Responsibilities */}
                    <section className="space-y-6">
                        <h3 className="text-2xl font-black text-foreground border-l-4 border-tatt-lime pl-4 uppercase tracking-tight italic">Key Responsibilities</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-2 pl-4 bg-surface border border-border rounded-2xl shadow-sm focus-within:border-tatt-lime transition-all">
                                <CheckCircle2 size={20} className="text-tatt-lime shrink-0" />
                                <input 
                                    value={newResp}
                                    onChange={(e) => setNewResp(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddResp();
                                        }
                                    }}
                                    className="flex-1 border-none bg-transparent focus:ring-0 p-2 text-foreground font-bold placeholder:text-tatt-gray/40 outline-none" 
                                    placeholder="Add a key responsibility..." 
                                    type="text"
                                />
                                <button 
                                    onClick={handleAddResp}
                                    className="size-10 rounded-xl bg-foreground text-surface flex items-center justify-center hover:bg-tatt-lime hover:text-tatt-black transition-all transform active:scale-95"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.responsibilities.map((resp, idx) => (
                                    <div key={idx} className="flex items-start gap-4 px-5 py-4 bg-surface border border-border rounded-xl group hover:border-tatt-lime/40 transition-all animate-in slide-in-from-left duration-300">
                                        <CheckCircle2 className="text-tatt-lime text-xl mt-0.5" size={18} />
                                        <p className="text-foreground font-bold flex-1 text-sm">{resp}</p>
                                        <button 
                                            onClick={() => handleRemoveResp(idx)}
                                            className="opacity-0 group-hover:opacity-100 text-tatt-gray hover:text-red-500 transition-all p-1"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Required Skills */}
                    <section className="space-y-6">
                        <h3 className="text-2xl font-black text-foreground border-l-4 border-tatt-lime pl-4 uppercase tracking-tight italic">Required Skills</h3>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {formData.requiredSkills.map(skill => (
                                    <div key={skill} className="bg-tatt-lime/10 border border-tatt-lime/20 text-foreground px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-in zoom-in duration-300 shadow-sm">
                                        {skill}
                                        <button onClick={() => handleRemoveSkill(skill)} className="text-tatt-gray hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="relative">
                                <input 
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSkill();
                                        }
                                    }}
                                    className="w-full bg-surface border border-border rounded-xl p-4 focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime text-sm font-bold outline-none shadow-sm" 
                                    placeholder="Type a skill and press enter..." 
                                    type="text"
                                />
                                <button onClick={handleAddSkill} className="absolute right-4 top-1/2 -translate-y-1/2 text-tatt-lime hover:text-tatt-lime-dark font-black text-[10px] uppercase tracking-widest">Add</button>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-20 pt-10 border-t border-border flex flex-col items-center gap-8">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
                        <button 
                            disabled={loading}
                            onClick={() => handleSubmit(false)}
                            className="w-full sm:flex-1 bg-tatt-lime hover:bg-tatt-lime-vibrant text-tatt-black font-black py-5 rounded-xl shadow-xl shadow-tatt-lime/20 uppercase tracking-[0.2em] text-xs transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            Publish Role
                        </button>
                        <button 
                            disabled={loading}
                            onClick={() => handleSubmit(true)}
                            className="w-full sm:flex-1 bg-foreground hover:bg-tatt-black text-surface font-black py-5 rounded-xl uppercase tracking-[0.2em] text-xs transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            Save as Draft
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <button onClick={() => router.back()} className="text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-red-500 transition-colors">Discard Changes</button>
                        <button 
                            onClick={() => {
                                localStorage.setItem('tatt_preview_role', JSON.stringify({ ...formData, createdAt: new Date().toISOString() }));
                                router.push('/dashboard/volunteers/preview?preview=true');
                            }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground hover:text-tatt-lime transition-colors"
                        >
                            Preview Listing <Eye size={14} />
                        </button>
                    </div>
                    <p className="text-[9px] text-tatt-gray/40 uppercase tracking-[0.3em] font-black">Powered by The African Think Tank</p>
                </div>
            </div>
        </main>
    );
}
