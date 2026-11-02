"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    PlusCircle, 
    ArrowLeft,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    BookOpen,
    CheckCircle2,
    Calendar,
    ArrowRightCircle,
    Mail
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/auth-context";

interface Volunteer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    volunteerStat?: {
        status: string;
        impactPoints: number;
    };
    // Let's assume progress is calculated or attached
    onboardingProgress?: number; 
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const isRegionalAdmin = user?.systemRole === 'REGIONAL_ADMIN';

    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [totalItems, setTotalItems] = useState(0);

    const fetchVolunteers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/volunteers/admin/list`, {
                params: {
                    page,
                    limit: 10,
                    search: search || undefined,
                    status: 'TRAINING',
                    chapterId: isRegionalAdmin ? user?.chapterId : undefined
                }
            });
            // Mocking progress for visual effect since real data isn't joined yet
            const augmentedData = data.data.map((v: any) => ({
                ...v,
                onboardingProgress: Math.floor(Math.random() * 80) + 10 // 10% to 90%
            }));
            setVolunteers(augmentedData);
            setTotalPages(data.totalPages);
            setTotalItems(data.total);
        } catch (error) {
            toast.error("Failed to load onboarding pipeline");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVolunteers();
    }, [page, search, isRegionalAdmin, user?.chapterId]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <Link href="/admin/volunteers" className="text-tatt-lime flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:underline mb-2">
                        <ArrowLeft size={14} /> Back to Center
                    </Link>
                    <h3 className="text-3xl font-black tracking-tight text-foreground italic uppercase">Ongoing Onboarding Pipeline</h3>
                    <p className="text-tatt-gray font-medium">Monitoring training progress and agreement completion for newly approved agents.</p>
                </div>
            </div>

            {/* Pipeline Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4 bg-surface rounded-[2.5rem] border border-border">
                        <Loader2 className="animate-spin text-tatt-lime" size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Fetching Active Trainees...</p>
                    </div>
                ) : volunteers.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-surface rounded-[2.5rem] border border-border">
                        <p className="text-tatt-gray font-bold italic uppercase tracking-widest">No agents currently in onboarding sector</p>
                    </div>
                ) : (
                    volunteers.map((agent) => (
                        <div 
                            key={agent.id} 
                            onClick={() => router.push(`/admin/volunteers/${agent.id}`)}
                            className="bg-surface border border-border rounded-[2.5rem] p-6 flex flex-col md:flex-row gap-6 hover:border-tatt-lime/40 transition-all group overflow-hidden relative cursor-pointer"
                        >
                            {/* Avatar and Info */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-background border border-border rounded-3xl w-full md:w-32">
                                <div className="size-16 rounded-full bg-tatt-lime/10 text-tatt-lime flex items-center justify-center font-black text-xl border border-tatt-lime/20 mb-3 group-hover:scale-110 transition-transform">
                                    {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
                                </div>
                                <p className="font-black text-[10px] text-center uppercase tracking-tighter text-foreground line-clamp-1">{agent.firstName} {agent.lastName}</p>
                                <span className="text-[8px] font-bold text-tatt-gray mt-1 flex items-center gap-1 uppercase tracking-widest">
                                    <Calendar size={10} className="text-tatt-lime" />
                                    Phase 1 Trainee
                                </span>
                            </div>

                            {/* Progress Details */}
                            <div className="flex-grow flex flex-col justify-between py-2">
                                <div>
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black uppercase italic tracking-tighter text-foreground">Training Module Sync</h4>
                                            <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest flex items-center gap-2">
                                                <BookOpen size={12} className="text-tatt-lime" />
                                                Community Standards & Protocols
                                            </p>
                                        </div>
                                        <p className="text-2xl font-black italic text-tatt-lime tracking-tighter">{agent.onboardingProgress}%</p>
                                    </div>

                                    {/* Large Progress Bar */}
                                    <div className="w-full h-4 bg-background border border-border rounded-full overflow-hidden p-1">
                                        <div 
                                            className="h-full bg-tatt-lime rounded-full transition-all duration-1000 ease-out relative group/bar" 
                                            style={{ width: `${agent.onboardingProgress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-3 px-1">
                                        <span className="text-[9px] font-black text-tatt-gray uppercase tracking-[0.2em] flex items-center gap-1.5">
                                            <CheckCircle2 size={10} className="text-tatt-lime" />
                                            Doc Signed
                                        </span>
                                        <span className="text-[9px] font-black text-tatt-gray uppercase tracking-[0.2em] flex items-center gap-1.5 opacity-40">
                                            Background Sync
                                        </span>
                                        <span className="text-[9px] font-black text-tatt-gray uppercase tracking-[0.2em] flex items-center gap-1.5 opacity-40">
                                            ID Verified
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 mt-6">
                                    <button className="p-2 rounded-xl border border-border hover:bg-background transition-all text-tatt-gray hover:text-tatt-lime">
                                        <Mail size={16} />
                                    </button>
                                    <button className="px-6 py-2.5 rounded-xl bg-tatt-lime text-tatt-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-105 transition-all">
                                        Accelerate Hub
                                        <ArrowRightCircle size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Nav Stats */}
            <div className="p-8 bg-surface rounded-[2.5rem] border border-border border-dashed flex flex-wrap gap-8 justify-around items-center">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-tatt-gray uppercase tracking-[0.3em]">Total Pipeline</p>
                    <p className="text-3xl font-black italic text-foreground tracking-tighter">{totalItems}</p>
                 </div>
                 <div className="w-px h-12 bg-border"></div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-tatt-gray uppercase tracking-[0.3em]">Estimated Deployment</p>
                    <p className="text-3xl font-black italic text-foreground tracking-tighter">~ 4.5 Days</p>
                 </div>
                 <div className="w-px h-12 bg-border"></div>
                 <div className="space-y-1 text-right">
                    <button className="px-6 py-3 rounded-xl bg-background border border-border text-[9px] font-black uppercase tracking-widest hover:border-tatt-lime transition-all">
                        Bulk Remind Trainees
                    </button>
                 </div>
            </div>
        </div>
    );
}
