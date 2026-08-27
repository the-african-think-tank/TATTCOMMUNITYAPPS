"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
    ShieldCheck, MessageSquare, AlertCircle, Trash2, CheckCircle2,
    Ban, ExternalLink, RefreshCcw, Zap, TrendingUp, Calendar, Clock,
    Megaphone, Rocket, X, Loader2, Search, Settings, Pin, MoreVertical, Image as ImageIcon,
    Plus, Heart, ChevronUp, ChevronDown, Share2, Pencil
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { formatTimeAgo } from "@/utils/date";
import { useAuth } from "@/context/auth-context";
import { AppModal } from "@/components/modals/app-modal";
import { CreatePostModal } from "@/components/feed/create-post-modal";
import { PostCard } from "@/components/feed/post-card";

export default function CommunityFeedPage() {
    const { user } = useAuth();
    const canModerate = user?.systemRole === "SUPERADMIN" || user?.systemRole === "ADMIN" || user?.systemRole === "MODERATOR";

    const [stats, setStats] = useState({ reportsHandled: 0, activeDiscussions: 0, flaggedUsers: 0 });
    const [liveFeed, setLiveFeed] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [topics, setTopics] = useState<any[]>([]);
    
    // Topic Creation State
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [newTopicName, setNewTopicName] = useState("");
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);

    // Curation State
    const [activeInsight, setActiveInsight] = useState<any>(null);
    const [activePrompt, setActivePrompt] = useState<any>(null);
    const [insightForm, setInsightForm] = useState({ title: "", content: "", startDate: "" });
    const [promptInput, setPromptInput] = useState("");
    const [isDeploying, setIsDeploying] = useState(false);
    const [isRotating, setIsRotating] = useState(false);

    // Post Creation State
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, feedRes, reportsRes, curationRes, topicsRes] = await Promise.all([
                api.get("/admin/feed/stats"),
                api.get("/feed?limit=8"),
                api.get("/admin/feed/reports"),
                api.get("/feed/curation/active"),
                api.get("/feed/topics")
            ]);
            setStats(statsRes.data);
            setLiveFeed(feedRes.data.data);
            setReports(reportsRes.data);
            setActiveInsight(curationRes.data.insight);
            setActivePrompt(curationRes.data.prompt);
            setTopics(topicsRes.data);
        } catch (error) {
            console.error("Failed to fetch moderation data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchData();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleReportAction = async (reportId: string, action: 'RESOLVE' | 'DISMISS') => {
        try {
            await api.patch(`/admin/feed/reports/${reportId}`, { action });
            toast.success(`Report ${action === 'RESOLVE' ? 'resolved' : 'dismissed'}`);
            fetchData();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to permanently remove this post?")) return;
        try {
            await api.delete(`/admin/feed/posts/${postId}`);
            toast.success("Post removed");
            setLiveFeed(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const handleShadowBanPost = async (postId: string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/feed/posts/${postId}/shadow-ban`, { status: !currentStatus });
            toast.success(`Post reach ${!currentStatus ? 'limited' : 'restored'}`);
            setLiveFeed(prev => prev.map(p => p.id === postId ? { ...p, isShadowBanned: !currentStatus } : p));
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleShadowBanUser = async (userId: string) => {
        if (!confirm("Shadow ban this user? Their future posts will be hidden from the general feed.")) return;
        try {
            await api.patch(`/admin/feed/users/${userId}/shadow-ban`, { status: true });
            toast.success("User shadow banned");
            fetchData();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleDeployInsight = async () => {
        if (!insightForm.title || !insightForm.content) {
            toast.error("Please fill in heading and content");
            return;
        }
        setIsDeploying(true);
        try {
            const res = await api.post("/admin/feed/insights", insightForm);
            setActiveInsight(res.data);
            setInsightForm({ title: "", content: "", startDate: "" });
            toast.success("Insight deployed to feed");
        } catch (error) {
            toast.error("Deployment failed");
        } finally {
            setIsDeploying(false);
        }
    };

    const handleDeleteInsight = async (id: string) => {
        if (!confirm("Remove this insight from the community stream?")) return;
        try {
            await api.delete(`/admin/feed/insights/${id}`);
            setActiveInsight(null);
            toast.success("Insight node deactivated");
        } catch (error) {
            toast.error("Failed to deactivate insight");
        }
    };

    const handleCreateTopic = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newTopicName.trim()) {
            toast.error("Topic name is required");
            return;
        }
        setIsCreatingTopic(true);
        try {
            const res = await api.post("/admin/feed/topics", { name: newTopicName });
            setTopics(prev => [...prev, { ...res.data, posts: [] }].sort((a,b) => a.name.localeCompare(b.name)));
            toast.success("Topic created successfully");
            setNewTopicName("");
            setIsTopicModalOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create topic");
        } finally {
            setIsCreatingTopic(false);
        }
    };

    const handleArchiveTopic = async (id: string, name: string) => {
        if (!window.confirm(`Archive the topic "${name}"?`)) return;
        try {
            await api.patch(`/admin/feed/topics/${id}/archive`);
            setTopics(prev => prev.filter(t => t.id !== id));
            toast.success("Topic archived");
        } catch (error: any) {
            toast.error("Failed to archive topic");
        }
    };

    return (
        <div className="bg-background text-foreground min-h-screen">
            {/* Main Content Map to Canvas */}
            <div className="p-4 sm:p-8 xl:p-10 grid grid-cols-12 gap-8 max-w-[1920px] mx-auto">
                <div className="col-span-12 lg:col-span-8 flex flex-col space-y-8">
                    
                    {/* Admin Post Creation Trigger */}
                    <div className="bg-surface rounded-xl shadow-sm border border-border p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-tatt-lime rounded-full flex items-center justify-center shrink-0">
                                <ShieldCheck className="text-tatt-black size-5" />
                            </div>
                            <button
                                onClick={() => setIsCreatePostModalOpen(true)}
                                className="flex-1 text-left bg-background hover:bg-black/5 border border-border rounded-xl px-4 py-3 text-tatt-gray transition-colors cursor-pointer text-sm font-medium"
                            >
                                Write an official announcement, event, resource, or strategic post...
                            </button>
                            <button 
                                onClick={() => setIsCreatePostModalOpen(true)}
                                className="bg-tatt-lime text-tatt-black px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all cursor-pointer hidden sm:block"
                            >
                                Create Post
                            </button>
                        </div>
                    </div>

                    {/* Feed Separator */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Recent Community Activity</h2>
                        <div className="hidden sm:flex gap-4">
                            <button 
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className={`text-[10px] tracking-[0.15em] uppercase font-bold flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-lg hover:text-tatt-lime hover:border-tatt-lime transition-all ${refreshing ? "opacity-50" : ""}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${refreshing ? "bg-orange-500" : "bg-green-500"}`}></span> 
                                {refreshing ? "Syncing..." : "Live Feed"}
                            </button>
                            <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-tatt-gray flex items-center gap-2 bg-surface border border-border px-3 py-1 rounded-lg">
                                <RefreshCcw className={`size-3 text-tatt-lime ${refreshing ? "animate-spin" : ""}`} /> {liveFeed.length} Posts
                            </span>
                        </div>
                    </div>

                    {/* Feed Render */}
                    <div className="space-y-6">
                        {loading && <Loader2 className="animate-spin text-tatt-lime mx-auto mt-10 size-8" />}
                        {!loading && liveFeed.length === 0 && (
                            <div className="text-center py-10 bg-surface border border-border rounded-xl">
                                <p className="text-tatt-gray text-sm italic">Feed is dormant.</p>
                            </div>
                        )}
                        {liveFeed.map((post, index) => (
                            <PostCard key={post.id || `feed-item-${index}`} post={post} onPostDeleted={fetchData} allTopics={topics} />
                        ))}

                    </div>
                </div>

                {/* Moderation Tools Sidebar */}
                <aside className="col-span-12 lg:col-span-4 space-y-8">
                    
                    {/* Reported Content Alert Widget */}
                    {canModerate && (
                        reports.length > 0 ? (
                            <div className="bg-red-500 text-white rounded-xl p-6 shadow-lg shadow-red-500/20 relative overflow-hidden group">
                                <AlertCircle className="absolute -right-4 -bottom-4 size-32 opacity-10 group-hover:scale-110 transition-transform" />
                                <div className="text-[10px] tracking-[0.15em] uppercase font-bold opacity-80 mb-2">Pending Moderation</div>
                                <div className="text-4xl font-black mb-1">{reports.length}</div>
                                <div className="text-sm font-medium mb-4">Reported posts require review</div>
                                <Link href="/admin/feed-moderation" className="block w-full text-center bg-white text-red-600 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">
                                    REVIEW QUEUE
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-surface rounded-xl p-6 shadow-sm border border-border relative overflow-hidden group flex flex-col items-center justify-center h-48">
                                <ShieldCheck className="text-tatt-lime size-12 mb-3" />
                                <div className="text-[10px] tracking-[0.15em] uppercase font-bold text-tatt-gray mb-1">Queue Empty</div>
                                <div className="text-xl font-black text-foreground text-center line-clamp-2 leading-tight">No Pending Reports</div>
                            </div>
                        )
                    )}

                    {/* Trending Insights Manager */}
                    <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] tracking-[0.15em] uppercase font-bold text-foreground">Trending Insights</h3>
                            <TrendingUp className="text-tatt-lime size-5" />
                        </div>
                        <div className="space-y-4">
                            {activeInsight ? (
                                <div className="p-4 bg-background rounded-lg border border-border group relative overflow-hidden">
                                     <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] bg-tatt-lime/20 text-tatt-lime-dark px-2 py-0.5 rounded font-bold uppercase tracking-widest">Active Now</span>
                                        <button onClick={() => handleDeleteInsight(activeInsight.id)} className="text-tatt-gray hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                     </div>
                                     <p className="text-xs font-bold leading-snug truncate">{activeInsight.title}</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-background rounded-lg border border-border border-dashed text-center">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-tatt-gray">No insight active</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-border space-y-3">
                                <input 
                                    className="w-full text-sm rounded-lg bg-background border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-tatt-lime placeholder:text-tatt-gray" 
                                    placeholder="Insight Title"
                                    value={insightForm.title} onChange={e => setInsightForm({...insightForm, title: e.target.value})}
                                />
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-tatt-gray uppercase tracking-widest pl-1">Display Start Time</label>
                                    <input 
                                        type="datetime-local"
                                        className="w-full text-sm rounded-lg bg-background border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-tatt-lime" 
                                        value={insightForm.startDate} onChange={e => setInsightForm({...insightForm, startDate: e.target.value})}
                                    />
                                </div>
                                <textarea 
                                    className="w-full text-sm rounded-lg bg-background border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-tatt-lime min-h-[80px] placeholder:text-tatt-gray" 
                                    placeholder="Insight content..."
                                    value={insightForm.content} onChange={e => setInsightForm({...insightForm, content: e.target.value})}
                                />
                                <button onClick={handleDeployInsight} disabled={isDeploying} className="w-full py-2 bg-background border border-border rounded-lg text-[10px] font-bold tracking-widest uppercase hover:border-tatt-lime hover:text-tatt-lime transition-colors flex items-center justify-center gap-2">
                                    <Plus className="size-3" />
                                    {isDeploying ? "DEPLOYING..." : "PROMOTE TO TRENDING"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Manage Topics / Dynamic List */}
                    <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] tracking-[0.15em] uppercase font-bold text-foreground">Manage Topics</h3>
                            <button onClick={() => setIsTopicModalOpen(true)} className="bg-tatt-lime p-1 rounded-md active:scale-95 transition-all text-tatt-black focus:outline-none">
                                <Plus className="size-4" />
                            </button>
                        </div>
                        <ul className="space-y-3 text-foreground min-h-[150px] max-h-[250px] overflow-y-auto custom-scrollbar">
                            {topics.length === 0 && (
                                <p className="text-xs text-tatt-gray italic text-center py-4">No topics found</p>
                            )}
                            {topics.map(topic => (
                                <li key={topic.id} className="flex items-center justify-between p-2 hover:bg-background rounded-lg transition-all group">
                                    <div className="flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-tatt-lime"></span>
                                        <span className="text-sm font-bold">{topic.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] tracking-widest uppercase font-bold text-tatt-gray">
                                            {topic.posts?.length || 0} Posts
                                        </span>
                                        <button onClick={() => handleArchiveTopic(topic.id, topic.name)} className="text-tatt-gray hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setIsTopicModalOpen(true)} className="w-full mt-6 bg-tatt-black text-tatt-lime py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:brightness-125 transition-all outline-none">
                            CREATE NEW TOPIC
                        </button>
                    </div>

                    {/* Admin Insight Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface p-4 rounded-xl border border-border text-center">
                            <div className="text-[9px] tracking-widest uppercase font-bold mb-1 text-tatt-gray">Daily Posts</div>
                            <div className="text-xl font-black text-tatt-lime">{stats?.activeDiscussions || 0}</div>
                        </div>
                        <div className="bg-surface p-4 rounded-xl border border-border text-center">
                            <div className="text-[9px] tracking-widest uppercase font-bold mb-1 text-tatt-gray">Banned Today</div>
                            <div className="text-xl font-black text-foreground">{stats.flaggedUsers}</div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Topic Modal */}
            {isTopicModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => { setIsTopicModalOpen(false); setNewTopicName(""); }}
                            className="absolute top-4 right-4 text-tatt-gray hover:text-foreground transition-colors p-1"
                        >
                            <X className="size-5" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-xl bg-tatt-lime/20 flex items-center justify-center text-tatt-lime">
                                <MessageSquare className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight text-foreground leading-tight">Create Topic</h2>
                                <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest mt-1">Community Discussion</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateTopic} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground pl-1">Topic Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Strategic Planning"
                                    value={newTopicName}
                                    onChange={(e) => setNewTopicName(e.target.value)}
                                    maxLength={50}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime focus:outline-none placeholder:text-tatt-gray"
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreatingTopic || !newTopicName.trim()}
                                className="w-full bg-tatt-lime text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-tatt-lime/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {isCreatingTopic ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Plus className="size-4" />
                                )}
                                {isCreatingTopic ? "CREATING..." : "CREATE DISCUSSION TOPIC"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Post Modal */}
            <CreatePostModal
                isOpen={isCreatePostModalOpen}
                onClose={() => setIsCreatePostModalOpen(false)}
                onPostCreated={(newPost) => {
                    if (newPost) {
                        setLiveFeed(prev => [newPost, ...prev]);
                    }
                    fetchData();
                }}
                topics={topics}
            />
        </div>
    );
}
