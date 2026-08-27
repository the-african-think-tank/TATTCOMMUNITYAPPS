"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import Image from "next/image";
import Link from "next/link";
import {
  Building2, Users, MapPin, Newspaper, Calendar, UserPlus,
  ChevronRight, Loader2, Heart, MessageCircle, Plus, X,
  Megaphone, Lightbulb, Clock, AlertCircle, Send, Pencil, Trash2, ShieldCheck, ArrowRight
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { initiateFeedSocket, disconnectFeedSocket } from "@/services/feed-socket";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  name: string;
  code: string;
  description?: string;
  cities: string[];
  regionalManager?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
  };
}

interface ChapterMember {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  professionTitle: string | null;
  industry: string | null;
  communityTier: string;
}

interface ChapterActivity {
  id: string;
  type: "ANNOUNCEMENT" | "EVENT" | "INITIATIVE" | "NEWS";
  title: string;
  content: string;
  imageUrl?: string;
  eventDate?: string;
  eventLocation?: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
  };
}

interface ChapterPost {
  id: string;
  type: string;
  title: string | null;
  content: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
    communityTier: string;
    tattMemberId: string;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_CONFIG = {
  ANNOUNCEMENT: { label: "Announcement", icon: Megaphone, color: "text-tatt-lime bg-tatt-lime/10 border-tatt-lime/20" },
  EVENT: { label: "Event", icon: Calendar, color: "text-blue-600 bg-blue-50  border-blue-200 " },
  INITIATIVE: { label: "Initiative", icon: Lightbulb, color: "text-amber-600 bg-amber-50  border-amber-200 " },
  NEWS: { label: "News", icon: Newspaper, color: "text-purple-600 bg-purple-50  border-purple-200 " },
};

const TIER_BADGES: Record<string, { label: string; classes: string }> = {
  KIONGOZI: { label: "Kiongozi", classes: "bg-tatt-lime text-tatt-black" },
  IMANI: { label: "Imani", classes: "bg-slate-200  text-foreground" },
  UBUNTU: { label: "Ubuntu", classes: "bg-background border border-border text-tatt-gray" },
  FREE: { label: "Sankofa", classes: "bg-background border border-border text-tatt-gray" },
};

const DEFAULT_TIER = TIER_BADGES.FREE;

function getTier(communityTier?: string): { label: string; classes: string } {
  return TIER_BADGES[communityTier || "FREE"] ?? TIER_BADGES.FREE!;
}

function timeAgo(date: string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "recently";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full overflow-hidden shrink-0 relative border border-border">
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full shrink-0 bg-tatt-lime/10 border border-tatt-lime/30 flex items-center justify-center font-bold text-tatt-lime-dark"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MyChapterPage() {
  const { user } = useAuth();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [members, setMembers] = useState<ChapterMember[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [chapterEvents, setChapterEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<ChapterActivity[]>([]);
  const [feed, setFeed] = useState<ChapterPost[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "news" | "members" | "events">("news");

  const safeDate = (dateStr?: string) => {
    if (!dateStr) return new Date();
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  };

  // Admin post modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "ANNOUNCEMENT" as ChapterActivity["type"],
    title: "",
    content: "",
    eventDate: "",
    eventLocation: "",
  });
  const [postingActivity, setPostingActivity] = useState(false);

  // Real-time states
  const [newPostsAvailableCount, setNewPostsAvailableCount] = useState(0);

  const isAdmin = ["ADMIN", "SUPERADMIN", "REGIONAL_ADMIN"].includes(user?.systemRole || "");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!user?.chapterId) {
      setLoading(false);
      return;
    }
    const cid = user.chapterId;
    setLoading(true);
    try {
      const [chapterRes, membersRes, activitiesRes, feedRes, eventsRes] = await Promise.allSettled([
        api.get(`/chapters/${cid}`),
        api.get(`/chapters/${cid}/members?excludeSelf=true`),
        api.get(`/chapters/${cid}/activities?limit=10&visibility=CHAPTER_WIDE`),
        api.get(`/chapters/${cid}/feed?limit=15&excludeSelf=true`),
        api.get(`/events`, { params: { chapterId: cid } }),
      ]);

      if (chapterRes.status === "fulfilled") setChapter(chapterRes.value.data);
      if (membersRes.status === "fulfilled") {
        setMembers(membersRes.value.data.members || []);
        setMemberTotal(membersRes.value.data.total || 0);
      }
      if (activitiesRes.status === "fulfilled") setActivities(activitiesRes.value.data.data || []);
      if (feedRes.status === "fulfilled") setFeed(feedRes.value.data.data || []);
      if (eventsRes.status === "fulfilled") {
        const allEvents = eventsRes.value.data;
        const filtered = allEvents.filter((e: any) =>
          e.locations && e.locations.some((l: any) => l.chapterId === cid)
        ).slice(0, 3);
        setChapterEvents(filtered);
      }
    } catch (err) {
      console.error("Failed to load chapter data", err);
    } finally {
      setLoading(false);
    }
  }, [user?.chapterId]);

  useEffect(() => { 
    fetchAll();

    // ── Real-time Feed Socket ───────────────────────────────────────────
    const socket = initiateFeedSocket();
    
    socket.on('new_post', (newPost: any) => {
        // Only notify for actual feed posts if we are not the author
        if (newPost.authorId === user?.id) return;

        // If it's a post for our specific chapter
        if (newPost.chapterId === user?.chapterId) {
            const isAtTop = window.scrollY < 100;
            
            if (isAtTop && activeTab === 'feed') {
                // Auto refresh the feed
                api.get(`/chapters/${user?.chapterId}/feed?limit=15`).then(res => {
                    setFeed(res.data.data || []);
                    toast.success(`New chapter insight from ${newPost.authorName}`);
                });
            } else {
                setNewPostsAvailableCount(prev => prev + 1);
                toast(`New local community insight available.`, { icon: '🏘️' });
            }
        }
    });

    return () => {
        disconnectFeedSocket();
    };
  }, [fetchAll, user?.chapterId, user?.id, activeTab]);

  // ── Like post ──────────────────────────────────────────────────────────────

  const handleLike = async (postId: string) => {
    setFeed(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    try {
      await api.post(`/feed/${postId}/like`);
    } catch {
      // revert
      setFeed(prev => prev.map(p =>
        p.id === postId
          ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      ));
    }
  };

  // ── Post activity (admin) ─────────────────────────────────────────────────

  const handlePostActivity = async () => {
    if (!activityForm.title.trim() || !activityForm.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setPostingActivity(true);
    
    // Create a clean payload to avoid backend validation errors (e.g. ISO 8601 Date String error for empty eventDate)
    const payload: any = {
      type: activityForm.type,
      title: activityForm.title,
      content: activityForm.content,
    };
    
    if (activityForm.eventDate) {
      payload.eventDate = new Date(activityForm.eventDate).toISOString();
    }
    if (activityForm.eventLocation) {
      payload.eventLocation = activityForm.eventLocation;
    }
    
    try {
      await api.post(`/chapters/${user?.chapterId}/activities`, payload);
      toast.success("Activity posted!");
      setShowActivityModal(false);
      setActivityForm({ type: "ANNOUNCEMENT", title: "", content: "", eventDate: "", eventLocation: "" });
      // Refresh activities
      const res = await api.get(`/chapters/${user?.chapterId}/activities?limit=10`);
      setActivities(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to post activity.");
    } finally {
      setPostingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Delete this activity?")) return;
    try {
      await api.delete(`/chapters/${user?.chapterId}/activities/${activityId}`);
      setActivities(prev => prev.filter(a => a.id !== activityId));
      toast.success("Activity deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  // ── No Chapter State ─────────────────────────────────────────────────────

  if (!loading && !user?.chapterId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center p-8 bg-surface rounded-3xl border border-dashed border-border mt-8">
        <Building2 className="size-16 text-tatt-gray opacity-20" />
        <h2 className="text-2xl font-black text-foreground">No Chapter Assigned</h2>
        <p className="text-tatt-gray max-w-sm text-sm">
          You haven't chosen a chapter yet. Joining a chapter helps you connect with members in your local ecosystem.
        </p>
        <Link
          href="/dashboard/settings"
          className="bg-tatt-lime text-tatt-black px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-tatt-lime/20"
        >
          Choose a Chapter in Settings
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-4">
        <Loader2 className="size-10 animate-spin text-tatt-lime" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-tatt-gray text-xs font-bold uppercase tracking-widest mb-2">
            <Building2 className="size-4" />
            <span>My Chapter</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            {chapter?.name || "Chapter"}
          </h1>
          {chapter?.description && (
            <p className="text-tatt-gray mt-1 font-medium text-sm max-w-xl">{chapter.description}</p>
          )}
          {chapter?.cities && chapter.cities.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-tatt-gray text-xs">
              <MapPin className="size-3" />
              <span>{chapter.cities.slice(0, 4).join(", ")}</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowActivityModal(true)}
            className="flex items-center gap-2 bg-tatt-lime text-tatt-black font-black px-5 py-2.5 rounded-xl hover:brightness-110 transition-all shadow-sm shadow-tatt-lime/20 text-sm shrink-0"
          >
            <Plus className="size-4" /> Post Activity
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2">

          {/* Chapter Manager / Leadership */}
          {chapter?.regionalManager && (
            <div className="bg-surface rounded-2xl border border-border p-4 mb-8 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Avatar
                    src={chapter.regionalManager.profilePicture}
                    name={`${chapter.regionalManager.firstName} ${chapter.regionalManager.lastName}`}
                    size={56}
                  />
                  <ShieldCheck className="absolute -bottom-1 -right-1 size-5 text-tatt-lime bg-surface rounded-full p-0.5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-tatt-lime uppercase tracking-widest mb-0.5">Chapter Lead</p>
                  <p className="font-bold text-foreground text-base">
                    {chapter.regionalManager.firstName} {chapter.regionalManager.lastName}
                  </p>
                  <p className="text-xs text-tatt-gray">{chapter.regionalManager.professionTitle}</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-6 text-center">
                <div>
                  <p className="text-2xl font-black text-foreground">{memberTotal}</p>
                  <p className="text-[10px] text-tatt-gray font-bold uppercase tracking-widest">Members</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">{activities.length}</p>
                  <p className="text-[10px] text-tatt-gray font-bold uppercase tracking-widest">Activities</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">{feed.length}</p>
                  <p className="text-[10px] text-tatt-gray font-bold uppercase tracking-widest">Posts</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-surface rounded-2xl border border-border p-1 mb-8 w-full sm:w-fit">
            {([
              { id: "news", label: "Chapter News", icon: Newspaper },
              { id: "feed", label: "Member Posts", icon: Users },
              { id: "members", label: "Members", icon: UserPlus },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${activeTab === id
                  ? "bg-tatt-lime text-tatt-black shadow-sm"
                  : "text-tatt-gray hover:text-foreground"
                  }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* ── Chapter News Tab ──────────────────────────────────────────────── */}
          {activeTab === "news" && (
            <div className="space-y-6">
              {activities.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border">
                  <Megaphone className="size-12 text-tatt-gray mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-black text-foreground mb-1">No activities yet</h3>
                  <p className="text-tatt-gray text-sm">
                    {isAdmin ? "Post your first chapter activity using the button above." : "Chapter news and updates will appear here."}
                  </p>
                </div>
              ) : (
                activities.map((activity, index) => {
                  const isLatest = index === 0 && (Date.now() - new Date(activity.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000);
                  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.ANNOUNCEMENT;
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div
                      key={activity.id}
                      className={`bg-surface rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all relative ${isLatest ? 'border-tatt-lime ring-1 ring-tatt-lime/20' : 'border-border'
                        }`}
                    >
                      {isLatest && (
                        <div className="absolute top-0 right-0 z-10">
                          <div className="bg-tatt-lime text-tatt-black text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg">
                            Latest
                          </div>
                        </div>
                      )}
                      {activity.imageUrl && (
                        <div className="h-48 w-full relative">
                          <Image src={activity.imageUrl} alt={activity.title} fill className="object-cover" />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeConfig.color}`}>
                            <TypeIcon className="size-3" />
                            {typeConfig.label}
                          </span>
                          <span className="text-xs text-tatt-gray font-medium">{timeAgo(activity.createdAt)}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="ml-auto p-1.5 rounded-lg hover:bg-red-50  text-tatt-gray hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-foreground mb-2">{activity.title}</h3>
                        <p className="text-tatt-gray text-sm leading-relaxed mb-4">{activity.content}</p>

                        {(activity.eventDate || activity.eventLocation) && (
                          <div className="flex flex-wrap gap-3 text-xs text-tatt-gray bg-surface border border-border rounded-xl p-3">
                            {activity.eventDate && (
                              <span className="flex items-center gap-1.5 font-bold">
                                <Calendar className="size-3.5 text-tatt-lime" />
                                {safeDate(activity.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                              </span>
                            )}
                            {activity.eventLocation && (
                              <span className="flex items-center gap-1.5 font-bold">
                                <MapPin className="size-3.5 text-tatt-lime" />
                                {activity.eventLocation}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                          <Avatar
                            src={activity.author.profilePicture}
                            name={`${activity.author.firstName} ${activity.author.lastName}`}
                            size={28}
                          />
                          <span className="text-xs text-tatt-gray font-medium">
                            Posted by <span className="font-bold text-foreground">{activity.author.firstName} {activity.author.lastName}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Member Posts Feed Tab ────────────────────────────────────────── */}
          {activeTab === "feed" && (
            <div className="space-y-5">
              {newPostsAvailableCount > 0 && (
                <button
                    onClick={() => {
                        api.get(`/chapters/${user?.chapterId}/feed?limit=15&excludeSelf=true`).then(res => {
                            setFeed(res.data.data || []);
                            setNewPostsAvailableCount(0);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                        });
                    }}
                    className="w-full bg-tatt-lime/10 border border-tatt-lime/20 text-tatt-lime font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-tatt-lime/20 transition-all animate-bounce shadow-xl shadow-tatt-lime/5"
                >
                    <Users size={18} fill="currentColor" /> {newPostsAvailableCount} New Chapter Posts Available — Refresh Feed
                </button>
              )}
              {feed.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border">
                  <Users className="size-12 text-tatt-gray mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-black text-foreground mb-1">No member posts yet</h3>
                  <p className="text-tatt-gray text-sm">Posts shared by other members in your chapter will appear here.</p>
                </div>
              ) : (
                feed.map(post => {
                  const tier = getTier(post.author.communityTier);
                  return (
                    <div key={post.id} className="bg-surface rounded-2xl border border-border shadow-sm p-5 hover:shadow-md hover:border-tatt-lime/20 transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar
                          src={post.author.profilePicture}
                          name={`${post.author.firstName} ${post.author.lastName}`}
                          size={40}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/dashboard/network/${post.author.id}`}
                              className="font-bold text-foreground hover:text-tatt-lime-dark transition-colors text-sm"
                            >
                              {post.author.firstName} {post.author.lastName}
                            </Link>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${tier.classes}`}>
                              {tier?.label}
                            </span>
                          </div>
                          <p className="text-xs text-tatt-gray mt-0.5">
                            {post.author.professionTitle} · {timeAgo(post.createdAt)}
                          </p>
                        </div>
                      </div>

                      {post.title && (
                        <h4 className="font-bold text-foreground mb-1 text-base">{post.title}</h4>
                      )}
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-4">
                        {post.content}
                      </p>

                      {post.mediaUrls?.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-3 rounded-xl overflow-hidden">
                          {post.mediaUrls.slice(0, 4).map((url, i) => (
                            <div key={i} className="relative aspect-video">
                              <Image src={url} alt="Post media" fill className="object-cover rounded-xl" />
                            </div>
                          ))}
                        </div>
                      )}

                      {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {post.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-tatt-lime-dark bg-tatt-lime/10 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${post.isLikedByMe ? "text-red-500" : "text-tatt-gray hover:text-red-400"}`}
                        >
                          <Heart className={`size-4 ${post.isLikedByMe ? "fill-red-500" : ""}`} />
                          {post.likesCount}
                        </button>
                        <Link
                          href={`/dashboard/feed`}
                          className="flex items-center gap-1.5 text-xs font-bold text-tatt-gray hover:text-foreground transition-colors"
                        >
                          <MessageCircle className="size-4" />
                          {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Members Tab ──────────────────────────────────────────────────── */}
          {activeTab === "members" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-tatt-gray font-bold">
                  {memberTotal} member{memberTotal !== 1 ? "s" : ""} in this chapter
                </p>
                <Link
                  href="/dashboard/network"
                  className="text-xs font-bold text-tatt-lime-dark flex items-center gap-1 hover:underline"
                >
                  View Network <ChevronRight className="size-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map(m => {
                  const tier = getTier(m.communityTier);
                  return (
                    <div key={m.id} className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-3 hover:border-tatt-lime/30 hover:shadow-sm transition-all group">
                      <Avatar
                        src={m.profilePicture}
                        name={`${m.firstName} ${m.lastName}`}
                        size={44}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground truncate group-hover:text-tatt-lime-dark transition-colors">
                            {m.firstName} {m.lastName}
                          </p>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${tier.classes}`}>
                            {tier.label}
                          </span>
                        </div>
                        <p className="text-xs text-tatt-gray truncate">{m.professionTitle || m.industry || "Member"}</p>
                      </div>
                      <Link
                        href={`/dashboard/network/${m.id}`}
                        className="size-8 rounded-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark hover:bg-tatt-lime hover:text-tatt-black transition-all shrink-0"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
              {members.length === 0 && (
                <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border">
                  <Users className="size-12 text-tatt-gray mx-auto mb-4 opacity-20" />
                  <p className="text-tatt-gray text-sm font-bold">No members found in this chapter.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="xl:sticky xl:top-24 space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-4 text-tatt-lime" />
                Upcoming Events
              </h3>
              <Link href="/dashboard/events" className="text-[10px] font-black uppercase text-tatt-lime hover:underline">View All</Link>
            </div>

            <div className="space-y-4">
              {chapterEvents.length === 0 ? (
                <p className="text-xs text-tatt-gray italic py-4 text-center">No upcoming events scheduled.</p>
              ) : (
                chapterEvents.map(event => (
                  <div key={event.id} className="group cursor-pointer">
                    <Link href={`/dashboard/events`}>
                      <div className="flex gap-3">
                        <div className="size-12 rounded-xl bg-tatt-black flex flex-col items-center justify-center shrink-0 border border-white/5">
                          <span className="text-[8px] font-black text-white/50 uppercase leading-none">{safeDate(event.dateTime).toLocaleDateString("en-US", { month: "short" })}</span>
                          <span className="text-lg font-black text-white leading-none mt-1">{safeDate(event.dateTime).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-tatt-lime transition-colors truncate">{event.title}</h4>
                          <p className="text-[10px] text-tatt-gray mt-1 flex items-center gap-1">
                            <Clock className="size-3" /> {safeDate(event.dateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-tatt-gray mt-0.5 flex items-center gap-1">
                            <MapPin className="size-3" /> {event.locations?.[0]?.address || "TBA"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/dashboard/events"
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-tatt-black text-white   rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Explore Mixers & Workshops <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="bg-tatt-lime/5 border border-tatt-lime/20 rounded-2xl p-5">
            <h4 className="text-xs font-black text-tatt-lime uppercase tracking-widest mb-2">Member Perk</h4>
            <p className="text-[11px] text-foreground font-medium leading-relaxed">
              Don't forget! Your <span className="font-bold">{user?.communityTier}</span> membership includes special pricing for most of these events.
            </p>
          </div>
        </div>
      </div>

      {/* ── Admin Activity Modal ──────────────────────────────────────────── */}
      {showActivityModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowActivityModal(false); }}
        >
          <div className="bg-surface w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="bg-tatt-black px-6 pt-6 pb-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-tatt-lime uppercase tracking-widest mb-1">Chapter Admin</p>
                <h2 className="text-xl font-black text-white">Post Chapter Activity</h2>
              </div>
              <button onClick={() => setShowActivityModal(false)} className="text-white/40 hover:text-white transition-colors mt-1">
                <X className="size-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Activity Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(ACTIVITY_TYPE_CONFIG) as [ChapterActivity["type"], typeof ACTIVITY_TYPE_CONFIG.ANNOUNCEMENT][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setActivityForm(f => ({ ...f, type: key }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${activityForm.type === key
                          ? "border-tatt-lime bg-tatt-lime/10 text-foreground"
                          : "border-border bg-background text-tatt-gray hover:border-tatt-lime/30"
                          }`}
                      >
                        <Icon className="size-4 shrink-0" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Q1 Chapter General Meeting"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Content *</label>
                <textarea
                  rows={4}
                  value={activityForm.content}
                  onChange={e => setActivityForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your update, announcement, or news here..."
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all resize-none"
                />
              </div>

              {/* Event-specific fields */}
              {activityForm.type === "EVENT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Event Date</label>
                    <input
                      type="datetime-local"
                      value={activityForm.eventDate}
                      onChange={e => setActivityForm(f => ({ ...f, eventDate: e.target.value }))}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Location</label>
                    <input
                      type="text"
                      value={activityForm.eventLocation}
                      onChange={e => setActivityForm(f => ({ ...f, eventLocation: e.target.value }))}
                      placeholder="e.g. Accra Hub or Virtual"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handlePostActivity}
                  disabled={postingActivity || !activityForm.title.trim() || !activityForm.content.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-tatt-lime text-tatt-black py-3 rounded-xl font-black text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {postingActivity ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Post Activity
                </button>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="px-5 py-3 rounded-xl border border-border text-tatt-gray font-bold text-sm hover:bg-background transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
