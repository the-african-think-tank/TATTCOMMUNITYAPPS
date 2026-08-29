"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
    ChevronRight, 
    Clock, 
    Award, 
    Calendar, 
    CheckCircle2, 
    Share2, 
    Bookmark, 
    Verified, 
    HelpCircle, 
    ArrowRight,
    Loader2,
    MapPin,
    ArrowLeft
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/auth-context";

export default function VolunteerRoleDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const isPreview = searchParams.get('preview') === 'true';
    const { user } = useAuth();

    const [role, setRole] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        const fetchRole = async () => {
            if (id === 'preview') {
                const stored = localStorage.getItem('tatt_preview_role');
                if (stored) {
                    setRole(JSON.parse(stored));
                    setLoading(false);
                    return;
                }
            }

            try {
                const res = await api.get(`/volunteers/roles/${id}`);
                setRole(res.data);
            } catch (err) {
                toast.error("Failed to load role details");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchRole();
    }, [id]);

    const handleApply = async () => {
        if (isPreview) {
            toast.error("Cannot apply in preview mode");
            return;
        }
        router.push(`/dashboard/volunteers/apply?roleId=${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
            </div>
        );
    }

    if (!role) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
                <h2 className="text-2xl font-black text-foreground mb-2">Role Not Found</h2>
                <p className="text-tatt-gray mb-6">The volunteer opportunity you are looking for does not exist or has been closed.</p>
                <button onClick={() => router.back()} className="px-6 py-3 bg-tatt-lime text-tatt-black font-black rounded-xl uppercase tracking-widest text-xs">Go Back</button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground pb-20 animate-in fade-in duration-700">
            {isPreview && (
                <div className="bg-tatt-lime text-tatt-black py-2 px-6 text-center text-[10px] font-black uppercase tracking-[0.3em] sticky top-0 z-50 shadow-xl">
                    Preview Mode — This is how the role appears to volunteers
                </div>
            )}

            {/* Breadcrumbs */}
            <div className="max-w-6xl mx-auto px-6 pt-8">
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-6">
                    <button onClick={() => router.push('/dashboard/volunteers')} className="hover:text-tatt-lime transition-colors">Opportunities</button>
                    <ChevronRight size={12} className="opacity-40" />
                    <span className="opacity-60">{role.chapter?.name || "Global"}</span>
                    <ChevronRight size={12} className="opacity-40" />
                    <span className="text-foreground">{role.name}</span>
                </nav>
            </div>

            <div className="max-w-6xl mx-auto px-6">
                {/* Hero Section */}
                <div className="relative h-[450px] md:h-[600px] overflow-hidden group rounded-3xl mb-12 border border-border shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-tatt-black/95 via-tatt-black/40 to-transparent z-10"></div>
                    <img 
                        src="/images/volunteer-hero.png" 
                        alt="Join the Movement" 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[3s] ease-out"
                    />
                    <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-4">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-tatt-lime text-tatt-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-tatt-lime/20">
                                {role.isActive ? "Open Position" : "Draft Listing"}
                            </span>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter italic uppercase">{role.name}</h2>
                            <div className="flex items-center gap-2 text-white/80 font-bold uppercase tracking-widest text-xs">
                                <MapPin size={16} className="text-tatt-lime" />
                                {role.location}
                            </div>
                        </div>
                        {!isPreview && user?.systemRole === 'COMMUNITY_MEMBER' && (
                            <button 
                                onClick={handleApply}
                                className="bg-tatt-lime hover:bg-tatt-lime-vibrant text-tatt-black font-black px-10 py-5 rounded-2xl shadow-2xl shadow-tatt-lime/30 flex items-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
                            >
                                Apply Now <ArrowRight size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Col */}
                    <div className="lg:col-span-2 space-y-16">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm hover:border-tatt-lime/30 transition-all group">
                                <Clock className="text-tatt-lime mb-3 group-hover:scale-110 transition-transform" size={24} />
                                <p className="text-tatt-gray text-[10px] font-black uppercase tracking-wider mb-1">Commitment</p>
                                <p className="text-foreground font-black text-xl italic">{role.weeklyHours} hrs/week</p>
                            </div>
                            <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm hover:border-tatt-lime/30 transition-all group">
                                <Award className="text-tatt-lime mb-3 group-hover:scale-110 transition-transform" size={24} />
                                <p className="text-tatt-gray text-[10px] font-black uppercase tracking-wider mb-1">Impact Level</p>
                                <p className="text-foreground font-black text-xl italic">{role.grade || "Contributor"}</p>
                            </div>
                            <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm hover:border-tatt-lime/30 transition-all group">
                                <Calendar className="text-tatt-lime mb-3 group-hover:scale-110 transition-transform" size={24} />
                                <p className="text-tatt-gray text-[10px] font-black uppercase tracking-wider mb-1">Duration</p>
                                <p className="text-foreground font-black text-xl italic">{role.durationMonths} Months+</p>
                            </div>
                        </div>

                        {/* About the Role */}
                        <div className="space-y-6">
                            <h3 className="text-3xl font-black text-foreground border-l-8 border-tatt-lime pl-6 italic uppercase tracking-tight">Mission Objective</h3>
                            <div className="text-tatt-gray font-medium leading-[1.8] text-lg space-y-4 whitespace-pre-line">
                                {role.description}
                            </div>
                        </div>

                        {/* Key Responsibilities */}
                        <div className="space-y-6">
                            <h3 className="text-3xl font-black text-foreground border-l-8 border-tatt-lime pl-6 italic uppercase tracking-tight">Key Responsibilities</h3>
                            <ul className="space-y-4">
                                {role.responsibilities?.map((resp: string, idx: number) => (
                                    <li key={idx} className="flex gap-4 group p-4 rounded-2xl hover:bg-surface border border-transparent hover:border-border transition-all">
                                        <CheckCircle2 size={24} className="text-tatt-lime shrink-0 group-hover:scale-110 transition-transform" />
                                        <span className="text-foreground font-bold leading-relaxed">{resp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Required Skills */}
                        <div className="space-y-6">
                            <h3 className="text-3xl font-black text-foreground border-l-8 border-tatt-lime pl-6 italic uppercase tracking-tight">Required Expertise</h3>
                            <div className="flex flex-wrap gap-3">
                                {role.requiredSkills?.map((skill: string) => (
                                    <span key={skill} className="bg-tatt-lime/10 border border-tatt-lime/20 text-foreground px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Col */}
                    <div className="space-y-8">
                        <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl sticky top-24 overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-tatt-lime/5 rounded-bl-full blur-2xl group-hover:bg-tatt-lime/10 transition-all duration-500"></div>
                            
                            <h4 className="text-xl font-black italic uppercase tracking-tight mb-8">Role Briefing</h4>
                            <div className="space-y-6 mb-10">
                                <div className="flex justify-between items-center bg-background p-4 rounded-2xl border border-border/50">
                                    <span className="text-tatt-gray text-[10px] font-black uppercase tracking-widest">Applications</span>
                                    <span className="font-black text-foreground italic">{role.applications?.length || 0} Submitted</span>
                                </div>
                                <div className="flex justify-between items-center bg-background p-4 rounded-2xl border border-border/50">
                                    <span className="text-tatt-gray text-[10px] font-black uppercase tracking-widest">Posted on</span>
                                    <span className="font-black text-foreground italic">{new Date(role.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                {!isPreview && user?.systemRole === 'COMMUNITY_MEMBER' && (
                                    <button 
                                        onClick={handleApply}
                                        className="w-full bg-tatt-lime hover:bg-tatt-lime-vibrant text-tatt-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-tatt-lime/20 uppercase tracking-[0.2em] text-xs"
                                    >
                                        Apply Now
                                    </button>
                                )}
                                <button className="w-full bg-foreground hover:bg-tatt-black text-surface font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px]">
                                    <Share2 size={16} /> Share Role
                                </button>
                                <button className="w-full border border-border hover:bg-background text-tatt-gray font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px]">
                                    <Bookmark size={16} /> Save for Later
                                </button>
                            </div>
                            <hr className="my-8 border-border/50"/>
                            <div className="bg-tatt-lime/10 rounded-3xl p-6 border border-tatt-lime/30 relative overflow-hidden group">
                                <div className="absolute -top-12 -right-12 size-24 bg-tatt-lime/10 rounded-full blur-xl"></div>
                                <p className="text-xs font-black text-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
                                    <Verified className="text-tatt-lime" size={18} />
                                    Verified Impact
                                </p>
                                <p className="text-[11px] text-tatt-gray font-medium leading-relaxed">
                                    Volunteers in this role typically contribute to policy changes that affect over 200,000 residents in the {role.chapter?.name || "Global"} region.
                                </p>
                            </div>
                        </div>

                        {/* Support Card */}
                        <div className="bg-tatt-black text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group border border-white/5">
                            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 duration-700">
                                <HelpCircle size={120} />
                            </div>
                            <h4 className="text-xl font-black italic uppercase tracking-tight mb-3 relative z-10">Have Questions?</h4>
                            <p className="text-tatt-gray text-sm mb-6 relative z-10 leading-relaxed">Not sure if this role is for you? Connect with our talent team to discuss your fit.</p>
                            <a className="text-tatt-lime font-black text-xs inline-flex items-center gap-2 hover:underline relative z-10 uppercase tracking-widest" href="#">
                                Contact Recruitment <ArrowRight size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Call to Action */}
            <footer className="mt-32 pt-20 pb-32 border-t border-border">
                <div className="max-w-3xl mx-auto text-center space-y-6 px-6">
                    <h3 className="text-3xl font-black italic uppercase italic tracking-tighter">Not the right fit?</h3>
                    <p className="text-tatt-gray font-bold text-lg">Explore dozens of other opportunities to make an impact across the African continent.</p>
                    <button 
                        onClick={() => router.push('/dashboard/volunteers')}
                        className="bg-background border-4 border-foreground text-foreground font-black px-10 py-4 rounded-2xl hover:bg-foreground hover:text-surface transition-all uppercase tracking-widest text-xs active:scale-95"
                    >
                        View All Open Roles
                    </button>
                </div>
            </footer>
        </main>
    );
}
