"use client";

import { useEffect, useState, useRef } from "react";
import {
    Search,
    MoreHorizontal,
    ThumbsUp,
    MessageSquare,
    Share2,
    Image as ImageIcon,
    BarChart2,
    Paperclip,
    Bell,
    Plus,
    TrendingUp,
    UserPlus,
    Calendar,
    MapPin,
    Video,
    Lock,
    ExternalLink,
    X,
    CheckCircle2,
    Briefcase,
    Zap,
    GraduationCap,
    Info,
    ChevronDown,
    ChevronUp,
    Send,
    Bookmark,
    Highlighter,
    Repeat2,
    Link2,
    ArrowBigUp,
    Flag,
    Eye,
    Trash2,
    ChevronRight,
    AlertCircle,
    Clock,
    Pencil,
    Loader2
} from "lucide-react";

import Link from "next/link";
import { useTermsModal } from "@/context/terms-context";

import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { PostCard } from "@/components/feed/post-card";
import toast from "react-hot-toast";
import { formatTimeAgo, formatForDateTimeLocal } from "@/utils/date";
import { initiateFeedSocket, disconnectFeedSocket } from "@/services/feed-socket";
import { usePostViewTracker } from "@/hooks/use-post-view-tracker";
import { AppModal } from "@/components/modals/app-modal";
import { CreatePostModal } from "@/components/feed/create-post-modal";
import {
    Modal,
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseTrigger,
    Dropdown,
    DropdownTrigger,
    DropdownPopover,
    DropdownMenu,
    DropdownItem,
    Button
} from "@heroui/react";

// --- Types ---

interface PostAuthor {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
    communityTier: string;
    tattMemberId: string;
}

interface PostChapter {
    id: string;
    name: string;
    code: string;
}

interface Post {
    id: string;
    type: "GENERAL" | "RESOURCE" | "EVENT" | "ANNOUNCEMENT" | "JOB";
    isPremium: boolean;
    isPremiumLocked: boolean;
    title: string | null;
    content: string | null;
    contentFormat: "PLAIN" | "MARKDOWN" | "HTML";
    mediaUrls: string[];
    tags: string[];
    author: PostAuthor;
    chapter: PostChapter | null;
    isBookmarked: boolean;
    isHighlighted: boolean;
    likesCount: number;
    upvotesCount: number;
    commentsCount: number;
    viewsCount: number;
    isLikedByMe: boolean;
    isUpvotedByMe: boolean;
    createdAt: string;
    updatedAt: string;
    parentPost?: Post;
    topic?: { id: string; name: string } | null;
    jobLink?: string;
    jobLocation?: string;
    jobCompany?: string;
    eventType?: string | null;
    eventDate?: string | null;
    eventUrl?: string | null;
}

interface Comment {
    id: string;
    postId: string;
    content: string;
    author: {
        id: string;
        firstName: string;
        lastName: string;
        profilePicture: string | null;
        professionTitle: string | null;
    };
    replies: any[];
    createdAt: string;
    updatedAt?: string;
}

interface Recommendation {
    member: {
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
    };
    matchReason: {
        sharedInterestCount: number;
        sharedInterestNames: string[];
        sameIndustry: boolean;
        sameChapter: boolean;
        score: number;
    };
    canConnect: boolean;
}

interface TATTEvent {
    id: string;
    title: string;
    type: string;
    dateTime: string;
    imageUrl: string | null;
    locations: Array<{
        chapter: {
            id: string;
            name: string;
            code: string;
        };
        address: string;
    }>;
}

const POST_TYPES = [
    { id: "GENERAL", name: "General Update", icon: MessageSquare, description: "Share a thought, insight, or status update." },
    { id: "EVENT", name: "Event or Workshop", icon: Calendar, description: "Promote a chapter event, webinar, or workshop." },
    { id: "RESOURCE", name: "Strategic Resource", icon: Briefcase, description: "Share reports, whitepapers, or strategic frameworks." },
    { id: "ANNOUNCEMENT", name: "Organization Announcement", icon: Zap, description: "Official TATT news and major updates." },
    { id: "JOB", name: "Job Announcement", icon: Briefcase, description: "Share available career opportunities with the network." },
];

