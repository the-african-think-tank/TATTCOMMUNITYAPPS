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
    Clock
} from "lucide-react";

import Link from "next/link";
import { useTermsModal } from "@/context/terms-context";

import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import toast, { Toaster } from "react-hot-toast";
import { formatTimeAgo } from "@/utils/date";
import { initiateFeedSocket, disconnectFeedSocket } from "@/services/feed-socket";

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

    const [posts, setPosts] = useState<Post[]>([]);
    const [filter, setFilter] = useState<"ALL" | "CHAPTER" | "PREMIUM" | "BOOKMARKS">("ALL");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<TATTEvent[]>([]);
    const [isPostWizardOpen, setIsPostWizardOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPostType, setSelectedPostType] = useState<string>("GENERAL");
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostTitle, setNewPostTitle] = useState("");
    const [isPremiumPost, setIsPremiumPost] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
    const [jobLink, setJobLink] = useState("");
    const [jobLocation, setJobLocation] = useState("");
    const [jobCompany, setJobCompany] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
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
                api.get("/events"),
                api.get("/feed/curation/active"),
                api.get("/feed/topics")
            ]);
            setRecommendations(recRes.data);
            setUpcomingEvents(eventRes.data.slice(0, 2)); // Only show top 2
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + attachments.length > 10) {
            toast.error("Maximum 10 attachments allowed");
            return;
        }

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setAttachments(prev => [...prev, ...files]);
        setAttachmentPreviews(prev => [...prev, ...newPreviews]);

        // Reset input so same file can be selected again if removed
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        if (attachmentPreviews[index]) {
            URL.revokeObjectURL(attachmentPreviews[index]);
        }

        setAttachments(prev => prev.filter((_, i) => i !== index));
        setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) {
            toast.error("Please add some content to your post.");
            return;
        }

        const loadingToast = toast.loading("Publishing your strategic insight...");
        try {
            let uploadedMediaUrls: string[] = [];

            // 1. Upload attachments if any
            if (attachments.length > 0) {
                const formData = new FormData();
                attachments.forEach(file => formData.append("files", file));

                const uploadRes = await api.post("/uploads/media", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                uploadedMediaUrls = uploadRes.data.files.map((f: any) => f.url);
            }

            // 2. Create the post
            await api.post("/feed", {
                title: newPostTitle,
                content: newPostContent,
                type: selectedPostType,
                isPremium: isPremiumPost,
                mediaUrls: uploadedMediaUrls,
                contentFormat: "PLAIN",
                jobLink: selectedPostType === "JOB" ? jobLink : undefined,
                jobLocation: selectedPostType === "JOB" ? jobLocation : undefined,
                jobCompany: selectedPostType === "JOB" ? jobCompany : undefined,
                eventType: selectedPostType === "EVENT" ? eventType || undefined : undefined,
                eventDate: selectedPostType === "EVENT" ? eventDate || undefined : undefined,
                eventUrl: selectedPostType === "EVENT" ? eventUrl || undefined : undefined,
                topicId: postTopicId || undefined,
            });

            toast.success("Post successfully shared to the TATT Feed!", { id: loadingToast });
            setIsCreateModalOpen(false);
            setNewPostTitle("");
            setNewPostContent("");
            setIsPremiumPost(false);
            setAttachments([]);
            setAttachmentPreviews([]);
            setJobLink("");
            setJobLocation("");
            setJobCompany("");
            setPostTopicId("");
            setEventType("");
            setEventDate("");
            setEventUrl("");
            fetchFeed(1, filter, true); // Refresh feed
        } catch (error: any) {

            toast.error(error.response?.data?.message || "Failed to publish post", { id: loadingToast });
        }
    };

    const [isUpgradePromptOpen, setIsUpgradePromptOpen] = useState(false);

    const handleConnect = (member: any) => {
        if (user?.communityTier === 'FREE') {
            setIsUpgradePromptOpen(true);
            return;
        }
        setConnectModal({ open: true, member });
        setConnectMessage(`Hi ${member.firstName}, I saw your profile in my elite recommendations and would love to connect and share strategic insights.`);
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
        setIsPostWizardOpen(true);
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
            <Toaster position="top-right" />

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
                            ) : upcomingEvents.length > 0 ? (
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
                            ) : (
                                <p className="text-xs text-white/50 text-center py-4">Check back soon for new events!</p>
                            )}
                        </div>
                        <Link 
                            href="/dashboard/events"
                            className="w-full mt-6 py-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors block text-center"
                        >
                            See All Events
                        </Link>
                    </div>

                    {/* Footer Links */}
                    <div className="px-6 py-4 flex flex-wrap gap-x-4 gap-y-2 opacity-30 text-foreground">
                        <a className="text-[10px] font-bold uppercase tracking-wider hover:underline" href="#">Privacy</a>
                        <button className="text-[10px] font-bold uppercase tracking-wider hover:underline" onClick={showTerms}>Terms</button>
                        <a className="text-[10px] font-bold uppercase tracking-wider hover:underline" href="#">Guidelines</a>
                        <p className="text-[10px] font-bold uppercase tracking-wider mt-2 w-full">© 2026 The African Think Tank</p>
                    </div>
                </div>
            </div>

            {/* Post Type Selector (Wizard) */}
            {isPostWizardOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPostWizardOpen(false)} />
                    <div className="relative bg-white  w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                        <div className="p-8 border-b border-border bg-gradient-to-r from-tatt-lime/10 to-transparent">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black tracking-tight text-foreground">Choose Post Type</h2>
                                <button onClick={() => setIsPostWizardOpen(false)} className="size-10 rounded-full bg-black/5  flex items-center justify-center text-tatt-gray hover:text-foreground transition-all">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <p className="text-tatt-gray text-sm">Select the nature of your contribution to the TATT community.</p>
                        </div>
                        <div className="p-6 grid gap-4">
                            {allowedPostTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        setSelectedPostType(type.id);
                                        setIsPostWizardOpen(false);
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="flex items-center gap-5 p-5 rounded-2xl border border-border hover:border-tatt-lime hover:bg-tatt-lime/5 transition-all text-left group"
                                >
                                    <div className="size-14 rounded-2xl bg-black/5  flex items-center justify-center group-hover:bg-tatt-lime group-hover:text-black transition-all">
                                        <type.icon className="h-7 w-7" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-foreground mb-1">{type.name}</h4>
                                        <p className="text-xs text-tatt-gray">{type.description}</p>
                                    </div>
                                    <Plus className="h-5 w-5 text-tatt-gray group-hover:text-tatt-lime group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Post Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative bg-white  w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setIsPostWizardOpen(true);
                                    }}
                                    className="p-2 hover:bg-black/5  rounded-lg text-tatt-gray"
                                >
                                    <ChevronDown className="h-5 w-5 rotate-90" />
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold">New {POST_TYPES.find(t => t.id === selectedPostType)?.name}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="size-5 rounded-full overflow-hidden bg-tatt-lime/10 flex items-center justify-center text-[10px] font-bold text-tatt-lime shrink-0">
                                            {user?.profilePicture ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-tatt-gray font-black uppercase tracking-widest flex items-center gap-1.5">
                                            Authoring as <span className="text-tatt-lime">{user?.firstName} {user?.lastName}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="size-10 rounded-full bg-black/5  flex items-center justify-center text-tatt-gray hover:text-foreground transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <input
                                value={newPostTitle}
                                onChange={(e) => setNewPostTitle(e.target.value)}
                                placeholder={selectedPostType === "JOB" ? "Job Position / Role (e.g. Senior Software Engineer)" : "Post Title (Optional)"}
                                className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 placeholder:text-tatt-gray outline-none"
                            />

                            {selectedPostType === "JOB" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Company Name</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                            <input
                                                value={jobCompany}
                                                onChange={(e) => setJobCompany(e.target.value)}
                                                placeholder="e.g. Google Africa"
                                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                            <input
                                                value={jobLocation}
                                                onChange={(e) => setJobLocation(e.target.value)}
                                                placeholder="e.g. Nairobi, Kenya"
                                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Job Description Link</label>
                                        <div className="relative">
                                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                            <input
                                                value={jobLink}
                                                onChange={(e) => setJobLink(e.target.value)}
                                                placeholder="https://careers.company.com/job/..."
                                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* EVENT Fields */}
                            {selectedPostType === "EVENT" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                    {/* Event Type pill buttons */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Event Type</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["WEBINAR","WORKSHOP","CONFERENCE","IN_PERSON","HYBRID"].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setEventType(t)}
                                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                        eventType === t
                                                            ? "bg-tatt-lime text-black border-tatt-lime shadow-lg shadow-tatt-lime/20"
                                                            : "bg-white border-border text-tatt-gray hover:border-tatt-lime hover:text-tatt-lime"
                                                    }`}
                                                >
                                                    {t.replace("_", " ")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Event Date &amp; Time</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                            <input
                                                type="datetime-local"
                                                value={eventDate}
                                                onChange={e => setEventDate(e.target.value)}
                                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Event URL <span className="normal-case font-normal opacity-60">(optional)</span></label>
                                        <div className="relative">
                                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                            <input
                                                type="url"
                                                value={eventUrl}
                                                onChange={e => setEventUrl(e.target.value)}
                                                placeholder="https://zoom.us/j/..."
                                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom topic pill-picker */}
                            {topics.length > 0 && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1 flex items-center gap-1.5">
                                        <MessageSquare className="size-3" /> Community Topic
                                        <span className="font-normal normal-case opacity-60">(optional)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPostTopicId("")}
                                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                postTopicId === ""
                                                    ? "bg-tatt-lime text-black border-tatt-lime shadow-lg shadow-tatt-lime/20"
                                                    : "bg-white border-border text-tatt-gray hover:border-tatt-lime hover:text-tatt-lime"
                                            }`}
                                        >
                                            No Topic
                                        </button>
                                        {topics.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setPostTopicId(t.id === postTopicId ? "" : t.id)}
                                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                    postTopicId === t.id
                                                        ? "bg-tatt-lime text-black border-tatt-lime shadow-lg shadow-tatt-lime/20"
                                                        : "bg-white border-border text-tatt-gray hover:border-tatt-lime hover:text-tatt-lime"
                                                }`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What's on your mind? Use strategic insights to engage the community..."
                                className="w-full bg-transparent border-none text-base resize-none focus:ring-0 min-h-[200px] placeholder:text-tatt-gray/50 outline-none"
                            />

                            {/* Attachment Previews */}
                            {attachmentPreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
                                    {attachmentPreviews.map((preview, i) => (
                                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={preview} alt="Attachment preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeAttachment(i)}
                                                className="absolute top-2 right-2 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                        {/* Actions */}
                        <div className="p-6 border-t border-border space-y-4">
                            {(user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPERADMIN' || user?.systemRole === 'MODERATOR') && (
                                <div className="flex items-center justify-between p-4 bg-tatt-lime/5 rounded-2xl border border-tatt-lime/20">
                                    <div className="flex items-center gap-3 text-tatt-lime">
                                        <Lock className="h-5 w-5" />
                                        <div>
                                            <p className="text-sm font-bold">Premium Visibility</p>
                                            <p className="text-[10px] font-medium opacity-80 uppercase tracking-tight">Only paid members will see the full content</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsPremiumPost(!isPremiumPost)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${isPremiumPost ? 'bg-tatt-lime' : 'bg-tatt-gray/30'}`}
                                    >
                                        <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${isPremiumPost ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        multiple
                                        hidden
                                        accept="image/*,video/*,application/pdf"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 bg-black/5  hover:bg-tatt-lime/10 hover:text-tatt-lime rounded-xl transition-all"
                                    >
                                        <ImageIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 bg-black/5  hover:bg-tatt-lime/10 hover:text-tatt-lime rounded-xl transition-all"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreatePost}
                                    className="bg-tatt-lime text-black font-black px-8 py-3 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20"
                                >
                                    Publish Post
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Connection Modal */}
            {connectModal.open && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConnectModal({ open: false, member: null })} />
                    <div className="relative bg-white  w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-black/5">
                            <h3 className="font-bold">Connect with {connectModal.member?.firstName}</h3>
                            <button onClick={() => setConnectModal({ open: false, member: null })} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-tatt-gray">Add a personalized message to your connection request.</p>
                            <textarea
                                value={connectMessage}
                                onChange={(e) => setConnectMessage(e.target.value)}
                                className="w-full bg-black/5  border border-border rounded-xl p-4 text-sm focus:ring-1 focus:ring-tatt-lime outline-none min-h-[120px]"
                                placeholder="Write your message..."
                            />
                            <button
                                onClick={submitConnect}
                                disabled={isSendingConnect}
                                className="w-full bg-tatt-lime text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
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
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsProfilePromptOpen(false)} />
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
                                className="w-full bg-tatt-lime text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20"
                            >
                                Go to Settings
                            </Link>
                            <button 
                                onClick={() => setIsProfilePromptOpen(false)}
                                className="w-full py-4 text-xs font-black uppercase tracking-widest text-tatt-gray hover:text-foreground transition-colors"
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
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsUpgradePromptOpen(false)} />
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
                                onClick={() => setIsUpgradePromptOpen(false)}
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

