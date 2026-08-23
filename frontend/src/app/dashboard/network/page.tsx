"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    Users,
    MapPin,
    Briefcase,
    UserPlus,
    Clock,
    UserCheck,
    Loader2,
    ChevronDown,
    X,
    Building2,
    Eye,
    Send,
    AlertCircle,
    Zap,
    Lock,
    ArrowRight,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Chapter {
    id: string;
    name: string;
    code: string;
}

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
    companyName: string | null;
    location: string | null;
    tattMemberId: string;
    communityTier: string;
    industry: string | null;
    chapterId: string | null;
    chapter: Chapter | null;
}

interface ConnectModalState {
    open: boolean;
    member: Member | null;
}

const TIER_BADGES: Record<string, { label: string; classes: string }> = {
    KIONGOZI: { label: "Kiongozi", classes: "bg-tatt-lime text-tatt-black" },
    IMANI: { label: "Imani", classes: "bg-slate-200 text-neutral-700" },
    UBUNTU: { label: "Ubuntu", classes: "bg-neutral-100 border border-border text-tatt-gray" },
    FREE: { label: "Free", classes: "bg-neutral-100 border border-border text-tatt-gray" },
};

export default function NetworkPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalMembers, setTotalMembers] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedChapter, setSelectedChapter] = useState("");
    const [selectedIndustry, setSelectedIndustry] = useState("");
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, any>>({});

    // Modal state
    const [modal, setModal] = useState<ConnectModalState>({ open: false, member: null });
    const [connectMessage, setConnectMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    // Free-tier upgrade prompt
    const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
    const [paidPlans, setPaidPlans] = useState<{ name: string; tier: string; monthlyPrice: number }[]>([]);

    // Fetch plans once for the upgrade prompt
    useEffect(() => {
        api.get("/billing/plans")
            .then((r) => {
                const plans = Array.isArray(r.data) ? r.data : [];
                setPaidPlans(plans.filter((p: any) => p.monthlyPrice > 0));
            })
            .catch(() => {});
    }, []);

    const industries = [
        "Technology", "Finance", "Healthcare", "Education", "Real Estate",
        "Energy", "Agriculture", "Manufacturing", "Legal", "Arts & Entertainment"
    ];

    const fetchChapters = async () => {
        try {
            const res = await api.get("/chapters");
            setChapters(res.data);
        } catch (err) {
            console.error("Failed to fetch chapters", err);
        }
    };

    const fetchConnectionStatuses = async (memberList: Member[]) => {
        const newStatuses: Record<string, any> = {};
        for (const m of memberList) {
            try {
                const res = await api.get(`/connections/status/${m.id}`);
                newStatuses[m.id] = res.data;
            } catch (_) { /* ignore */ }
        }
        setConnectionStatuses(prev => ({ ...prev, ...newStatuses }));
    };

    const fetchMembers = useCallback(async (isNewSearch = false) => {
        if (isNewSearch) {
            setLoading(true);
            setPage(1);
        } else {
            setLoadingMore(true);
        }

        try {
            const currentPage = isNewSearch ? 1 : page;
            const res = await api.get("/members", {
                params: {
                    search: searchTerm || undefined,
                    chapterId: selectedChapter || undefined,
                    industry: selectedIndustry || undefined,
                    page: currentPage,
                    limit: 12,
                }
            });

            // Filter out the current logged-in user
            const filtered = res.data.members.filter((m: Member) => m.id !== user?.id);

            if (isNewSearch) {
                setMembers(filtered);
            } else {
                setMembers(prev => [...prev, ...filtered]);
            }

            setTotalMembers(res.data.meta.total - 1); // -1 for self
            setTotalPages(res.data.meta.totalPages);

            // Fetch connection statuses in background
            fetchConnectionStatuses(filtered);

        } catch (err) {
            console.error("Failed to fetch members", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchTerm, selectedChapter, selectedIndustry, page, user?.id]);

    useEffect(() => { fetchChapters(); }, []);
    useEffect(() => { fetchMembers(true); }, [selectedChapter, selectedIndustry]);
    useEffect(() => { if (page > 1) fetchMembers(); }, [page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMembers(true);
    };

    const handleLoadMore = () => {
        if (page < totalPages) setPage(prev => prev + 1);
    };

    // ── Modal ────────────────────────────────────────────────────
    const openModal = (member: Member) => {
        // Free members cannot connect — show upgrade prompt instead
        if (!user?.communityTier || user.communityTier === "FREE") {
            setUpgradePromptOpen(true);
            return;
        }
        setModal({ open: true, member });
        setConnectMessage("");
        setSendError(null);
    };

    const closeModal = () => {
        setModal({ open: false, member: null });
        setConnectMessage("");
        setSendError(null);
    };

    const handleSendInvite = async () => {
        if (!modal.member) return;
        if (connectMessage.trim().length < 20) {
            setSendError("Please write at least 20 characters so the recipient knows why you want to connect.");
            return;
        }
        setSending(true);
        setSendError(null);
        try {
            await api.post("/connections/request", {
                recipientId: modal.member.id,
                message: connectMessage.trim(),
            });
            setConnectionStatuses(prev => ({
                ...prev,
                [modal.member!.id]: { status: "PENDING", initiatedBy: "ME" },
            }));
            closeModal();
        } catch (err: any) {
            setSendError(err.response?.data?.message || "Failed to send connection request.");
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <div className="p-4 lg:p-8 space-y-8">
                {/* Page Header */}
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-foreground">
                        Member Network
                    </h2>
                    <p className="text-tatt-gray text-sm md:text-base font-medium">
                        Discover and connect with professionals across the African Diaspora.
                    </p>
                </div>

                {/* Filters & Search */}
                <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-4">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tatt-gray" />
                            <input
                                type="text"
                                placeholder="Search by name, company, or title..."
                                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-tatt-lime focus:border-tatt-lime outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="relative">
                                <select
                                    className="bg-background border border-border rounded-xl px-4 py-2.5 pr-8 text-sm appearance-none outline-none focus:ring-2 focus:ring-tatt-lime cursor-pointer"
                                    value={selectedChapter}
                                    onChange={(e) => setSelectedChapter(e.target.value)}
                                >
                                    <option value="">All Chapters</option>
                                    {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-tatt-gray pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select
                                    className="bg-background border border-border rounded-xl px-4 py-2.5 pr-8 text-sm appearance-none outline-none focus:ring-2 focus:ring-tatt-lime cursor-pointer"
                                    value={selectedIndustry}
                                    onChange={(e) => setSelectedIndustry(e.target.value)}
                                >
                                    <option value="">All Industries</option>
                                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-tatt-gray pointer-events-none" />
                            </div>

                            <button type="submit" className="bg-tatt-lime text-tatt-black font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 text-sm">
                                Search
                            </button>

                            {(searchTerm || selectedChapter || selectedIndustry) && (
                                <button type="button" onClick={() => { setSearchTerm(""); setSelectedChapter(""); setSelectedIndustry(""); fetchMembers(true); }} className="p-2.5 text-tatt-gray hover:text-foreground transition-colors" title="Clear">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 text-tatt-lime animate-spin mb-4" />
                        <p className="text-tatt-gray font-bold">Discovering members...</p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-24 bg-surface rounded-2xl border border-dashed border-border">
                        <Users className="h-12 w-12 text-tatt-gray mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-black text-foreground mb-1">No members found</h3>
                        <p className="text-tatt-gray text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {members.map((member) => {
                                const status = connectionStatuses[member.id];
                                const tier = TIER_BADGES[member.communityTier] ?? TIER_BADGES["FREE"];

                                return (
                                    <div
                                        key={member.id}
                                        className="group bg-surface rounded-2xl border border-border shadow-sm flex flex-col items-center text-center hover:shadow-xl hover:shadow-tatt-lime/5 hover:border-tatt-lime/30 transition-all duration-300 overflow-hidden"
                                    >
                                        {/* Avatar area */}
                                        <div className="pt-8 pb-4 px-6 flex flex-col items-center w-full">
                                            <div className="relative mb-4">
                                                <div className="size-24 rounded-full overflow-hidden border-4 border-tatt-lime/30 ring-4 ring-tatt-lime/10 bg-tatt-lime/5 flex items-center justify-center relative">
                                                    {member.profilePicture ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={member.profilePicture} alt={member.firstName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-2xl font-black text-tatt-lime-dark">
                                                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Tier badge */}
                                                <span className={`absolute -bottom-1 -right-1 text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full ${(TIER_BADGES[member.communityTier] || { label: "Free", classes: "bg-neutral-100 border border-border text-tatt-gray" }).classes}`}>
                                                    {(TIER_BADGES[member.communityTier] || { label: "Free", classes: "bg-neutral-100 border border-border text-tatt-gray" }).label}
                                                </span>
                                            </div>

                                            {/* Name */}
                                            <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-tatt-lime-dark transition-colors">
                                                {member.firstName} {member.lastName}
                                            </h3>

                                            {/* Role */}
                                            {member.professionTitle ? (
                                                <p className="text-sm text-tatt-gray mt-1 font-medium italic truncate max-w-full">
                                                    {member.professionTitle}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-tatt-gray/40 mt-1 italic">No title set</p>
                                            )}

                                            {/* Chapter pill */}
                                            {member.chapter ? (
                                                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-tatt-gray bg-background px-3 py-1 rounded-full uppercase tracking-widest border border-border">
                                                    <Building2 className="h-3 w-3 text-tatt-lime shrink-0" />
                                                    {member.chapter.name}
                                                </div>
                                            ) : member.location ? (
                                                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-tatt-gray bg-background px-3 py-1 rounded-full uppercase tracking-widest border border-border">
                                                    <MapPin className="h-3 w-3 text-tatt-lime shrink-0" />
                                                    {member.location}
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Buttons — always same row */}
                                        <div className="w-full px-6 pb-6 mt-auto grid grid-cols-2 gap-3">
                                            {/* Connect / Status button */}
                                            {status?.status === "ACCEPTED" ? (
                                                <button disabled className="flex items-center justify-center gap-1.5 bg-green-500/10 text-green-600 font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wide cursor-default">
                                                    <UserCheck className="h-3.5 w-3.5" /> Connected
                                                </button>
                                            ) : status?.status === "PENDING" ? (
                                                <Link
                                                    href="/dashboard/messages"
                                                    className="flex items-center justify-center gap-1.5 bg-tatt-lime/10 text-tatt-lime-dark font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wide hover:bg-tatt-lime/20 transition-all"
                                                >
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {status.initiatedBy === "ME" ? "Sent" : "Respond"}
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() => openModal(member)}
                                                    className="flex items-center justify-center gap-1.5 bg-tatt-lime text-tatt-black font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wide hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-sm shadow-tatt-lime/20"
                                                >
                                                    <UserPlus className="h-3.5 w-3.5" /> Connect
                                                </button>
                                            )}

                                            {/* View Profile */}
                                            <Link
                                                href={`/dashboard/network/${member.id}`}
                                                className="flex items-center justify-center gap-1.5 bg-background border border-border text-foreground font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wide hover:bg-tatt-black hover:text-white   transition-all"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Profile
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Load More */}
                        {page < totalPages && (
                            <div className="flex flex-col items-center pt-8 gap-2">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="flex items-center gap-2 bg-surface border border-border px-8 py-3 rounded-full text-sm font-bold text-foreground hover:border-tatt-lime hover:text-tatt-lime-dark transition-all disabled:opacity-50 shadow-sm"
                                >
                                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Show More Thinking Partners
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                <p className="text-xs text-tatt-gray">{members.length} of {totalMembers} members</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Connection Request Modal ───────────────────────────────── */}
            {modal.open && modal.member && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-surface w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col">

                        {/* Modal Header */}
                        <div className="bg-[#1a1a15] pt-10 pb-8 px-8 text-center flex flex-col items-center relative">
                            <button onClick={closeModal} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>

                            <div className="relative mb-6">
                                <div className="size-24 rounded-full overflow-hidden border-4 border-[#1a1a15] ring-4 ring-tatt-lime bg-tatt-lime/10 flex items-center justify-center relative">
                                    {modal.member.profilePicture ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={modal.member.profilePicture} alt={modal.member.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-tatt-lime">
                                            {modal.member.firstName.charAt(0)}{modal.member.lastName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <span className={`absolute -bottom-3 right-1/2 translate-x-1/2 text-[11px] font-black uppercase tracking-tight px-3 py-0.5 rounded-full whitespace-nowrap ${(TIER_BADGES[modal.member?.communityTier ?? "FREE"] || { label: "Free", classes: "bg-neutral-100 border border-border text-tatt-gray" }).classes}`}>
                                    {(TIER_BADGES[modal.member?.communityTier ?? "FREE"] || { label: "Free", classes: "bg-neutral-100 border border-border text-tatt-gray" }).label}
                                </span>
                            </div>

                            <h3 className="text-[22px] font-bold text-white mt-1">
                                Connect with {modal.member.firstName} {modal.member.lastName}
                            </h3>
                            <p className="text-[#a1a396] text-[15px] mt-1.5 font-medium">
                                {[modal.member.professionTitle, modal.member.chapter?.name].filter(Boolean).join(" • ")}
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 flex flex-col gap-6 bg-surface">
                            <div className="flex flex-col gap-3">
                                <label className="text-[15px] font-bold text-black flex items-center gap-1" htmlFor="connect-msg">
                                    Add a personalized message <span className="text-red-500 font-bold">*</span>
                                </label>
                                <textarea
                                    id="connect-msg"
                                    rows={4}
                                    required
                                    className="w-full p-5 bg-[#f5f5f5]  border border-border  rounded-2xl text-black  placeholder:text-gray-500 text-[15px] focus:ring-2 focus:ring-tatt-lime outline-none transition-all resize-none shadow-inner"
                                    placeholder={`Hi ${modal.member.firstName}, I'd love to connect... (Required)`}
                                    value={connectMessage}
                                    onChange={(e) => { setConnectMessage(e.target.value); setSendError(null); }}
                                    maxLength={500}
                                />
                            </div>


                            {sendError && (
                                <div className="flex items-start gap-4 p-5 bg-red-50  rounded-2xl border border-red-200 ">
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600  font-medium">{sendError}</p>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                <button
                                    onClick={handleSendInvite}
                                    disabled={sending || !connectMessage.trim()}
                                    className="flex-1 flex items-center justify-center py-4 bg-tatt-lime text-black text-[13px] font-black rounded-xl uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Send Invitation
                                </button>
                                <button
                                    onClick={closeModal}
                                    disabled={sending}
                                    className="flex-1 py-4 bg-[#fcfcfc]  text-black  text-[13px] font-black rounded-xl uppercase tracking-widest border border-gray-200  hover:bg-gray-50  transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Free-Tier Upgrade Prompt ───────────────────────────────── */}
            {upgradePromptOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setUpgradePromptOpen(false); }}
                >
                    <div className="bg-tatt-black w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-tatt-lime/20">
                        {/* Header */}
                        <div className="relative pt-10 pb-8 px-8 text-center">
                            <button
                                onClick={() => setUpgradePromptOpen(false)}
                                className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Icon */}
                            <div className="size-16 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center mx-auto mb-5">
                                <Lock className="h-7 w-7 text-tatt-lime" />
                            </div>

                            <h3 className="text-2xl font-black text-white tracking-tight">
                                Members-Only Feature
                            </h3>
                            <p className="text-white/50 text-sm font-medium mt-2 leading-relaxed">
                                Connecting with other members is exclusive to paid plan holders. Upgrade your membership to start building your network.
                            </p>
                        </div>

                        {/* Plans teaser — from backend */}
                        <div className="mx-8 mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                            {paidPlans.length === 0 ? (
                                <p className="text-white/40 text-xs text-center">Loading plans...</p>
                            ) : (
                                paidPlans.map((plan) => (
                                    <div key={plan.tier} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-3.5 w-3.5 text-tatt-lime shrink-0" />
                                            <span className="text-white font-bold text-sm">{plan.name}</span>
                                        </div>
                                        <span className="text-tatt-lime text-xs font-black">${plan.monthlyPrice}/mo</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* CTAs */}
                        <div className="px-8 pb-8 flex flex-col gap-3">
                            <button
                                onClick={() => { setUpgradePromptOpen(false); router.push("/dashboard/upgrade"); }}
                                className="flex items-center justify-center gap-2 w-full py-4 bg-tatt-lime text-tatt-black font-black text-sm uppercase tracking-widest rounded-2xl hover:brightness-105 transition-all"
                            >
                                View Plans & Upgrade
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setUpgradePromptOpen(false)}
                                className="w-full py-3 text-white/40 font-bold text-sm hover:text-white transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
