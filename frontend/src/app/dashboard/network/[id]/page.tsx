"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
    MapPin,
    Building2,
    Calendar,
    Briefcase,
    Lightbulb,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Mail,
    UserPlus,
    UserCheck,
    Clock,
    X,
    AlertCircle,
    Award,
    FileText,
    MessageSquare,
    ThumbsUp,
    MessageCircle,
    UserCircle,
    Lock
} from "lucide-react";

import api from "@/services/api";
import MembershipCard from "@/components/molecules/MembershipCard";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";

interface MemberProfile {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
    companyName: string | null;
    location: string | null;
    tattMemberId: string;
    communityTier: string;
    industry: string | { id: string; name: string } | null;
    chapterId: string | null;
    professionalHighlight: string | null;
    chapter: {
        id: string;
        name: string;
        code: string;
    } | null;
    createdAt?: string;
    linkedInProfileUrl?: string;
    expertise?: string;
    businessName?: string;
    businessRole?: string;
    businessProfileLink?: string;
    connectionPreference?: string;
    connectionCount?: number;
    interests?: { name: string }[];
    posts?: { id: string; content: string; createdAt: string }[];
}

const TIER_BADGES: Record<string, { label: string; classes: string }> = {
    KIONGOZI: { label: "KIONGOZI", classes: "bg-tatt-lime text-tatt-black" },
    IMANI: { label: "IMANI", classes: "bg-slate-200 text-neutral-700" },
    UBUNTU: { label: "UBUNTU", classes: "bg-neutral-100 border border-border text-tatt-gray" },
    FREE: { label: "FREE", classes: "bg-neutral-100 border border-border text-tatt-gray" },
};