export default function FeedPage() {
    const { showTerms } = useTermsModal();
    const { user } = useAuth();
    const { registerPostRef } = usePostViewTracker();

    const [posts, setPosts] = useState<Post[]>([]);
    const [filter, setFilter] = useState<"ALL" | "CHAPTER" | "PREMIUM" | "BOOKMARKS">("ALL");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<TATTEvent[]>([]);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [connectModal, setConnectModal] = useState<{ open: boolean; member: any }>({ open: false, member: null });
    const [connectMessage, setConnectMessage] = useState("");
    const [isSendingConnect, setIsSendingConnect] = useState(false);
    const [isProfilePromptOpen, setIsProfilePromptOpen] = useState(false);
    const [activeInsight, setActiveInsight] = useState<any>(null);
    const [topics, setTopics] = useState<any[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [postTopicId, setPostTopicId] = useState<string>("");
    const [eventType, setEventType] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventUrl, setEventUrl] = useState("");

    // Sidebar loading
    const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);

    // Real-time states
    const [newPostsAvailableCount, setNewPostsAvailableCount] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchFeed(1, filter, true);
    }, [filter, selectedTopic]);

    useEffect(() => {
        fetchSidebarData();
    }, [user?.id]);

    // ── Real-time Feed Socket (Isolated) ──────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;

        const socket = initiateFeedSocket();
        
        socket.on('new_post', (newPost: any) => {
            if (newPost.authorId === user?.id) return;

            const isAtTop = typeof window !== 'undefined' && window.scrollY < 100;
            // Note: We use the *current* values of filter and page here.
            // Since this listener is stable, we might need a ref for filter if we want to check it here,
            // or we just handle the notification logic.
            
            toast("New professional insights are available above.", { icon: '🔥' });
        });

        socket.on('new_comment', (data: any) => {
             // Optional: Handle real-time comment bubble updates
        });

        return () => {
            disconnectFeedSocket();
        };
    }, [user?.id]); // ONLY reconnect if user changes

    const fetchFeed = async (pageNum: number, currentFilter: string, reset: boolean = false) => {
        setIsLoadingPosts(true);
        try {
            const res = await api.get("/feed", {
                params: {
                    filter: currentFilter,
                    page: pageNum,
                    limit: 10,
                    topicId: selectedTopic || undefined
                }
            });
            const newPosts = res.data.data;
            if (reset) {
                setPosts(newPosts);
            } else {
                setPosts(prev => [...prev, ...newPosts]);
            }
            setHasMore(res.data.meta.page < res.data.meta.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error("Error fetching feed:", error);
            toast.error("Failed to load feed");
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const fetchSidebarData = async () => {
        setIsLoadingSidebar(true);
        try {
            const [recRes, eventRes, curationRes, topicsRes] = await Promise.all([
                api.get("/connections/recommend", { params: { limit: 3 } }),
                api.get("/events", { params: { upcoming: "true", limit: 2 } }),
                api.get("/feed/curation/active"),
                api.get("/feed/topics")
            ]);
            setRecommendations(recRes.data);
            setUpcomingEvents(eventRes.data || []);
            setActiveInsight(curationRes.data?.insight);
            setTopics(topicsRes.data);
        } catch (error) {
            console.error("Error fetching sidebar data:", error);
        } finally {
            setIsLoadingSidebar(false);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            const res = await api.post(`/feed/${postId}/like`);
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        isLikedByMe: res.data.liked,
                        likesCount: res.data.liked ? p.likesCount + 1 : p.likesCount - 1
                    };
                }
                return p;
            }));
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const [isUpgradePromptOpen, setIsUpgradePromptOpen] = useState(false);

    const handleConnect = (member: any) => {
        if (user?.communityTier === 'FREE') {
            setIsUpgradePromptOpen(true);
            return;
        }
        setConnectModal({ open: true, member });
        setConnectMessage("");
    };

    const submitConnect = async () => {
        if (!connectModal.member || !connectMessage.trim()) return;
        setIsSendingConnect(true);
        try {
            await api.post("/connections/request", {
                recipientId: connectModal.member.id,
                message: connectMessage
            });
            toast.success("Connection request sent!");
            setConnectModal({ open: false, member: null });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send request");
        } finally {
            setIsSendingConnect(false);
        }
    };

    const isStaff = user?.systemRole !== "COMMUNITY_MEMBER";
    const isPaid = user?.communityTier && user.communityTier !== "FREE";
    // Allow all authenticated users to post; profile completion is advisory only
    const isProfileComplete = true;

    const handleCreatePostTrigger = () => {
        if (!isProfileComplete) {
            setIsProfilePromptOpen(true);
            return;
        }
        setIsCreatePostModalOpen(true);
    };

    // All authenticated members can use all post types
    const allowedPostTypes = POST_TYPES;

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "KIONGOZI": return "bg-tatt-lime text-black";
            case "IMANI": return "bg-tatt-black text-white border border-white/20";
            case "UBUNTU": return "bg-white/10 text-white border border-white/10";
            default: return "bg-tatt-gray/20 text-tatt-gray";
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-[1400px] mx-auto min-h-screen bg-transparent">

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Feed Column */}
                <div className="flex-1 space-y-6">
                    {/* Post Composer Trigger */}
                    <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
                        <div className="p-4 flex gap-4">
                            <div className="size-11 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center font-bold text-tatt-lime shrink-0 overflow-hidden relative">
                                {user?.profilePicture ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                                )}
                            </div>
                            <button
                                onClick={handleCreatePostTrigger}
                                className="flex-1 text-left bg-background hover:bg-black/5  border border-border rounded-xl px-4 py-3 text-tatt-gray transition-colors"
                            >
                                {isProfileComplete 
                                    ? "Share a strategic update, research, or poll..." 
                                    : "Complete your professional profile to start posting..."}
                            </button>
                        </div>
                        <div className="px-5 py-3 bg-black/5  border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={handleCreatePostTrigger}
                                    className="p-2 text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10 rounded-lg transition-all" title="Add Image"
                                >
                                    <ImageIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={handleCreatePostTrigger}
                                    className="p-2 text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10 rounded-lg transition-all" title="Create Poll"
                                >
                                    <BarChart2 className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={handleCreatePostTrigger}
                                    className="p-2 text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10 rounded-lg transition-all" title="Attach Document"
                                >
                                    <Paperclip className="h-5 w-5" />
                                </button>
                            </div>
                            <button
                                onClick={handleCreatePostTrigger}
                                className={`font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg ${
                                    isProfileComplete 
                                        ? "bg-tatt-lime text-black hover:scale-[1.02] active:scale-95 shadow-tatt-lime/10" 
                                        : "bg-tatt-gray/20 text-tatt-gray cursor-not-allowed"
                                }`}
                            >
                                Post Update
                            </button>
                        </div>
                    </div>

                    {!isProfileComplete && (
                        <div className="bg-gradient-to-r from-tatt-lime/20 to-transparent border border-tatt-lime/30 rounded-2xl p-5 flex items-start gap-4">
                            <div className="size-10 rounded-xl bg-tatt-lime/20 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-5 w-5 text-tatt-lime" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-foreground">Identity Verification Required</h4>
                                <p className="text-xs text-tatt-gray mt-1 leading-relaxed">
                                    To maintain the integrity of our strategic network, we require all members to complete their professional background (Title, Industry, Bio, and Interests) before posting or commenting.
                                </p>
                                <Link 
                                    href="/dashboard/settings" 
                                    className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-tatt-lime hover:gap-2 transition-all"
                                >
                                    Complete Profile Now <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    )}


                    {/* Feed Filters */}
                    <div className="flex border-b border-border sticky top-16 z-30 bg-background/80 backdrop-blur-md pt-2 px-1 gap-6 lg:gap-8 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setFilter("ALL")}
                            className={`pb-4 border-b-2 transition-all text-sm whitespace-nowrap ${filter === "ALL" ? "border-tatt-lime text-foreground font-bold" : "border-transparent text-tatt-gray hover:text-foreground font-medium"}`}
                        >
                            All Posts
                        </button>
                        <button
                            onClick={() => setFilter("CHAPTER")}
                            className={`pb-4 border-b-2 transition-all text-sm whitespace-nowrap ${filter === "CHAPTER" ? "border-tatt-lime text-foreground font-bold" : "border-transparent text-tatt-gray hover:text-foreground font-medium"}`}
                        >
                            My Chapter
                        </button>
                        {isPaid && (
                            <button
                                onClick={() => setFilter("PREMIUM")}
                                className={`pb-4 border-b-2 transition-all text-sm whitespace-nowrap ${filter === "PREMIUM" ? "border-tatt-lime text-foreground font-bold" : "border-transparent text-tatt-gray hover:text-foreground font-medium"}`}
                            >
                                <span className="flex items-center gap-2">
                                    Premium Posts
                                    <Lock className="h-3 w-3 text-tatt-lime fill-tatt-lime" />
                                </span>
                            </button>
                        )}
                        <button
                            onClick={() => setFilter("BOOKMARKS")}
                            className={`pb-4 border-b-2 transition-all text-sm whitespace-nowrap ${filter === "BOOKMARKS" ? "border-tatt-lime text-foreground font-bold" : "border-transparent text-tatt-gray hover:text-foreground font-medium"}`}
                        >
                            My Bookmarks
                        </button>
                    </div>

                    {/* Real-time Update Indicator */}
                    {newPostsAvailableCount > 0 && (
                        <button
                            onClick={() => {
                                fetchFeed(1, filter, true);
                                setNewPostsAvailableCount(0);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full bg-tatt-lime/10 border border-tatt-lime/20 text-tatt-lime font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-tatt-lime/20 transition-all shadow-xl shadow-tatt-lime/5"
                        >
                            <Zap size={18} fill="currentColor" /> {newPostsAvailableCount} New Community Insights Available — View Now
                        </button>
                    )}

                    {/* Post List */}
                    <div className="space-y-6">
                        {posts.map(post => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                onLike={() => handleLike(post.id)} 
                                onPostDeleted={() => {
                                    setPosts(prev => prev.filter(p => p.id !== post.id));
                                }}
                                onSelectTopic={(id) => setSelectedTopic(id)}
                                registerPostRef={registerPostRef}
                                allTopics={topics}
                            />
                        ))}

                        {isLoadingPosts && (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tatt-lime"></div>
                            </div>
                        )}

                        {!isLoadingPosts && posts.length === 0 && (
                            <div className="bg-surface rounded-2xl border border-border p-12 text-center">
                                <div className="size-16 bg-black/5  rounded-full flex items-center justify-center mx-auto mb-4">
                                    <TrendingUp className="h-8 w-8 text-tatt-gray" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">No posts found</h3>
                                <p className="text-tatt-gray max-w-xs mx-auto text-sm">
                                    {filter === "CHAPTER"
                                        ? "Be the first to share an update with your chapter members!"
                                        : filter === "PREMIUM"
                                            ? "Premium resources will appear here once they are published."
                                            : filter === "BOOKMARKS"
                                                ? "You haven't bookmarked any strategic insights yet."
                                                : "Your feed is empty. Start following more members or join a chapter!"}
                                </p>

                            </div>
                        )}

                        {hasMore && !isLoadingPosts && (
                            <button
                                onClick={() => fetchFeed(page + 1, filter)}
                                className="w-full py-4 text-sm font-bold text-tatt-lime hover:bg-tatt-lime/5 rounded-xl border border-dashed border-tatt-lime/30 transition-all uppercase tracking-widest"
                            >
                                Load more insights
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Discovery Sidebar */}
                <div className="w-full lg:w-80 space-y-6">

                    {/* Active Topics Sidebar Widget */}
                    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Community Topics</h2>
                            <MessageSquare className="h-4 w-4 text-tatt-lime" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {topics.length > 0 ? (
                                topics.map(topic => (
                                    <button
                                        key={topic.id}
                                        onClick={() => setSelectedTopic(topic.id === selectedTopic ? null : topic.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest transition-all ${selectedTopic === topic.id ? 'bg-tatt-lime text-black' : 'bg-black/5 text-foreground hover:bg-black/10'}`}
                                    >
                                        {topic.name}
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-tatt-gray">No topics available</p>
                            )}
                        </div>
                    </div>

                    {/* Trending Insights */}
                    {activeInsight && (
                        <div className="bg-surface rounded-2xl border border-tatt-lime/20 p-6 shadow-[0_0_15px_rgba(209,209,5,0.1)] relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 size-24 bg-tatt-lime/10 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-tatt-lime" />
                                    <h2 className="text-[12px] font-black uppercase tracking-widest text-foreground">Trending Insight</h2>
                                </div>
                                <span className="flex h-2 w-2 relative">
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tatt-lime"></span>
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-foreground text-sm mb-2 leading-snug">{activeInsight.title}</h3>
                                <p className="text-xs text-tatt-gray line-clamp-4 leading-relaxed">{activeInsight.content}</p>
                            </div>
                        </div>
                    )}

                    {/* Elite Connections */}
                    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Elite Connections</h2>
                            <TrendingUp className="h-4 w-4 text-tatt-lime" />
                        </div>
                        <div className="space-y-5">
                            {isLoadingSidebar ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="size-12 bg-border rounded-full"></div>
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-3 bg-border rounded w-3/4"></div>
                                            <div className="h-2 bg-border rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))
                            ) : recommendations.length > 0 ? (
                                recommendations.map(rec => (
                                    <div key={rec.member.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Link href={`/dashboard/network/${rec.member.id}`} className="block">
                                                    <div className="size-12 rounded-full border border-border overflow-hidden bg-background">
                                                        {rec.member.profilePicture ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={rec.member.profilePicture} alt={rec.member.firstName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="size-full flex items-center justify-center font-bold text-tatt-lime text-sm">
                                                                {rec.member.firstName.charAt(0)}{rec.member.lastName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                                <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white  ${rec.member.communityTier === 'KIONGOZI' ? 'bg-tatt-lime' : 'bg-tatt-gray'}`}></div>
                                            </div>
                                            <div>
                                                <Link href={`/dashboard/network/${rec.member.id}`}>
                                                    <p className="text-sm font-bold group-hover:text-tatt-lime transition-colors">{rec.member.firstName} {rec.member.lastName}</p>
                                                </Link>
                                                <p className="text-[10px] text-tatt-gray font-medium uppercase tracking-tight line-clamp-1">{rec.member.professionTitle || 'Member'}</p>
                                            </div>
                                        </div>
                                        {rec.canConnect && (
                                            <button
                                                onClick={() => handleConnect(rec.member)}
                                                title="Connect"
                                                className="size-9 rounded-xl bg-black/5  flex items-center justify-center text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10 transition-all border border-transparent hover:border-tatt-lime/30"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-tatt-gray text-center py-4">No recommendations yet. Complete your profile to get matched!</p>
                            )}
                        </div>
                        <button className="w-full mt-6 py-2.5 text-[10px] font-black text-tatt-gray hover:text-foreground uppercase tracking-[0.2em] transition-all border border-border rounded-xl hover:border-tatt-lime/50">
                            Explore Network
                        </button>
                    </div>

                    {/* Upcoming Events */}
                    {(isLoadingSidebar || upcomingEvents.length > 0) && (
                        <div className="bg-tatt-black rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 size-24 bg-tatt-lime/10 blur-3xl -mr-12 -mt-12 rounded-full"></div>
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h2 className="text-sm font-black uppercase tracking-widest text-white">Upcoming Mixers</h2>
                                <Calendar className="h-4 w-4 text-tatt-lime" />
                            </div>
                            <div className="space-y-6 relative z-10">
                                {isLoadingSidebar ? (
                                    Array(2).fill(0).map((_, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-12 h-14 bg-white/10 rounded"></div>
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-3 bg-white/10 rounded w-full"></div>
                                                <div className="h-2 bg-white/10 rounded w-2/3"></div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    upcomingEvents.map(event => {
                                        const date = new Date(event.dateTime);
                                        const locationName = (event.locations && event.locations.length > 0)
                                            ? event.locations[0]?.chapter?.name
                                            : "Global";
                                        return (
                                            <div key={event.id} className="flex gap-4 group cursor-pointer">
                                                <div className="bg-white/10 text-white rounded-xl flex flex-col items-center justify-center p-2 min-w-[52px] h-14 border border-white/5 group-hover:bg-tatt-lime group-hover:text-black transition-all">
                                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">{date.toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-xl font-black leading-none">{date.getDate()}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white group-hover:text-tatt-lime transition-colors line-clamp-1">{event.title}</h3>
                                                    <p className="text-[10px] text-white/50 mt-1 flex items-center gap-1 font-medium italic">
                                                        {event.type === 'WEBINAR' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                                        {locationName}
                                                    </p>
                                                    <button className="text-[10px] font-black text-tatt-lime uppercase tracking-widest mt-2 hover:underline">Register Now</button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <Link 
                                href="/dashboard/events"
                                className="w-full mt-6 py-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors block text-center"
                            >
                                See All Events
                            </Link>
                        </div>
                    )}

                    {/* Footer Links */}
                    <div className="px-6 py-4 flex flex-wrap gap-x-4 gap-y-2 opacity-30 text-foreground">
                        <a className="text-[10px] font-bold uppercase tracking-wider hover:underline" href="#">Privacy</a>
                        <button className="text-[10px] font-bold uppercase tracking-wider hover:underline" onClick={showTerms}>Terms</button>
                        <a className="text-[10px] font-bold uppercase tracking-wider hover:underline" href="#">Guidelines</a>
                        <p className="text-[10px] font-bold uppercase tracking-wider mt-2 w-full">© 2026 The African Think Tank</p>
                    </div>
                </div>
            </div>

            {/* Create Post Modal */}
            <CreatePostModal
                isOpen={isCreatePostModalOpen}
                onClose={() => setIsCreatePostModalOpen(false)}
                onPostCreated={() => fetchFeed(1, filter, true)}
                topics={topics}
            />

            {/* Connection Modal */}
            {connectModal.open && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" onClick={() => setConnectModal({ open: false, member: null })} />
                    <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-black/5">
                            <h3 className="font-bold">Connect with {connectModal.member?.firstName}</h3>
                            <button onClick={() => setConnectModal({ open: false, member: null })} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">
                                    Personalized Message <span className="text-red-500 font-bold">*</span>
                                </label>
                                <p className="text-xs text-tatt-gray">Please write a brief message to accompany your connection request.</p>
                            </div>
                            <textarea
                                value={connectMessage}
                                onChange={(e) => setConnectMessage(e.target.value)}
                                required
                                className="w-full bg-black/5 border border-border rounded-xl p-4 text-sm focus:ring-1 focus:ring-tatt-lime outline-none min-h-[100px]"
                                placeholder="Write your message... (Required)"
                            />
                            <button
                                onClick={submitConnect}
                                disabled={isSendingConnect || !connectMessage.trim()}
                                className="w-full bg-tatt-lime text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSendingConnect ? <div className="size-4 border-2 border-black border-t-transparent animate-spin rounded-full" /> : <Send className="h-4 w-4" />}
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Required Modal */}
            {isProfilePromptOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setIsProfilePromptOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10 text-center p-8 sm:p-10">
                        <div className="size-20 bg-tatt-lime/10 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                            <Briefcase className="h-10 w-10 text-tatt-lime" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-4">Strategic Profile Required</h2>
                        <p className="text-tatt-gray text-sm leading-relaxed mb-8">
                            TATT is a network of identified professionals. To start sharing insights, participating in polls, or commenting, please complete your professional setup in settings.
                        </p>
                        
                        <div className="space-y-3 bg-black/5 p-5 rounded-2xl text-left mb-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Items needed:</p>
                            <div className="grid grid-cols-2 gap-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                                    <div className="size-1.5 rounded-full bg-tatt-lime" /> Profession
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                                    <div className="size-1.5 rounded-full bg-tatt-lime" /> Industry
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                                    <div className="size-1.5 rounded-full bg-tatt-lime" /> Location
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                                    <div className="size-1.5 rounded-full bg-tatt-lime" /> Bio & Interests
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Link 
                                href="/dashboard/settings"
                                className="w-full bg-tatt-lime text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 cursor-pointer block text-center"
                            >
                                Go to Settings
                            </Link>
                            <button 
                                onClick={() => setIsProfilePromptOpen(false)}
                                className="w-full py-4 text-xs font-black uppercase tracking-widest text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Required Modal */}
            {isUpgradePromptOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setIsUpgradePromptOpen(false)} />
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
                                className="w-full bg-tatt-lime text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 cursor-pointer block text-center"
                            >
                                View Plans & Upgrade
                            </Link>
                            <button 
                                onClick={() => setIsUpgradePromptOpen(false)}
                                className="w-full py-4 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"
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

function formatViewsCount(num?: number): string {
    if (!num || num <= 0) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
}

function RepostModal({ post, onClose, onSuccess }: { post: Post, onClose: () => void, onSuccess: () => void }) {
    const [commentary, setCommentary] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRepost = async () => {
        if (!commentary.trim()) {
            toast.error("Please add some commentary to your repost.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post("/feed", {
                content: commentary,
                contentFormat: "PLAIN",
                parentPostId: post.id,
                type: "GENERAL"
            });
            toast.success("Post successfully shared to your feed!");
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to repost");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppModal
            isOpen={true}
            onClose={onClose}
            title={
                <h3 className="font-bold flex items-center gap-2 text-foreground">
                    <Repeat2 className="h-5 w-5 text-tatt-lime" />
                    Repost Insight
                </h3>
            }
            headerClass="bg-black/5"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold hover:bg-black/5 transition-all uppercase tracking-widest cursor-pointer">
                        Cancel
                    </button>
                    <button
                        onClick={handleRepost}
                        disabled={isSubmitting}
                        className="bg-tatt-lime text-black font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 flex items-center gap-2 cursor-pointer"
                    >
                        {isSubmitting && <div className="size-3 border-2 border-black border-t-transparent animate-spin rounded-full" />}
                        Share Post
                    </button>
                </div>
            }
            size="lg"
        >
            <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                className="w-full bg-black/5 border border-border rounded-2xl p-4 text-sm focus:ring-1 focus:ring-tatt-lime outline-none min-h-[120px] text-foreground"
                placeholder="Add your strategic perspective to this insight..."
            />

            <div className="p-4 rounded-2xl border border-border bg-black/5 opacity-80 scale-95 origin-top">
                <div className="flex items-center gap-3 mb-2">
                    <div className="size-6 rounded-full border border-border overflow-hidden bg-background">
                        {post.author.profilePicture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.author.profilePicture} alt={post.author.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="size-full flex items-center justify-center text-[8px] font-bold text-tatt-lime">
                                {post.author.firstName.charAt(0)}{post.author.lastName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <span className="text-xs font-bold text-foreground">{post.author.firstName} {post.author.lastName}</span>
                </div>
                <p className="text-xs text-tatt-gray line-clamp-2">
                    {post.isPremiumLocked ? "Elite Strategic Insight (Locked)" : (post.content || "").replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                </p>
            </div>
        </AppModal>
    );
}

function ReportModal({ post, onClose }: { post: Post, onClose: () => void }) {
    const [reason, setReason] = useState("");
    const [suggestedAction, setSuggestedAction] = useState("LIMIT_RECOMMENDATION");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReport = async () => {
        if (!reason.trim()) {
            toast.error("Please describe why you are reporting this post.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/feed/${post.id}/report`, {
                reason,
                suggestedAction
            });
            toast.success("Thank you. Our content administrators will review this report.");
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to submit report");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppModal
            isOpen={true}
            onClose={onClose}
            title={
                <h3 className="font-bold flex items-center gap-2 text-red-500">
                    <Flag className="h-5 w-5" />
                    Report Insight
                </h3>
            }
            headerClass="bg-red-500/5"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold hover:bg-black/5 transition-all cursor-pointer">
                        Cancel
                    </button>
                    <button
                        onClick={handleReport}
                        disabled={isSubmitting}
                        className="bg-red-600 text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer"
                    >
                        {isSubmitting && <div className="size-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                        Submit Report
                    </button>
                </div>
            }
            size="lg"
        >
            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-tatt-gray mb-3">Reason for Reporting</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-black/5 border border-border rounded-2xl p-4 text-sm focus:ring-1 focus:ring-red-500 outline-none min-h-[120px] text-foreground"
                    placeholder="Please describe why this post violates community guidelines..."
                />
            </div>

            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-tatt-gray mb-3">Suggested Strategic Action</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setSuggestedAction("LIMIT_RECOMMENDATION")}
                        className={`p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${suggestedAction === "LIMIT_RECOMMENDATION" ? "border-tatt-lime bg-tatt-lime/5 text-foreground" : "border-border bg-black/5 text-tatt-gray hover:border-tatt-lime/30"}`}
                    >
                        Limit Reach
                    </button>
                    <button
                        type="button"
                        onClick={() => setSuggestedAction("DELETE")}
                        className={`p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${suggestedAction === "DELETE" ? "border-red-500 bg-red-500/5 text-red-500" : "border-border bg-black/5 text-tatt-gray hover:border-red-500/30"}`}
                    >
                        Delete Post
                    </button>
                </div>
            </div>
        </AppModal>
    );
}


