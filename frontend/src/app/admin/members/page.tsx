"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Users, 
    Search, 
    Filter, 
    ArrowLeft, 
    Loader2, 
    Mail, 
    Briefcase, 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Eye, 
    MessageSquare, 
    Building2,
    X,
    ExternalLink
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { ActionDropdown } from "@/components/ui/action-dropdown";

interface ChapterMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    professionTitle?: string;
    communityTier?: string;
    chapterId?: string;
    createdAt: string;
}

interface ChapterDetails {
    id: string;
    name: string;
    code?: string;
    city?: string;
    country?: string;
}

interface TierMeta {
    label: string;
    badgeClass: string;
}

const DEFAULT_TIER_META: TierMeta = {
    label: "Sankofa",
    badgeClass: "bg-surface text-tatt-gray border border-border"
};

const TIER_META: Record<string, TierMeta> = {
    FREE: DEFAULT_TIER_META,
    UBUNTU: {
        label: "Ubuntu",
        badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    },
    IMANI: {
        label: "Imani",
        badgeClass: "bg-purple-500/10 text-purple-400 border border-purple-500/20"
    },
    KIONGOZI: {
        label: "Kiongozi",
        badgeClass: "bg-tatt-lime/10 text-tatt-lime border border-tatt-lime/30"
    }
};