export default function MemberProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [member, setMember] = useState<MemberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<any>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [connectMessage, setConnectMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const openModal = () => {
        if (user?.communityTier === 'FREE') {
            setIsUpgradeModalOpen(true);
            return;
        }
        setModalOpen(true);
        setConnectMessage("");
        setSendError(null);
    };

    const closeModal = () => {
        setModalOpen(false);
        setConnectMessage("");
        setSendError(null);
    };

    const handleSendInvite = async () => {
        if (!member) return;
        if (connectMessage.trim().length < 20) {
            setSendError("Please write at least 20 characters so the recipient knows why you want to connect.");
            return;
        }
        setSending(true);
        setSendError(null);
        try {
            await api.post("/connections/request", {
                recipientId: member.id,
                message: connectMessage.trim(),
            });
            setStatus({ status: "PENDING", initiatedBy: "ME" });
            closeModal();
        } catch (err: any) {
            setSendError(err.response?.data?.message || "Failed to send connection request.");
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const [profileRes, statusRes] = await Promise.all([
                    api.get(`/members/${id}`),
                    api.get(`/connections/status/${id}`)
                ]);
                setMember(profileRes.data);
                setStatus(statusRes.data);
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProfile();
        }
    }, [id]);

    const isStaff = user?.systemRole !== "COMMUNITY_MEMBER";
    const isProfileComplete = isStaff || user?.flags?.includes("PROFILE_COMPLETED");
    const isOwner = user?.id === id;

    if (isOwner && !isProfileComplete) {
        return (
            <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center bg-background p-6">
                <div className="max-w-2xl w-full text-center space-y-10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mx-auto size-32">
                        <div className="absolute inset-0 bg-tatt-lime/20 rounded-[32px] blur-2xl animate-pulse" />
                        <div className="relative size-full bg-surface border border-tatt-lime/20 rounded-[32px] flex items-center justify-center shadow-2xl">
                            <UserCircle className="h-16 w-16 text-tatt-lime" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-foreground tracking-tight">Your Professional Identity is Hidden</h1>
                        <p className="text-tatt-gray text-lg max-w-lg mx-auto font-medium leading-relaxed">
                            To activate your public profile and start connecting with global leaders, we require a completed professional background.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
                        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-tatt-lime/10 flex items-center justify-center shrink-0">
                                <Briefcase className="h-4 w-4 text-tatt-lime" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Profession & Industry</span>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-tatt-lime/10 flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-tatt-lime" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Location Profile</span>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-tatt-lime/10 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4 text-tatt-lime" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Professional Bio</span>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-tatt-lime/10 flex items-center justify-center shrink-0">
                                <Lightbulb className="h-4 w-4 text-tatt-lime" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Strategic Interests</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link 
                            href="/dashboard/settings"
                            className="px-10 py-4 bg-tatt-lime text-tatt-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20"
                        >
                            Complete Setup Now
                        </Link>
                        <button 
                            onClick={() => router.push('/dashboard/feed')}
                            className="px-10 py-4 bg-surface text-foreground font-black uppercase tracking-widest text-xs rounded-2xl border border-border hover:bg-black/5 transition-all"
                        >
                            Return to Feed
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {

        return (
            <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 text-tatt-lime animate-spin mb-4" />
                <p className="text-tatt-gray font-bold">Loading member profile...</p>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center bg-background">
                <h2 className="text-2xl font-black mb-2 text-foreground">Member Not Found</h2>
                <p className="text-tatt-gray mb-6">This member could not be found or their profile is private.</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-foreground text-background font-bold rounded-lg hover:brightness-110">
                    Go Back
                </button>
            </div>
        );
    }

    const tierObj = TIER_BADGES[member.communityTier] || TIER_BADGES["FREE"];
    const interestsArray = Array.from(new Set([
        ...(member.interests?.map(i => i.name) || []),
        ...(member.expertise ? member.expertise.split(',').map(s => s.trim()).filter(Boolean) : [])
    ]));

    const displayInterests = interestsArray.length > 0 ? interestsArray : ["General Member"];

    const connectionCount = member.connectionCount || 0;

    return (
        <div className="min-h-screen bg-surface flex flex-col min-w-0">
            {/* Hero Section */}
            <div className="relative w-full h-64 bg-gray-200">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/assets/tatt_profile_banner.png')" }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute top-6 left-6 z-10">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full backdrop-blur-md transition-colors text-sm font-bold">
                        <ArrowLeft className="h-4 w-4" /> Back to Network
                    </button>
                </div>
            </div>

            <div className="px-4 lg:px-12 -mt-20 relative z-10 pb-12 w-full max-w-[1400px] mx-auto">
                <div className="flex flex-col xl:flex-row gap-8 items-start">
                    
                    {/* Left Column: Main Profile Info */}
                    <div className="flex-grow w-full space-y-6">
                        
                        {/* Profile Header Card */}
                        <div className="bg-background rounded-xl shadow-sm border border-border p-6 lg:p-8">
                            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
                                <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                                    <div className="relative shrink-0">
                                        <div className="relative size-32 lg:size-40 rounded-xl border-4 border-background shadow-md bg-surface flex items-center justify-center overflow-hidden">
                                            {member.profilePicture ? (
                                                <img src={member.profilePicture} alt={`${member.firstName} ${member.lastName}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl lg:text-6xl font-black text-tatt-lime-dark">
                                                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        {member.communityTier === "KIONGOZI" && (
                                            <div className="absolute -bottom-2 -right-2 bg-tatt-lime text-tatt-black text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-bold tracking-tight text-foreground">{member.firstName} {member.lastName}</h2>
                                        <p className="text-tatt-gray font-medium">
                                            {member.professionTitle || "Professional Member"} {member.industry && `• ${typeof member.industry === 'object' ? member.industry.name : member.industry}`}
                                        </p>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="size-5 rounded-full overflow-hidden border border-border bg-surface flex items-center justify-center text-[10px] font-bold text-tatt-gray">
                                                <MapPin className="w-3 h-3" />
                                            </div>
                                            <span className="text-sm font-semibold text-foreground">
                                                {member.chapter ? member.chapter.name : member.location || "Global Network"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 w-full md:w-auto mt-6 md:mt-0">
                                    {user?.id !== member.id && (
                                        <>
                                            {status?.status === "ACCEPTED" ? (
                                                <>
                                                    <button className="flex-1 md:flex-none px-6 py-2.5 bg-green-500/10 text-green-600 font-bold rounded-lg text-sm justify-center gap-2 flex items-center cursor-default">
                                                        <UserCheck className="h-5 w-5" /> Connected
                                                    </button>
                                                    <button onClick={() => router.push("/dashboard/messages")} className="flex-1 md:flex-none px-6 py-2.5 bg-background border border-border text-foreground font-bold rounded-lg text-sm hover:bg-surface transition-all justify-center gap-2 flex items-center">
                                                        <Mail className="h-5 w-5" /> Message
                                                    </button>
                                                </>
                                            ) : status?.status === "PENDING" ? (
                                                <button disabled className="flex-1 md:flex-none px-6 py-2.5 bg-surface text-tatt-gray font-bold rounded-lg text-sm justify-center gap-2 flex items-center cursor-default border border-border">
                                                    <Clock className="h-5 w-5" /> {status.initiatedBy === "ME" ? "Pending" : "Needs Response"}
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={openModal}
                                                        className="flex-1 md:flex-none px-6 py-2.5 bg-tatt-lime text-tatt-black font-bold tracking-wide rounded-lg text-sm hover:brightness-95 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <UserPlus className="h-5 w-5" /> Connect
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Professional Background Summary */}
                            <div className="mt-10 pt-8 border-t border-border">
                                <h3 className="text-lg font-bold mb-4 text-foreground">Professional Background & Impact</h3>
                                <p className="text-foreground leading-relaxed opacity-90 max-w-3xl">
                                    {member.professionalHighlight ? member.professionalHighlight : `${member.firstName} is a highly valued member of our community. They have not added a professional highlight yet.`}
                                </p>
                            </div>
                        </div>

                        {/* Key Information Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {member.tattMemberId && member.communityTier !== "FREE" && (
                                <div className="bg-background p-5 rounded-xl border border-border flex items-start gap-3 sm:gap-4 h-full">
                                    <div className="size-10 sm:size-12 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0 mt-0.5">
                                        <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-tatt-gray font-bold uppercase tracking-wider">Member ID</p>
                                        <p className="text-sm md:text-base font-bold text-foreground break-words">
                                            {user?.id === member.id ? member.tattMemberId : '••••••••'}
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-background p-5 rounded-xl border border-border flex items-start gap-3 sm:gap-4 h-full">
                                <div className="size-10 sm:size-12 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0 mt-0.5">
                                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-tatt-gray font-bold uppercase tracking-wider">Joined Date</p>
                                    <p className="text-sm md:text-base font-bold text-foreground break-words">
                                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-background p-5 rounded-xl border border-border flex items-start gap-3 sm:gap-4 h-full">
                                <div className="size-10 sm:size-12 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shrink-0 mt-0.5">
                                    <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-tatt-gray font-bold uppercase tracking-wider">Profession</p>
                                    <p className="text-sm md:text-base font-bold text-foreground break-words">{member.professionTitle || "Member"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Interests & Expertise */}
                        <div className="bg-background rounded-xl border border-border p-6">
                            <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-foreground">
                                <Lightbulb className="h-6 w-6 text-tatt-lime-dark" /> Interests & Expertise
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {displayInterests.map((expertise, i) => (
                                    <span key={i} className="px-4 py-1.5 bg-tatt-lime/10 text-foreground font-semibold text-sm rounded-full">
                                        {expertise}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity Feed */}
                        <div className="bg-background rounded-xl border border-border overflow-hidden">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h3 className="text-lg font-bold text-foreground">Recent Activities</h3>
                                <button onClick={() => router.push('/dashboard/feed')} className="text-tatt-lime-dark font-bold text-sm hover:underline">View All</button>
                            </div>
                            <div className="divide-y divide-border">
                                {member.posts && member.posts.length > 0 ? (
                                    member.posts.map((post) => (
                                        <div key={post.id} className="p-6 hover:bg-surface/50 transition-colors cursor-pointer" onClick={() => router.push(`/app/share/${post.id}`)}>
                                            <div className="flex gap-4">
                                                <div className="size-10 rounded-full bg-surface flex items-center justify-center shrink-0 border border-border">
                                                    <MessageSquare className="h-5 w-5 text-tatt-gray" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-foreground line-clamp-2">{post.content}</p>
                                                    <p className="text-xs text-tatt-gray">
                                                        {new Date(post.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-sm text-tatt-gray italic">No recent activities.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar Widgets */}
                    <div className="w-full xl:w-96 space-y-6 shrink-0">
                        {/* Digital Identity Card — only visible to the member themselves */}
                        {user?.id === member.id && (
                            <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-tatt-gray uppercase tracking-widest mb-4">Digital Identity Card</h3>
                                {member && (
                                    <MembershipCard
                                        member={{
                                            ...member,
                                            chapterName: member.chapter?.name,
                                            chapterCode: member.chapter?.code,
                                            createdAt: member.createdAt || new Date().toISOString()
                                        }}
                                        isCurrentUser={true}
                                    />
                                )}
                                <p className="mt-4 text-xs text-tatt-gray text-center font-medium italic">Verified by TATT Global Compliance</p>
                            </div>
                        )}
                        
                        {/* Connections Widget */}
                        <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-tatt-gray uppercase tracking-widest">Network</h3>
                                <span className="text-xl font-bold text-foreground">{connectionCount}</span>
                            </div>
                            {connectionCount > 0 ? (
                                <>
                                    <div className="flex -space-x-2 overflow-hidden mb-6">
                                        <div className="inline-block size-10 rounded-full ring-2 ring-background bg-tatt-lime/20 flex flex-col items-center justify-center text-[10px] font-bold text-tatt-lime-dark">
                                            <span>+{connectionCount}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-tatt-gray mb-6 leading-relaxed">
                                        {member.firstName} is connected with policy makers and NGO leaders from across the diaspora network.
                                    </p>
                                    <button onClick={() => router.push('/dashboard/network')} className="w-full py-2.5 border border-border rounded-lg text-sm font-bold hover:bg-surface transition-colors text-foreground">
                                        View All Connections
                                    </button>
                                </>
                            ) : (
                                <p className="text-sm text-tatt-gray italic">No connections yet.</p>
                            )}
                        </div>

                        {/* Business/Enterprise Widget (Only for Kiongozi) */}
                        {member.communityTier === "KIONGOZI" && (
                            <div className="bg-surface rounded-xl border-2 border-tatt-lime/20 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-10 rounded-lg bg-tatt-lime flex items-center justify-center text-tatt-black shrink-0">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">{member.businessName || member.companyName || "Verified Enterprise"}</h3>
                                        <p className="text-[10px] font-bold text-tatt-lime-dark uppercase tracking-tighter">Verified Enterprise</p>
                                    </div>
                                </div>
                                <p className="text-xs text-tatt-gray leading-relaxed mb-4">
                                    As a Kiongozi member, this enterprise receives premium placement and priority partnership matchmaking within the network.
                                </p>
                                <button className="w-full py-2.5 bg-foreground text-background rounded-lg text-sm font-bold hover:brightness-125 transition-all outline-none">
                                    View Business Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Connection Request Modal ───────────────────────────────── */}
            {modalOpen && member && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-background w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-tatt-black pt-10 pb-8 px-8 text-center flex flex-col items-center relative">
                            <button onClick={closeModal} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                            <div className="relative mb-6">
                                <div className="size-24 rounded-full overflow-hidden border-4 border-tatt-black ring-4 ring-tatt-lime bg-tatt-lime/10 flex items-center justify-center relative">
                                    {member.profilePicture ? (
                                        <img src={member.profilePicture} alt={member.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-tatt-lime">
                                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <span className={`absolute -bottom-3 right-1/2 translate-x-1/2 text-[11px] font-black uppercase tracking-tight px-3 py-0.5 rounded-full whitespace-nowrap ${tierObj?.classes || "bg-tatt-gray/20 text-tatt-gray"}`}>
                                    {tierObj?.label || member.communityTier}
                                </span>
                            </div>
                            <h3 className="text-[22px] font-bold text-white mt-1">
                                Connect with {member.firstName} {member.lastName}
                            </h3>
                            <p className="text-white/70 text-[15px] mt-1.5 font-medium">
                                {[member.professionTitle, member.chapter?.name].filter(Boolean).join(" • ")}
                            </p>
                        </div>
                        {/* Modal Body */}
                        <div className="p-8 flex flex-col gap-6 bg-background">
                            <div className="flex flex-col gap-3">
                                <label className="text-[15px] font-bold text-foreground" htmlFor="connect-msg">
                                    Add a personalized message
                                </label>
                                <textarea
                                    id="connect-msg"
                                    rows={4}
                                    className="w-full p-5 bg-surface border border-border rounded-2xl text-foreground placeholder:text-tatt-gray text-[15px] focus:ring-2 focus:ring-tatt-lime outline-none transition-all resize-none shadow-inner"
                                    placeholder={`Hi ${member.firstName}, I'd love to connect...`}
                                    value={connectMessage}
                                    onChange={(e) => { setConnectMessage(e.target.value); setSendError(null); }}
                                    maxLength={500}
                                />
                            </div>
                            {sendError && (
                                <div className="flex items-start gap-4 p-5 bg-red-50 rounded-2xl border border-red-200">
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 font-medium">{sendError}</p>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                <button
                                    onClick={handleSendInvite}
                                    disabled={sending || connectMessage.trim().length < 20}
                                    className="flex-1 flex items-center justify-center py-4 bg-tatt-lime text-tatt-black text-[13px] font-black rounded-xl uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Send Invitation
                                </button>
                                <button
                                    onClick={closeModal}
                                    disabled={sending}
                                    className="flex-1 py-4 bg-surface text-foreground text-[13px] font-black rounded-xl uppercase tracking-widest border border-border hover:bg-black/5 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Upgrade Required Modal */}
            {isUpgradeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsUpgradeModalOpen(false)} />
                    <div className="relative bg-tatt-black w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10 text-center p-8 sm:p-10">
                        <div className="size-20 bg-tatt-lime/10 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                            <Lock className="h-10 w-10 text-tatt-lime" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-4">Strategic Connection Locked</h2>
                        <p className="text-white/60 text-sm leading-relaxed mb-8">
                            Expanding your professional network is a premium TATT feature. Upgrade to Ubuntu, Imani, or Kiongozi to send connection requests and build your circle.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <Link 
                                href="/dashboard/upgrade"
                                className="w-full bg-tatt-lime text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20"
                            >
                                View Plans & Upgrade
                            </Link>
                            <button 
                                onClick={() => setIsUpgradeModalOpen(false)}
                                className="w-full py-4 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
