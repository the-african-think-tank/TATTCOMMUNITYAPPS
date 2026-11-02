"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    ChevronLeft, 
    ChevronRight, 
    Search, 
    Filter, 
    User, 
    Mail, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    MoreHorizontal,
    ArrowLeft,
    Loader2,
    BookOpen,
    Eye,
    MessageSquare,
    MoreVertical
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { ActionDropdown } from "@/components/ui/action-dropdown";

const STATUS_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    PENDING:              { label: "Pending Review",       color: "text-tatt-yellow bg-tatt-yellow/10 border-tatt-yellow/30",     Icon: Clock },
    INTERVIEW_SCHEDULED:  { label: "Interview Scheduled",  color: "text-tatt-lime-dark bg-tatt-lime/10 border-tatt-lime/30",       Icon: Calendar },
    APPROVED:             { label: "Approved",             color: "text-tatt-lime bg-tatt-lime/10 border-tatt-lime/20",            Icon: CheckCircle2 },
    REJECTED:             { label: "Not Selected",         color: "text-tatt-gray bg-tatt-gray/10 border-tatt-gray/20",            Icon: XCircle },
    WITHDRAWN:            { label: "Withdrawn",            color: "text-tatt-gray bg-tatt-gray/10 border-tatt-gray/20",            Icon: XCircle },
};

export default function RoleApplicantsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [role, setRole] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingEntry, setUpdatingEntry] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [roleRes, appsRes] = await Promise.all([
                    api.get(`/volunteers/admin/roles/${id}`),
                    api.get(`/volunteers/admin/applications?roleId=${id}`)
                ]);
                setRole(roleRes.data);
                setApplications(appsRes.data.data || []);
            } catch (err) {
                toast.error("Failed to load role applications");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const handleUpdateStatus = async (appId: string, newStatus: string) => {
        setUpdatingEntry(appId);
        try {
            await api.patch(`/volunteers/applications/${appId}/status`, { status: newStatus });
            toast.success(`Application updated to ${newStatus.replace('_', ' ')}`);
            // Refresh applications
            const { data } = await api.get(`/volunteers/admin/applications?roleId=${id}`);
            setApplications(data.data || []);
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setUpdatingEntry(null);
        }
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
                <h2 className="text-2xl font-black text-foreground mb-2 italic">Role Not Found</h2>
                <button onClick={() => router.back()} className="mt-4 px-6 py-3 bg-tatt-lime text-tatt-black font-black rounded-xl uppercase tracking-widest text-xs">Go Back</button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground animate-in fade-in duration-700 pb-20">
            {/* Nav Header */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 md:px-10 bg-surface sticky top-0 z-40 backdrop-blur-md bg-opacity-70">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray">
                    <button onClick={() => router.push('/admin/volunteers')} className="hover:text-tatt-lime transition-colors">Volunteers</button>
                    <ChevronRight size={12} className="opacity-40" />
                    <span className="text-foreground italic">{role.name}</span>
                    <ChevronRight size={12} className="opacity-40" />
                    <span className="text-foreground">Applicants</span>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="space-y-2">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-tatt-lime transition-all mb-2">
                            <ArrowLeft size={14} /> Back to Management
                        </button>
                        <h2 className="text-4xl font-black text-foreground tracking-tighter italic uppercase">{role.name}</h2>
                        <p className="text-tatt-gray font-medium flex items-center gap-2">
                            Pipeline for <span className="font-bold text-foreground">{role.chapter?.name || "Global"}</span> Chapter · {applications.length} Candidates
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <button 
                            onClick={() => router.push(`/dashboard/volunteers/${id}`)}
                            className="px-6 py-3 rounded-2xl border-4 border-foreground text-foreground font-black text-xs uppercase tracking-widest hover:bg-foreground hover:text-surface transition-all flex items-center gap-2 shadow-xl active:scale-95"
                        >
                            <Eye size={18} /> View Public Page
                        </button>
                        <div className="bg-surface border border-border px-6 py-3 rounded-2xl flex flex-col shadow-sm min-w-[160px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Active Pipeline</span>
                            <span className="text-xl font-black italic">{applications.filter(a => a.status === 'PENDING' || a.status === 'INTERVIEW_SCHEDULED').length} Open Reviews</span>
                        </div>
                    </div>
                </div>

                {/* Applicants Table */}
                <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                    <div className="p-8 border-b border-border flex flex-wrap gap-6 items-center justify-between bg-surface/50 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <h5 className="text-xl font-black uppercase italic tracking-tighter">Candidate Evaluation</h5>
                            <div className="px-3 py-1 rounded-full bg-tatt-lime/10 text-tatt-lime text-[10px] font-black border border-tatt-lime/20 tracking-widest">REAL-TIME DATA</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-background/30">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Candidate</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Skills Matched</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Applied On</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic text-right">Navigation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-tatt-gray font-bold italic">No candidates in the pipeline yet.</td>
                                    </tr>
                                ) : (
                                    applications.map((app) => {
                                        const meta = STATUS_META[app.status] || STATUS_META.PENDING;
                                        if (!meta) return null;
                                        const StatusIcon = meta.Icon;
                                        
                                        return (
                                            <tr key={app.id} className="border-b border-border/50 hover:bg-background/20 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center text-tatt-lime shrink-0 overflow-hidden">
                                                            {app.user?.profilePicture ? (
                                                                <img src={app.user.profilePicture} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <User size={24} />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-foreground font-black text-sm uppercase italic tracking-tight">{app.user?.firstName} {app.user?.lastName}</span>
                                                            <span className="text-tatt-gray text-[10px] font-bold lowercase">{app.user?.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
                                                        <StatusIcon size={12} />
                                                        {meta.label}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                                                        {app.interestsAndSkills?.slice(0, 3).map((s: string) => (
                                                            <span key={s} className="px-2 py-0.5 bg-background border border-border rounded-lg text-[9px] font-bold text-tatt-gray uppercase tracking-tighter">{s}</span>
                                                        ))}
                                                        {app.interestsAndSkills?.length > 3 && (
                                                            <span className="text-[9px] font-black text-tatt-lime">+{app.interestsAndSkills.length - 3} OTHER</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-foreground text-xs font-bold italic">{new Date(app.createdAt).toLocaleDateString()}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <ActionDropdown
                                                            ariaLabel="Applicant Actions"
                                                            placement="bottom end"
                                                            items={[
                                                                {
                                                                    key: "approve",
                                                                    label: "Approve Application",
                                                                    icon: <CheckCircle2 size={14} className="text-tatt-lime" />,
                                                                    className: "text-tatt-lime hover:bg-tatt-lime/10",
                                                                    onPress: () => handleUpdateStatus(app.id, 'APPROVED')
                                                                },
                                                                {
                                                                    key: "schedule-interview",
                                                                    label: "Schedule Interview",
                                                                    icon: <Calendar size={14} className="text-foreground" />,
                                                                    onPress: () => handleUpdateStatus(app.id, 'INTERVIEW_SCHEDULED')
                                                                },
                                                                "divider",
                                                                {
                                                                    key: "reject",
                                                                    label: "Reject Candidate",
                                                                    icon: <XCircle size={14} className="text-red-500" />,
                                                                    isDanger: true,
                                                                    onPress: () => handleUpdateStatus(app.id, 'REJECTED')
                                                                }
                                                            ]}
                                                        />
                                                        <button 
                                                            onClick={() => router.push(`/admin/volunteers/${app.userId}`)}
                                                            className="p-2 hover:bg-background rounded-xl text-tatt-gray hover:text-tatt-lime transition-all cursor-pointer active:scale-95"
                                                            title="View Profile"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