function ChapterMembersContent() {
    const router = useRouter();
    const { user } = useAuth();

    const [chapter, setChapter] = useState<ChapterDetails | null>(null);
    const [members, setMembers] = useState<ChapterMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);
    const [selectedMember, setSelectedMember] = useState<ChapterMember | null>(null);

    // Fetch user's chapter
    const fetchChapter = useCallback(async () => {
        try {
            if (user?.chapterId) {
                const { data } = await api.get(`/chapters/${user.chapterId}`);
                setChapter(data);
                return data.id;
            }
            const { data } = await api.get('/chapters/my-chapter');
            setChapter(data);
            return data.id;
        } catch (error) {
            console.error("Failed to fetch chapter details:", error);
            return null;
        }
    }, [user?.chapterId]);

    // Fetch members for the chapter
    const fetchMembers = useCallback(async (chapterId: string) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/chapters/${chapterId}/members`, {
                params: {
                    search: search.trim() || undefined,
                    tier: tierFilter !== 'all' ? tierFilter : undefined,
                    page,
                    limit: 12
                }
            });
            setMembers(data.members || []);
            setTotalMembers(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (error) {
            console.error("Failed to load chapter members:", error);
        } finally {
            setLoading(false);
        }
    }, [search, tierFilter, page]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            const chapterId = await fetchChapter();
            if (chapterId && isMounted) {
                fetchMembers(chapterId);
            } else if (isMounted) {
                setLoading(false);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, [fetchChapter, fetchMembers]);

    const getTierBadge = (tier?: string) => {
        const meta: TierMeta = (tier ? TIER_META[tier.toUpperCase()] : undefined) ?? DEFAULT_TIER_META;
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                {meta.label}
            </span>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-border/60">
                <div className="space-y-1.5">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-tatt-lime hover:underline transition-colors cursor-pointer mb-1"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </Link>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            Chapter Members
                        </h2>
                        {totalMembers > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tatt-lime/10 text-tatt-lime border border-tatt-lime/20">
                                {totalMembers.toLocaleString()} {totalMembers === 1 ? 'Member' : 'Members'}
                            </span>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-tatt-gray">
                        Active registered community members of {chapter?.name || "your regional chapter"}.
                    </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tatt-gray" />
                        <input
                            type="text"
                            placeholder="Search by name, email..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-tatt-gray focus:outline-none focus:border-tatt-lime transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-tatt-gray shrink-0 hidden sm:block" />
                        <select
                            value={tierFilter}
                            onChange={(e) => {
                                setTierFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full sm:w-auto px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-tatt-lime transition-all cursor-pointer"
                        >
                            <option value="all">All Tiers</option>
                            <option value="FREE">Sankofa (Free)</option>
                            <option value="UBUNTU">Ubuntu</option>
                            <option value="IMANI">Imani</option>
                            <option value="KIONGOZI">Kiongozi</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Members Directory Content */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-border">
                    <Loader2 className="animate-spin text-tatt-lime" size={36} />
                    <p className="text-xs font-semibold text-tatt-gray">Loading chapter members...</p>
                </div>
            ) : members.length === 0 ? (
                <div className="py-20 text-center bg-surface rounded-2xl border border-dashed border-border space-y-2 p-6">
                    <Users className="size-10 text-tatt-gray/40 mx-auto" />
                    <p className="text-foreground font-bold text-base">No Members Found</p>
                    <p className="text-xs text-tatt-gray max-w-sm mx-auto">
                        {search || tierFilter !== 'all'
                            ? "No members match the current search filters. Try adjusting your query."
                            : "There are currently no registered members in this chapter."}
                    </p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-background/40">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-tatt-gray">Member</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-tatt-gray hidden md:table-cell">Profession</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-tatt-gray">Membership Tier</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-tatt-gray hidden sm:table-cell">Joined</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-tatt-gray text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {members.map((member) => (
                                    <tr 
                                        key={member.id} 
                                        className="hover:bg-background/40 transition-colors group"
                                    >
                                        {/* Member Info */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-background border border-border text-foreground font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                                    {member.profilePicture ? (
                                                        <img 
                                                            src={member.profilePicture} 
                                                            alt={`${member.firstName} ${member.lastName}`} 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    ) : (
                                                        <span>{member.firstName?.[0] || 'U'}{member.lastName?.[0] || ''}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-foreground truncate group-hover:text-tatt-lime transition-colors">
                                                        {member.firstName} {member.lastName}
                                                    </p>
                                                    <p className="text-xs text-tatt-gray lowercase truncate">
                                                        {member.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Profession */}
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex items-center gap-1.5 text-xs text-tatt-gray truncate max-w-xs">
                                                <Briefcase size={13} className="text-tatt-lime shrink-0" />
                                                <span className="truncate">{member.professionTitle || "Community Member"}</span>
                                            </div>
                                        </td>

                                        {/* Tier */}
                                        <td className="px-6 py-4">
                                            {getTierBadge(member.communityTier)}
                                        </td>

                                        {/* Joined Date */}
                                        <td className="px-6 py-4 hidden sm:table-cell text-xs text-tatt-gray">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={13} className="shrink-0" />
                                                <span>{new Date(member.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedMember(member)}
                                                    className="p-2 rounded-xl text-tatt-gray hover:text-foreground hover:bg-background transition-all cursor-pointer active:scale-95"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <ActionDropdown
                                                    ariaLabel="Member Options"
                                                    placement="bottom end"
                                                    items={[
                                                        {
                                                            key: "view",
                                                            label: "View Member Details",
                                                            icon: <Eye size={14} className="text-tatt-lime" />,
                                                            onPress: () => setSelectedMember(member)
                                                        },
                                                        {
                                                            key: "message",
                                                            label: "Send Direct Message",
                                                            icon: <MessageSquare size={14} className="text-foreground" />,
                                                            onPress: () => router.push(`/admin/messages?to=${member.id}`)
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-background/20 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-tatt-gray">
                                Page <span className="font-bold text-foreground">{page}</span> of <span className="font-bold text-foreground">{totalPages}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg bg-surface border border-border text-tatt-gray hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg bg-surface border border-border text-tatt-gray hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Member Details Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0"
                        onClick={() => setSelectedMember(null)}
                    />
                    <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border bg-background/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-xl bg-background border border-border text-foreground font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                                    {selectedMember.profilePicture ? (
                                        <img 
                                            src={selectedMember.profilePicture} 
                                            alt="" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <span>{selectedMember.firstName?.[0] || 'U'}{selectedMember.lastName?.[0] || ''}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground">
                                        {selectedMember.firstName} {selectedMember.lastName}
                                    </h3>
                                    <p className="text-xs text-tatt-gray lowercase">
                                        {selectedMember.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="size-8 rounded-lg bg-background border border-border flex items-center justify-center text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-background/40 border border-border/60 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-tatt-gray">Membership Tier</span>
                                    <div>{getTierBadge(selectedMember.communityTier)}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-background/40 border border-border/60 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-tatt-gray">Chapter</span>
                                    <p className="font-semibold text-foreground truncate">{chapter?.name || "Assigned Chapter"}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-background/40 border border-border/60 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-tatt-gray">Profession</span>
                                    <p className="font-semibold text-foreground truncate">{selectedMember.professionTitle || "Not Specified"}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-background/40 border border-border/60 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-tatt-gray">Joined Date</span>
                                    <p className="font-semibold text-foreground">
                                        {new Date(selectedMember.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-border bg-background/40 flex justify-end gap-2.5">
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-background transition-all cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    router.push(`/admin/messages?to=${selectedMember.id}`);
                                    setSelectedMember(null);
                                }}
                                className="px-4 py-2 rounded-xl bg-tatt-lime text-tatt-black text-xs font-bold hover:brightness-105 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-tatt-lime/10"
                            >
                                <MessageSquare size={14} />
                                <span>Send Message</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ChapterMembersPage() {
    return (
        <Suspense fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-tatt-lime" size={36} />
                <p className="text-xs font-semibold text-tatt-gray">Loading directory...</p>
            </div>
        }>
            <ChapterMembersContent />
        </Suspense>
    );
}
