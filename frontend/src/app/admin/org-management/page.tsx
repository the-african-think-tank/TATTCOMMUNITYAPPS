"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
    UserPlus,
    Search,
    Filter,
    Download,
    Edit2,
    ChevronLeft,
    ChevronRight,
    Users,
    Shield,
    Clock,
    Building,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Trash2,
    X,
    Mail,
    KeyRound
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { UserCreationModal } from "@/components/admin/user-creation-modal";

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    systemRole: string;
    isActive: boolean;
    profilePicture?: string;
    chapter?: {
        name: string;
        code: string;
    };
    jailUntil?: string;
    suspensionStrikes?: number;
}

interface Stats {
    totalStaff: number;
    activeAdmins: number;
    pendingApprovals: number;
    regionalChapters: number;
}

function OrgManagementContent() {
    const [members, setMembers] = useState<Member[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeRoleFilter = searchParams.get('role');

    useEffect(() => {
        fetchData();
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const roleFilter = searchParams.get('role');
            const [membersRes, statsRes] = await Promise.all([
                api.get("/users/org-members", { params: { role: roleFilter } }),
                api.get("/users/stats")
            ]);
            setMembers(membersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Error fetching org data:", error);
            toast.error("Failed to load organization data");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to permanently delete team member ${name}?`)) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success("Team member deleted successfully");
            fetchData();
        } catch (error: any) {
            console.error("Error deleting member:", error);
            toast.error(error.response?.data?.message || "Failed to delete team member");
        }
    };

    const handleResendInvite = async (id: string, name: string) => {
        const promise = api.post(`/auth/org-member/resend-invite/${id}`);

        toast.promise(promise, {
            loading: `Sending invitation to ${name}...`,
            success: `Invitation successfully resent to ${name}`,
            error: (err) => err.response?.data?.message || `Failed to send invitation to ${name}`
        });

        try {
            await promise;
        } catch (error) {
            console.error("Error resending invite:", error);
        }
    };

    const clearFilter = () => {
        router.push("/admin/org-management");
    };

    const getStatusBadge = (member: Member) => {
        if (!member.isActive) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                    <span className="size-1.5 rounded-full bg-orange-500"></span>
                    Pending
                </span>
            );
        }
        if (member.jailUntil && new Date(member.jailUntil) > new Date()) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    <span className="size-1.5 rounded-full bg-red-600"></span>
                    Jailed
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-tatt-lime/20 text-tatt-lime">
                <span className="size-1.5 rounded-full bg-tatt-lime"></span>
                Active
            </span>
        );
    };

    const filteredMembers = members.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Organization Management</h2>
                    <p className="text-tatt-gray text-sm">Control administrative roles and regional chapter staff.</p>
                </div>
                <div className="flex items-center gap-3">
                    {user?.systemRole === "SUPERADMIN" && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-foreground text-background px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-90 transition-all shadow-sm uppercase tracking-widest"
                        >
                            <KeyRound size={18} />
                            Create Account
                        </button>
                    )}
                    <Link
                        href="/admin/org-management/add"
                        className="bg-tatt-lime text-tatt-black px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-95 transition-all shadow-sm uppercase tracking-widest"
                    >
                        <UserPlus size={18} />
                        Add Team Member
                    </Link>
                </div>
            </div>

            {activeRoleFilter && (
                <div className="flex items-center gap-3 bg-surface border border-tatt-lime/20 p-4 rounded-2xl animate-in slide-in-from-left-4 duration-500">
                    <div className="size-8 bg-tatt-lime/10 rounded-lg flex items-center justify-center text-tatt-lime">
                        <Filter size={16} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Active Role Filter</p>
                        <p className="text-xs font-bold text-foreground">Showing only: <span className="text-tatt-lime italic uppercase tracking-wider">{activeRoleFilter.replace('_', ' ')}</span></p>
                    </div>
                    <button 
                        onClick={clearFilter}
                        className="p-2 hover:bg-background rounded-lg text-tatt-gray hover:text-red-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Staff"
                    value={stats?.totalStaff || 0}
                    icon={<Users className="text-tatt-lime" />}
                    trend="+2.5% from last month"
                    trendUp={true}
                />
                <StatCard
                    label="Active Admins"
                    value={stats?.activeAdmins || 0}
                    icon={<Shield className="text-tatt-lime" />}
                    trend="-1.2% this week"
                    trendUp={false}
                />
                <StatCard
                    label="Pending Approvals"
                    value={stats?.pendingApprovals || 0}
                    icon={<Clock className="text-tatt-lime" />}
                    trend="+10% increase"
                    trendUp={true}
                />
                <StatCard
                    label="Regional Chapters"
                    value={stats?.regionalChapters || 0}
                    icon={<Building className="text-tatt-lime" />}
                    trend="Stable (no change)"
                    trendUp={null}
                />
            </div>

            {/* Table Card */}
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-bold text-foreground">Team Members</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                            <input
                                type="text"
                                placeholder="Search specialists..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all w-full sm:w-64"
                            />
                        </div>
                        <button className="p-2 text-tatt-gray hover:bg-background rounded-xl border border-border transition-colors">
                            <Filter size={18} />
                        </button>
                        <button className="p-2 text-tatt-gray hover:bg-background rounded-xl border border-border transition-colors">
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-tatt-gray text-[11px] font-bold uppercase tracking-wider bg-background/30">
                                <th className="px-6 py-4">Name / Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Region / Chapter</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4" colSpan={5}>
                                            <div className="h-10 bg-background rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredMembers.length > 0 ? (
                                filteredMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-bold shrink-0 border border-tatt-lime/20 overflow-hidden">
                                                    {member.profilePicture ? (
                                                        <img src={member.profilePicture} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        member.firstName.charAt(0)
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{member.firstName} {member.lastName}</p>
                                                    <p className="text-xs text-tatt-gray truncate">{member.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-foreground">{member.systemRole.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-background border border-border text-foreground">
                                                {member.chapter?.name || "Global"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(member)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {!member.isActive && (
                                                    <button 
                                                        onClick={() => handleResendInvite(member.id, `${member.firstName} ${member.lastName}`)}
                                                        className="p-2 inline-block text-tatt-gray hover:text-blue-500 transition-colors"
                                                        title="Resend Invitation"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                )}
                                                <Link href={`/admin/org-management/edit/${member.id}`} className="p-2 inline-block text-tatt-gray hover:text-tatt-lime transition-colors">
                                                    <Edit2 size={16} />
                                                </Link>
                                                {user?.systemRole === "SUPERADMIN" && (
                                                    <button onClick={() => handleDelete(member.id, `${member.firstName} ${member.lastName}`)} className="p-2 text-tatt-gray hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-tatt-gray">
                                        No team members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-background/30 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-tatt-gray">
                        Showing <span className="font-bold text-foreground">1 to {filteredMembers.length}</span> of {members.length} members
                    </p>
                    <div className="flex items-center gap-2">
                        <button className="size-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <button className="size-8 flex items-center justify-center rounded-lg bg-tatt-lime text-tatt-black font-bold text-xs">
                            1
                        </button>
                        <button disabled className="size-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors text-xs">
                            2
                        </button>
                        <button className="size-8 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* User Creation Modal (Superadmin Only) */}
            <UserCreationModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={fetchData}
            />
        </div>
    );
}

function StatCard({ label, value, icon, trend, trendUp }: { label: string, value: number, icon: React.ReactNode, trend: string, trendUp: boolean | null }) {
    return (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm hover:border-tatt-lime/30 transition-all">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-tatt-gray uppercase tracking-wider">{label}</p>
                <div className="p-2 bg-tatt-lime/10 rounded-lg">
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-black text-foreground">{value}</p>
            <p className={`text-[10px] mt-2 flex items-center gap-1 font-bold uppercase tracking-wider ${trendUp === true ? "text-green-600" : trendUp === false ? "text-red-600" : "text-tatt-gray"
                }`}>
                {trendUp === true && <TrendingUp size={12} />}
                {trendUp === false && <TrendingDown size={12} />}
                {trend}
            </p>
        </div>
    );
}

export default function OrgManagementPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-bold text-tatt-gray">Initializing Management Matrix...</div>}>
            <OrgManagementContent />
        </Suspense>
    );
}