function PostCard({ post, onLike, onPostDeleted, onSelectTopic }: { post: Post, onLike: () => void, onPostDeleted: () => void, onSelectTopic: (topicId: string) => void }) {
    const { user } = useAuth();
    const commentInputRef = useRef<HTMLInputElement>(null);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount);
    const [showOptions, setShowOptions] = useState(false);
    const [isReposting, setIsReposting] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
    const [isHighlighted, setIsHighlighted] = useState(post.isHighlighted);
    const [isUpvoted, setIsUpvoted] = useState(post.isUpvotedByMe);
    const [localUpvotesCount, setLocalUpvotesCount] = useState(post.upvotesCount);

    const toggleRepliesVisibility = (commentId: string) => {
        setCollapsedReplies(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const handleStartReply = (commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, authorName });
        setTimeout(() => {
            commentInputRef.current?.focus();
        }, 50);
    };

    const handleBookmark = async () => {
        try {
            const res = await api.post(`/feed/${post.id}/bookmark`);
            setIsBookmarked(res.data.bookmarked);
            toast.success(res.data.message);
        } catch (error) {
            toast.error("Failed to bookmark post");
        }
        setShowOptions(false);
    };

    const handleHighlight = async () => {
        try {
            const res = await api.post(`/feed/${post.id}/highlight`);
            setIsHighlighted(res.data.isHighlighted);
            toast.success(res.data.message);
        } catch (error) {
            toast.error("Failed to highlight post");
        }
        setShowOptions(false);
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/share/${post.id}`;
        if (navigator.share) {
            navigator.share({ title: post.title || "TATT Strategic Insight", url: shareUrl }).catch(() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Strategic insight link copied! Ready to share.");
            });
        } else {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Strategic insight link copied! Ready to share.");
        }
    };

    const handleUpvote = async () => {
        try {
            const res = await api.post(`/feed/${post.id}/upvote`);
            setIsUpvoted(res.data.upvoted);
            setLocalUpvotesCount(prev => res.data.upvoted ? prev + 1 : prev - 1);
        } catch (error) {
            toast.error("Failed to upvote");
        }
    };

    const handleDelete = async () => {
        // Enforce 30-minute limit
        const isStaff = !!(user?.systemRole && user.systemRole !== 'COMMUNITY_MEMBER');
        const minutesSinceCreation = (new Date().getTime() - new Date(post.createdAt).getTime()) / 60000;
        
        if (!isStaff && minutesSinceCreation > 30) {
            toast.error("Strategic insights can only be removed within 30 minutes of publishing.");
            setShowOptions(false);
            return;
        }

        if (!window.confirm("Are you sure you want to delete this strategic insight? This action cannot be undone.")) return;
        
        const loadingToast = toast.loading("Removing post...");
        try {
            await api.delete(`/feed/${post.id}`);
            toast.success("Post successfully removed from the TATT Feed.", { id: loadingToast });
            onPostDeleted();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete post", { id: loadingToast });
        }
        setShowOptions(false);
    };

    const toggleComments = async () => {
        if (!showComments && comments.length === 0) {
            fetchComments();
        }
        setShowComments(!showComments);
    };

    const fetchComments = async () => {
        if (post.isPremiumLocked) return;
        setIsLoadingComments(true);
        try {
            const res = await api.get(`/feed/${post.id}/comments`);
            setComments(res.data.data);
            setLocalCommentsCount(res.data.meta.total);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmittingComment(true);
        try {
            await api.post(`/feed/${post.id}/comments`, {
                content: newComment,
                parentId: replyingTo ? replyingTo.id : undefined,
            });
            setNewComment("");
            setReplyingTo(null);
            fetchComments();
            // Optimistically update count if desired, though fetchComments will do it
            setLocalCommentsCount(prev => prev + 1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add comment");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "KIONGOZI": return "bg-tatt-lime text-black";
            case "IMANI": return "bg-tatt-black text-white border border-white/20 shadow-lg";
            case "UBUNTU": return "bg-[#333] text-white";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const getPostTypeBadge = (type: string) => {
        switch (type) {
            case "ANNOUNCEMENT":
                return {
                    label: "Announcement",
                    icon: Zap,
                    className: "bg-tatt-yellow/20 text-tatt-bronze-dark border border-tatt-yellow/40",
                };
            case "RESOURCE":
                return {
                    label: "Resource",
                    icon: Briefcase,
                    className: "bg-tatt-lime-dark/10 text-tatt-lime-dark border border-tatt-lime-dark/30",
                };
            case "EVENT":
                return {
                    label: "Event",
                    icon: Calendar,
                    className: "bg-tatt-gray/10 text-tatt-gray border border-tatt-gray/30",
                };
            case "JOB":
                return {
                    label: "Career / Job",
                    icon: Briefcase,
                    className: "bg-tatt-bronze/10 text-tatt-bronze border border-tatt-bronze/30",
                };
            default: // GENERAL
                return {
                    label: "TATT-POST",
                    icon: MessageSquare,
                    className: "bg-tatt-bronze/10 text-tatt-bronze border border-tatt-bronze/30",
                };
        }
    };

    return (
        <article className="bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden group">
            {/* Top accent strip — color-coded by post type */}
            {post.type === "ANNOUNCEMENT" && (
                <div className="bg-gradient-to-r from-tatt-yellow/50 via-tatt-yellow/10 to-transparent h-0.5" />
            )}
            {post.type === "RESOURCE" && (
                <div className="bg-gradient-to-r from-tatt-lime-dark/40 via-tatt-lime-dark/10 to-transparent h-0.5" />
            )}
            {post.type === "EVENT" && (
                <div className="bg-gradient-to-r from-tatt-gray/40 via-tatt-gray/10 to-transparent h-0.5" />
            )}
            {post.type === "GENERAL" && (
                <div className="bg-gradient-to-r from-tatt-bronze/30 via-tatt-bronze/10 to-transparent h-0.5" />
            )}
            {post.type === "JOB" && (
                <div className="bg-gradient-to-r from-tatt-bronze/40 via-tatt-bronze/10 to-transparent h-0.5" />
            )}

            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                    <div className="flex gap-4">
                        <div className="relative">
                            <Link href={`/dashboard/network/${post.author.id}`} className="block">
                                <div className="size-12 rounded-full border-2 border-border overflow-hidden bg-background">
                                    {post.author.profilePicture ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.author.profilePicture} alt={post.author.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center font-bold text-tatt-lime">
                                            {post.author.firstName.charAt(0)}{post.author.lastName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white  shadow-sm ${post.author.communityTier === 'KIONGOZI' ? 'bg-tatt-lime' : 'bg-tatt-gray'}`}></div>
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link href={`/dashboard/network/${post.author.id}`}>
                                    <h3 className="font-black text-foreground hover:text-tatt-lime transition-colors">{post.author.firstName} {post.author.lastName}</h3>
                                </Link>
                                <span className={`${getTierColor(post.author.communityTier)} text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-[0.1em]`}>
                                    {post.author.communityTier}
                                </span>
                                {/* Post type badge */}
                                {(() => {
                                    const badge = getPostTypeBadge(post.type);
                                    if (!badge) return null;
                                    const BadgeIcon = badge.icon;
                                    return (
                                        <span className={`${badge.className} text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-[0.1em] flex items-center gap-1`}>
                                            <BadgeIcon className="h-2.5 w-2.5" />
                                            {badge.label}
                                        </span>
                                    );
                                })()}
                                {post.isPremium && (
                                    <span className="bg-tatt-lime/10 text-tatt-lime text-[9px] font-black px-2 py-0.5 rounded border border-tatt-lime/20 uppercase tracking-[0.1em] flex items-center gap-1">
                                        <Lock className="h-2 w-2" />
                                        Premium
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-tatt-gray font-bold uppercase tracking-widest mt-1">
                                {(post.chapter?.name || 'Global').replace(/\s*Chapter\s*$/i, '')} Chapter • {formatTimeAgo(post.createdAt)}
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowOptions(!showOptions)}
                            className="text-tatt-gray hover:text-tatt-lime p-2 rounded-xl hover:bg-black/5  transition-all"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                        {showOptions && (
                            <>
                                <div className="fixed inset-0 z-[55]" onClick={() => setShowOptions(false)} />
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-2xl shadow-2xl z-[60] overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
                                    {post.author.id !== user?.id && (
                                        <>
                                            <button onClick={handleBookmark} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 transition-colors text-left">
                                                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-tatt-lime text-tatt-lime' : ''}`} />
                                                {isBookmarked ? 'Bookmarked' : 'Bookmark Post'}
                                            </button>
                                            <button
                                                onClick={() => { setShowOptions(false); setIsReporting(true); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 transition-colors text-left"
                                            >
                                                <Flag className="h-4 w-4" />
                                                Report Post
                                            </button>
                                        </>
                                    )}
                                    {(user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPERADMIN' || user?.systemRole === 'MODERATOR' || user?.systemRole === 'REGIONAL_ADMIN') && (
                                        <button onClick={handleHighlight} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 transition-colors text-left">
                                            <Highlighter className={`h-4 w-4 ${isHighlighted ? 'text-tatt-lime' : ''}`} />
                                            {isHighlighted ? 'Remove Highlight' : 'Highlight in Chapter'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowOptions(false); setIsReposting(true); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 transition-colors text-left"
                                    >
                                        <Repeat2 className="h-4 w-4" />
                                        Repost
                                    </button>
                                    {(post.author.id === user?.id || (user?.systemRole && user.systemRole !== 'COMMUNITY_MEMBER')) && (
                                        <button 
                                            onClick={handleDelete} 
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 transition-colors text-left"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Post
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                </div>

                {/* Content */}
                <div className="space-y-4 mb-2">
                    {post.title && (
                        <h2 className="text-xl lg:text-2xl font-black tracking-tight leading-tight text-foreground">{post.title}</h2>
                    )}

                    {post.isPremiumLocked ? (
                        <div className="bg-black/5  rounded-2xl p-8 border border-dashed border-border flex flex-col items-center text-center space-y-4">
                            <div className="size-16 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center text-tatt-lime">
                                <Lock className="size-8" />
                            </div>
                            <div className="max-w-md">
                                <h4 className="text-lg font-black mb-1">Elite Strategic Insight</h4>
                                <p className="text-sm text-tatt-gray">This resource is exclusive to TATT Ubuntu, Imani, and Kiongozi members. Upgrade your tier to unlock full access.</p>
                            </div>
                            <button className="bg-tatt-lime text-black font-black px-8 py-2.5 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-tatt-lime/10">
                                Upgrade Now
                            </button>
                        </div>
                    ) : post.contentFormat === 'HTML' ? (
                        <div
                            className="text-foreground/90 text-sm lg:text-base leading-relaxed whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: post.content || "" }}
                        />
                    ) : (
                        <div className="text-foreground/90 text-sm lg:text-base leading-relaxed whitespace-pre-wrap break-words">
                            {post.content}
                        </div>
                    )}

                    {post.type === "JOB" && !post.isPremiumLocked && (
                        <div className="mt-4 p-5 rounded-[24px] bg-tatt-bronze/5 border border-tatt-bronze/20 space-y-4 shadow-sm relative overflow-hidden">
                            {user?.communityTier === 'FREE' && post.author.id !== user?.id ? (
                                <div className="flex flex-col items-center justify-center text-center py-4 px-2 space-y-4">
                                    <div className="size-12 rounded-full bg-tatt-bronze/10 flex items-center justify-center text-tatt-bronze">
                                        <Lock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-tatt-bronze-dark uppercase tracking-widest mb-1">Opportunities Locked</h4>
                                        <p className="text-[11px] text-tatt-gray max-w-[240px] leading-relaxed">
                                            Job details like Role, Company, and Location are exclusive to paid members. 
                                        </p>
                                    </div>
                                    <Link 
                                        href="/dashboard/upgrade"
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-tatt-bronze text-white font-black text-[10px] uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-md shadow-tatt-bronze/20"
                                    >
                                        Upgrade to View Details
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-9 rounded-xl bg-tatt-bronze/10 flex items-center justify-center text-tatt-bronze shrink-0 border border-tatt-bronze/20">
                                                <GraduationCap className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-tatt-bronze/60 leading-none mb-1">Role / Position</p>
                                                <p className="text-sm font-black text-tatt-bronze-dark leading-none truncate">{post.title || "Position Open"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-9 rounded-xl bg-tatt-bronze/10 flex items-center justify-center text-tatt-bronze shrink-0 border border-tatt-bronze/20">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-tatt-bronze/60 leading-none mb-1">Company</p>
                                                <p className="text-sm font-black text-tatt-bronze-dark leading-none truncate">{post.jobCompany || "Confidential"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-9 rounded-xl bg-tatt-bronze/10 flex items-center justify-center text-tatt-bronze shrink-0 border border-tatt-bronze/20">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-tatt-bronze/60 leading-none mb-1">Location</p>
                                                <p className="text-sm font-black text-tatt-bronze-dark leading-none truncate">{post.jobLocation || "Remote / Global"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {post.jobLink && (
                                        <a 
                                            href={post.jobLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3.5 bg-tatt-bronze hover:bg-tatt-bronze-dark text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-tatt-bronze/30 active:scale-[0.98]"
                                        >
                                            View Job Description
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {post.mediaUrls && post.mediaUrls.length > 0 && !post.isPremiumLocked && (
                        <div className={`grid gap-2 mt-4 overflow-hidden rounded-2xl border border-border ${post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {post.mediaUrls.map((url, i) => (
                                <div key={i} className="aspect-video lg:aspect-auto lg:h-[400px] overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="Post content" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── EVENT CARD ───────────────────────────────────── */}
                    {post.type === "EVENT" && !post.isPremiumLocked && (post.eventType || post.eventDate || post.eventUrl) && (
                        <div className="mt-4 p-5 rounded-[24px] bg-tatt-gray/5 border border-tatt-gray/20 space-y-4 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {post.eventType && (
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-9 rounded-xl bg-tatt-gray/10 flex items-center justify-center text-tatt-gray shrink-0 border border-tatt-gray/20">
                                            {(post.eventType === "WEBINAR" || post.eventType === "HYBRID") ? <Video className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-tatt-gray/60 leading-none mb-1">Event Type</p>
                                            <p className="text-sm font-black text-foreground leading-none truncate">{post.eventType.replace("_", " ")}</p>
                                        </div>
                                    </div>
                                )}
                                {post.eventDate && (
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-9 rounded-xl bg-tatt-gray/10 flex items-center justify-center text-tatt-gray shrink-0 border border-tatt-gray/20">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-tatt-gray/60 leading-none mb-1">Date &amp; Time</p>
                                            <p className="text-sm font-black text-foreground leading-none">
                                                {new Date(post.eventDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                                                {" · "}
                                                {new Date(post.eventDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {post.eventUrl && (
                                <a
                                    href={post.eventUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-foreground hover:opacity-90 text-background font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.98]"
                                >
                                    Learn More / Register
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            )}
                        </div>
                    )}



                    {/* Original Post Preview (for reposts) */}
                    {post.parentPost && (
                        <div className="mt-4 p-4 rounded-2xl bg-black/5 border border-border space-y-3 group/repost relative">
                            <div className="flex items-center gap-3 relative z-10">
                                <Link href={`/dashboard/network/${post.parentPost.author.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    <div className="size-8 rounded-full border border-border overflow-hidden bg-background">
                                        {post.parentPost.author.profilePicture ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={post.parentPost.author.profilePicture} alt={post.parentPost.author.firstName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="size-full flex items-center justify-center text-[10px] font-bold text-tatt-lime">
                                                {post.parentPost.author.firstName.charAt(0)}{post.parentPost.author.lastName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-black text-foreground">{post.parentPost.author.firstName} {post.parentPost.author.lastName}</span>
                                </Link>
                                <span className="text-[10px] text-tatt-gray">• {formatTimeAgo(post.parentPost.createdAt)}</span>
                            </div>
                            <div className="text-sm line-clamp-3 text-tatt-gray italic relative z-10">
                                {post.parentPost.isPremiumLocked ? "Elite Strategic Insight (Locked)" : (post.parentPost.content || "").replace(/<[^>]*>?/gm, '').substring(0, 200) + '...'}
                            </div>
                        </div>
                    )}
                </div>

                    {/* Tags & Topics */}
                    {(post.tags?.length > 0 || post.topic) && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 text-sm font-bold opacity-90 relative z-10">
                            {post.topic && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onSelectTopic(post.topic!.id); }}
                                    className="text-[10px] uppercase font-black tracking-widest bg-tatt-lime/10 text-tatt-lime px-2 py-1 rounded-md border border-tatt-lime/20 hover:bg-tatt-lime/20 transition-all flex items-center gap-1.5"
                                >
                                    <MessageSquare className="size-3" />
                                    {post.topic.name}
                                </button>
                            )}
                            {post.tags?.map(tag => (
                                <span key={tag} className="text-[10px] uppercase font-black tracking-widest text-tatt-gray border border-border px-2 py-1 rounded-md">#{tag}</span>
                            ))}
                        </div>
                    )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                if (post.author.id === user?.id) {
                                    toast.error("You cannot like your own insight.");
                                    return;
                                }
                                onLike();
                            }}
                            disabled={post.author.id === user?.id}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${post.isLikedByMe ? 'bg-tatt-lime text-black shadow-lg shadow-tatt-lime/20' : 'text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10'} ${post.author.id === user?.id ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                        >
                            <ThumbsUp className={`h-5 w-5 ${post.isLikedByMe ? 'fill-black' : ''}`} />
                            <span className="text-xs font-black">{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
                        </button>
                        <button
                            onClick={toggleComments}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${showComments ? 'text-tatt-lime bg-tatt-lime/10' : 'text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10'}`}
                        >
                            <MessageSquare className="h-5 w-5" />
                            <span className="text-xs font-black">{localCommentsCount > 0 ? localCommentsCount : 'Comment'}</span>
                        </button>
                        <button
                            onClick={() => {
                                if (post.author.id === user?.id) {
                                    toast.error("You cannot upvote your own insight.");
                                    return;
                                }
                                handleUpvote();
                            }}
                            disabled={post.author.id === user?.id}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${isUpvoted ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'text-tatt-gray hover:text-orange-500 hover:bg-orange-500/10'} ${post.author.id === user?.id ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                        >
                            <ArrowBigUp className={`h-5 w-5 ${isUpvoted ? 'fill-orange-500' : ''}`} />
                            <span className="text-xs font-black">{localUpvotesCount > 0 ? localUpvotesCount : 'Upvote'}</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-tatt-gray text-[10px] font-bold uppercase tracking-widest mr-2">
                            <Eye className="h-3 w-3" />
                            {post.viewsCount || 0}
                        </div>
                        <button onClick={handleShare} className="flex items-center gap-2.5 px-3 py-2 text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10 rounded-xl transition-all border border-border/50 cursor-pointer">
                            <Share2 className="h-4.5 w-4.5" />
                            <span className="text-xs font-black hidden sm:inline uppercase tracking-widest text-[10px]">Share Insight</span>
                        </button>
                    </div>
                </div>


                {/* Repost Modal */}
                {isReposting && (
                    <RepostModal
                        post={post}
                        onClose={() => setIsReposting(false)}
                        onSuccess={() => { setIsReposting(false); onLike(); }} // Refresh feed
                    />
                )}

                {/* Report Modal */}
                {isReporting && (
                    <ReportModal
                        post={post}
                        onClose={() => setIsReporting(false)}
                    />
                )}


                {/* Comments Section */}
                {showComments && (
                    <div className="mt-6 pt-6 border-t border-border space-y-6">
                        {/* Comments Header with Close Option */}
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-xs font-black uppercase tracking-widest text-tatt-gray">
                                {localCommentsCount} {localCommentsCount === 1 ? "Perspective" : "Perspectives"}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowComments(false);
                                    setReplyingTo(null);
                                }}
                                className="text-xs font-bold text-tatt-gray hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                                <ChevronUp className="size-4" /> Close Comments
                            </button>
                        </div>

                        {/* Top Comment Input */}
                        {!replyingTo && (
                            <form onSubmit={handleAddComment} className="flex gap-4">
                                <div className="size-8 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center font-bold text-tatt-lime text-[10px] shrink-0 overflow-hidden relative">
                                    {user?.profilePicture ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a Strategic perspective..."
                                        disabled={isSubmittingComment}
                                        className="w-full bg-black/5 border border-border rounded-xl pl-4 pr-16 py-2.5 text-sm focus:ring-1 focus:ring-tatt-lime outline-none text-foreground"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmittingComment || !newComment.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-tatt-lime text-black font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 hover:brightness-95 transition-all"
                                    >
                                        Post
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* List of Comments */}
                        <div className="space-y-5 px-1 max-h-[450px] overflow-y-auto custom-scrollbar">
                            {isLoadingComments ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-tatt-lime"></div>
                                </div>
                            ) : comments.length > 0 ? (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-4 group">
                                        <div className="size-8 rounded-full border border-border overflow-hidden bg-background shrink-0">
                                            {comment.author.profilePicture ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={comment.author.profilePicture} alt={comment.author.firstName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="size-full flex items-center justify-center font-bold text-tatt-lime text-[10px]">
                                                    {comment.author.firstName.charAt(0)}{comment.author.lastName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-black/5 rounded-2xl p-4 border border-border">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <span className="font-bold text-sm">{comment.author.firstName} {comment.author.lastName}</span>
                                                        <span className="text-[10px] text-tatt-gray ml-2 font-medium">{formatTimeAgo(comment.createdAt)}</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-foreground/80 leading-relaxed">{comment.content}</p>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 ml-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (replyingTo?.id === comment.id) {
                                                            setReplyingTo(null);
                                                            setNewComment("");
                                                        } else {
                                                            handleStartReply(comment.id, `${comment.author.firstName} ${comment.author.lastName}`);
                                                        }
                                                    }}
                                                    className="text-[10px] font-black text-tatt-lime hover:underline uppercase tracking-widest"
                                                >
                                                    {replyingTo?.id === comment.id ? "Cancel Reply" : "Reply"}
                                                </button>

                                                {comment.replies && comment.replies.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRepliesVisibility(comment.id)}
                                                        className="text-[10px] font-bold text-tatt-gray hover:text-foreground flex items-center gap-1 uppercase tracking-wider"
                                                    >
                                                        {collapsedReplies[comment.id] ? (
                                                            <>
                                                                <ChevronDown className="size-3" />
                                                                Show {comment.replies.length} {comment.replies.length === 1 ? "Reply" : "Replies"}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronUp className="size-3" />
                                                                Hide {comment.replies.length} {comment.replies.length === 1 ? "Reply" : "Replies"}
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline Reply Input directly underneath target comment */}
                                            {replyingTo?.id === comment.id && (
                                                <div className="mt-3 ml-4 border-l-2 border-tatt-lime pl-4">
                                                    <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                ref={commentInputRef}
                                                                value={newComment}
                                                                onChange={(e) => setNewComment(e.target.value)}
                                                                placeholder={`Reply to @${replyingTo.authorName}...`}
                                                                disabled={isSubmittingComment}
                                                                className="w-full bg-black/5 border border-tatt-lime/40 rounded-xl pl-4 pr-16 py-2.5 text-xs focus:ring-1 focus:ring-tatt-lime outline-none text-foreground"
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={isSubmittingComment || !newComment.trim()}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-tatt-lime text-black font-bold text-xs px-3 py-1 rounded-lg disabled:opacity-50 hover:brightness-95 transition-all"
                                                            >
                                                                Reply
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReplyingTo(null);
                                                                setNewComment("");
                                                            }}
                                                            className="text-tatt-gray hover:text-foreground text-xs font-bold px-1"
                                                            title="Close reply"
                                                        >
                                                            <X className="size-4" />
                                                        </button>
                                                    </form>
                                                </div>
                                            )}

                                            {/* Render Nested Replies when NOT collapsed */}
                                            {comment.replies && comment.replies.length > 0 && !collapsedReplies[comment.id] && (
                                                <div className="mt-3 ml-4 pl-4 border-l-2 border-border space-y-3">
                                                    {comment.replies.map((reply: any) => (
                                                        <div key={reply.id} className="flex gap-3">
                                                            <div className="size-7 rounded-full border border-border overflow-hidden bg-background shrink-0">
                                                                {reply.author?.profilePicture ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={reply.author.profilePicture} alt={reply.author.firstName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="size-full flex items-center justify-center font-bold text-tatt-lime text-[9px]">
                                                                        {reply.author?.firstName?.charAt(0)}{reply.author?.lastName?.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="bg-black/5 rounded-2xl p-3 border border-border flex-1">
                                                                <span className="font-bold text-xs">{reply.author?.firstName} {reply.author?.lastName}</span>
                                                                <p className="text-xs text-foreground/80 mt-0.5">{reply.content}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-tatt-gray text-center py-4 italic">No perspectives shared yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </article >
    );
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white  w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-border flex items-center justify-between bg-black/5">
                    <h3 className="font-bold flex items-center gap-2">
                        <Repeat2 className="h-5 w-5 text-tatt-lime" />
                        Repost Insight
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors font-black">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <textarea
                        value={commentary}
                        onChange={(e) => setCommentary(e.target.value)}
                        className="w-full bg-black/5  border border-border rounded-2xl p-4 text-sm focus:ring-1 focus:ring-tatt-lime outline-none min-h-[120px]"
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
                            <span className="text-xs font-bold">{post.author.firstName} {post.author.lastName}</span>
                        </div>
                        <p className="text-xs text-tatt-gray line-clamp-2">
                            {post.isPremiumLocked ? "Elite Strategic Insight (Locked)" : (post.content || "").replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold hover:bg-black/5 transition-all uppercase tracking-widest text-xs">
                            Cancel
                        </button>
                        <button
                            onClick={handleRepost}
                            disabled={isSubmitting}
                            className="bg-tatt-lime text-black font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 flex items-center gap-2"
                        >
                            {isSubmitting && <div className="size-3 border-2 border-black border-t-transparent animate-spin rounded-full" />}
                            Share Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white  w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-border flex items-center justify-between bg-red-500/5">
                    <h3 className="font-bold flex items-center gap-2 text-red-500">
                        <Flag className="h-5 w-5" />
                        Report Insight
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors font-black">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-tatt-gray mb-3">Reason for Reporting</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-black/5  border border-border rounded-2xl p-4 text-sm focus:ring-1 focus:ring-red-500 outline-none min-h-[120px]"
                            placeholder="Please describe why this post violates community guidelines..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-tatt-gray mb-3">Suggested Strategic Action</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSuggestedAction("LIMIT_RECOMMENDATION")}
                                className={`p-4 rounded-2xl border text-xs font-bold transition-all ${suggestedAction === "LIMIT_RECOMMENDATION" ? "border-tatt-lime bg-tatt-lime/5 text-foreground" : "border-border bg-black/5 text-tatt-gray hover:border-tatt-lime/30"}`}
                            >
                                Limit Reach
                            </button>
                            <button
                                onClick={() => setSuggestedAction("DELETE")}
                                className={`p-4 rounded-2xl border text-xs font-bold transition-all ${suggestedAction === "DELETE" ? "border-red-500 bg-red-500/5 text-red-500" : "border-border bg-black/5 text-tatt-gray hover:border-red-500/30"}`}
                            >
                                Delete Post
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold hover:bg-black/5 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleReport}
                            disabled={isSubmitting}
                            className="bg-red-600 text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                        >
                            {isSubmitting && <div className="size-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                            Submit Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


