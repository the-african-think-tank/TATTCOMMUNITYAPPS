"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
    MessageSquare, Briefcase, Zap, Calendar, MapPin, Link2, Lock,
    Pencil, Trash2, Repeat2, Flag, Highlighter, ArrowBigUp, ExternalLink,
    X, MoreHorizontal, Send, Image as ImageIcon, Heart, Share2, Eye
} from "lucide-react";
import { ActionDropdown } from "@/components/ui/action-dropdown";
import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import toast from "react-hot-toast";
import { AppModal } from "@/components/modals/app-modal";
import { formatTimeAgo, formatForDateTimeLocal } from "@/utils/date";

export interface Comment {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    parentId?: string;
    author: {
        id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
        systemRole?: string;
    };
    replies?: Comment[];
}

export function PostCard({
    post,
    onLike,
    onPostDeleted,
    onSelectTopic,
    registerPostRef,
    allTopics = [],
}: {
    post: any;
    onLike?: () => void;
    onPostDeleted?: () => void;
    onSelectTopic?: (topicId: string) => void;
    registerPostRef?: (node: HTMLElement | null, postId: string) => void;
    allTopics?: Array<{ id: string; name: string }>;
}) {
    const { user } = useAuth();
    const commentInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
    const [newComment, setNewComment] = useState("");
    const [replyContent, setReplyContent] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState<number>(post.commentsCount ?? post._count?.comments ?? 0);
    const [showOptions, setShowOptions] = useState(false);
    const [isReposting, setIsReposting] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
    const [isShadowBanned, setIsShadowBanned] = useState(Boolean(post.isShadowBanned));
    const [isUpvoted, setIsUpvoted] = useState(Boolean(post.isUpvotedByMe || post.isLikedByMe));
    const [localUpvotesCount, setLocalUpvotesCount] = useState<number>(post.upvotesCount ?? post.likesCount ?? post._count?.likes ?? 0);

    const [postTitle, setPostTitle] = useState(post.title || "");
    const [postContent, setPostContent] = useState(post.content || "");
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostTitle, setEditPostTitle] = useState(post.title || "");
    const [editPostContent, setEditPostContent] = useState(post.content || "");
    const [editJobCompany, setEditJobCompany] = useState(post.jobCompany || "");
    const [editJobLocation, setEditJobLocation] = useState(post.jobLocation || "");
    const [editJobLink, setEditJobLink] = useState(post.jobLink || "");
    const [editEventType, setEditEventType] = useState(post.eventType || "WEBINAR");
    const [editEventDate, setEditEventDate] = useState(formatForDateTimeLocal(post.eventDate));
    const [editEventUrl, setEditEventUrl] = useState(post.eventUrl || "");
    const [editPostTopicId, setEditPostTopicId] = useState(post.topic?.id || "");
    const [editMediaUrls, setEditMediaUrls] = useState<string[]>(post.mediaUrls || []);
    const [localMediaUrls, setLocalMediaUrls] = useState<string[]>(post.mediaUrls || []);
    const [savingPost, setSavingPost] = useState(false);

    // Comment edit state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    const [savingComment, setSavingComment] = useState(false);

    const handleStartEditPost = () => {
        setEditPostTitle(post.title || "");
        setEditPostContent(post.content || "");
        setEditJobCompany(post.jobCompany || "");
        setEditJobLocation(post.jobLocation || "");
        setEditJobLink(post.jobLink || "");
        setEditEventType(post.eventType || "WEBINAR");
        setEditEventDate(formatForDateTimeLocal(post.eventDate));
        setEditEventUrl(post.eventUrl || "");
        setEditPostTopicId(post.topic?.id || "");
        setEditMediaUrls(post.mediaUrls || []);
        setIsEditingPost(true);
    };

    const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const uploadFormData = new FormData();
        files.forEach(f => uploadFormData.append("files", f));

        try {
            toast.loading("Uploading image...", { id: "edit-upload" });
            const response = await api.post("/uploads/media", uploadFormData, { timeout: 120000 });
            const uploadedUrls = response.data.files?.map((f: any) => f.url) || [];
            setEditMediaUrls((prev: string[]) => [...prev, ...uploadedUrls]);
            toast.success("Image uploaded!", { id: "edit-upload" });
        } catch (err) {
            toast.error("Upload failed.", { id: "edit-upload" });
        }
    };

    const removeEditMediaUrl = (index: number) => {
        setEditMediaUrls((prev: string[]) => prev.filter((_, i) => i !== index));
    };

    const handleSavePostEdit = async () => {
        if (!editPostContent.trim()) return;
        setSavingPost(true);
        try {
            const res = await api.patch(`/feed/${post.id}`, {
                title: editPostTitle.trim() || undefined,
                content: editPostContent.trim(),
                mediaUrls: editMediaUrls,
                topicId: editPostTopicId || undefined,
                ...(post.type === "JOB" && {
                    jobCompany: editJobCompany,
                    jobLocation: editJobLocation,
                    jobLink: editJobLink,
                }),
                ...(post.type === "EVENT" && {
                    eventType: editEventType,
                    eventDate: editEventDate,
                    eventUrl: editEventUrl,
                }),
            });
            const updated = res.data;
            if (updated) {
                setPostTitle(updated.title || "");
                setPostContent(updated.content || "");
                setLocalMediaUrls(updated.mediaUrls || []);
                post.title = updated.title;
                post.content = updated.content;
                post.mediaUrls = updated.mediaUrls;
                post.jobCompany = updated.jobCompany;
                post.jobLocation = updated.jobLocation;
                post.jobLink = updated.jobLink;
                post.eventType = updated.eventType;
                post.eventDate = updated.eventDate;
                post.eventUrl = updated.eventUrl;
            }
            toast.success("Post updated successfully.");
            setIsEditingPost(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update post.");
        } finally {
            setSavingPost(false);
        }
    };

    const handleUpvote = async () => {
        if (isPostAuthor) {
            toast.error("You cannot react to your own post.");
            return;
        }
        try {
            const nextState = !isUpvoted;
            setIsUpvoted(nextState);
            setLocalUpvotesCount((prev: number) => nextState ? prev + 1 : Math.max(0, prev - 1));
            try {
                await api.post(`/feed/${post.id}/like`);
            } catch {
                await api.post(`/feed/${post.id}/upvote`);
            }
            if (onLike) onLike();
        } catch (error: any) {
            setIsUpvoted(!isUpvoted);
            setLocalUpvotesCount((prev: number) => isUpvoted ? prev + 1 : Math.max(0, prev - 1));
            toast.error(error.response?.data?.message || "Failed to update reaction");
        }
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/share/${post.id}`;
        if (navigator.share) {
            navigator.share({ title: post.title || "TATT Strategic Insight", url: shareUrl }).catch(() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied!");
            });
        } else {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Share link copied!");
        }
    };

    const handleBookmark = async () => {
        try {
            const nextState = !isBookmarked;
            setIsBookmarked(nextState);
            await api.post(`/feed/${post.id}/bookmark`);
            toast.success(nextState ? "Strategic insight bookmarked!" : "Removed from bookmarks");
        } catch (error) {
            setIsBookmarked(!isBookmarked);
            toast.error("Failed to update bookmark");
        }
    };

    const handleShadowBan = async () => {
        try {
            const nextState = !isShadowBanned;
            setIsShadowBanned(nextState);
            await api.patch(`/admin/feed/posts/${post.id}/shadow-ban`, { status: nextState });
            toast.success(nextState ? "Post shadow banned" : "Shadow ban removed");
        } catch (error) {
            setIsShadowBanned(!isShadowBanned);
            toast.error("Failed to update shadow ban status");
        }
    };

    const handleRepost = async () => {
        setIsReposting(true);
        const loadingToast = toast.loading("Reposting to your strategic feed...");
        try {
            await api.post(`/feed/${post.id}/repost`);
            toast.success("Reposted successfully to your network!", { id: loadingToast });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to repost", { id: loadingToast });
        } finally {
            setIsReposting(false);
            setShowOptions(false);
        }
    };

    const handleReport = async () => {
        const reason = prompt("Please provide a reason for reporting this post:");
        if (!reason) return;

        setIsReporting(true);
        const loadingToast = toast.loading("Submitting report to TATT Trust & Safety...");
        try {
            await api.post(`/feed/${post.id}/report`, { reason });
            toast.success("Report submitted. Our moderation team will review it.", { id: loadingToast });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to report post", { id: loadingToast });
        } finally {
            setIsReporting(false);
            setShowOptions(false);
        }
    };

    const handleDeletePost = async () => {
        if (!confirm("Are you sure you want to delete this strategic post? This action cannot be undone.")) return;

        const loadingToast = toast.loading("Deleting post...");
        try {
            await api.delete(`/feed/${post.id}`);
            toast.success("Post successfully removed from the TATT Feed.", { id: loadingToast });
            if (onPostDeleted) onPostDeleted();
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
                content: newComment.trim(),
            });
            setNewComment("");
            fetchComments();
            setLocalCommentsCount((prev: number) => prev + 1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add comment");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleAddReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !replyingTo) return;

        setIsSubmittingComment(true);
        try {
            await api.post(`/feed/${post.id}/comments`, {
                content: replyContent.trim(),
                parentId: replyingTo.id,
            });
            setReplyContent("");
            setReplyingTo(null);
            setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
            fetchComments();
            setLocalCommentsCount((prev: number) => prev + 1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add reply");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleStartEditComment = (commentId: string, currentContent: string) => {
        setEditingCommentId(commentId);
        setEditCommentContent(currentContent);
    };

    const handleSaveEditComment = async (commentId: string) => {
        if (!editCommentContent.trim()) return;
        setSavingComment(true);
        try {
            await api.patch(`/feed/comment/${commentId}`, { content: editCommentContent.trim() });
            toast.success("Comment updated.");
            setEditingCommentId(null);
            fetchComments();
        } catch {
            toast.error("Failed to update comment.");
        } finally {
            setSavingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            await api.delete(`/feed/comment/${commentId}`);
            toast.success("Comment removed.");
            setLocalCommentsCount((prev: number) => Math.max(0, prev - 1));
            fetchComments();
        } catch {
            toast.error("Failed to delete comment.");
        }
    };

    const isStaff = user?.systemRole === "ADMIN" || user?.systemRole === "SUPERADMIN" || user?.systemRole === "MODERATOR";
    const postAuthorId = post.author?.id || post.authorId;
    const isPostAuthor = Boolean(user?.id && postAuthorId && String(postAuthorId) === String(user.id));
    const canManagePost = isPostAuthor || isStaff;

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
                return { label: "Announcement", icon: Zap, className: "bg-black/5 dark:bg-white/5 text-foreground/80 border border-border/50" };
            case "RESOURCE":
                return { label: "Resource", icon: Briefcase, className: "bg-black/5 dark:bg-white/5 text-foreground/80 border border-border/50" };
            case "EVENT":
                return { label: "Event", icon: Calendar, className: "bg-black/5 dark:bg-white/5 text-foreground/80 border border-border/50" };
            case "JOB":
                return { label: "Career / Job", icon: Briefcase, className: "bg-black/5 dark:bg-white/5 text-foreground/80 border border-border/50" };
            default:
                return { label: "Post", icon: MessageSquare, className: "bg-black/5 dark:bg-white/5 text-foreground/80 border border-border/50" };
        }
    };

    const postTypeBadge = getPostTypeBadge(post.type);

    return (
        <article
            ref={(node) => registerPostRef?.(node, post.id)}
            className="bg-surface rounded-2xl border border-border/70 shadow-xs hover:border-border transition-all overflow-hidden group"
        >

            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                    <div className="flex gap-4">
                        <div className="relative">
                            <Link href={`/dashboard/network/${post.author?.id || post.authorId}`} className="block cursor-pointer">
                                <div className="size-12 rounded-full border-2 border-border overflow-hidden bg-background">
                                    {post.author?.profilePicture ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.author.profilePicture} alt={post.author.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center font-bold text-foreground/70 bg-black/5 dark:bg-white/5 border border-border/40">
                                            {post.author?.firstName?.charAt(0)}{post.author?.lastName?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Link href={`/dashboard/network/${post.author?.id || post.authorId}`} className="font-bold text-foreground hover:opacity-80 transition-opacity text-base cursor-pointer">
                                    {post.author?.firstName} {post.author?.lastName}
                                </Link>
                                {post.author?.communityTier && post.author.communityTier !== 'FREE' && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 text-foreground/80 border border-border/40">
                                        {post.author.communityTier}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-tatt-gray text-xs mt-0.5 flex-wrap">
                                {post.author?.headline && <span className="font-medium text-foreground/70">{post.author.headline}</span>}
                                {post.author?.headline && <span>•</span>}
                                {post.author?.chapter && (
                                    <span className="font-medium text-foreground/70">{post.author.chapter.name} Chapter</span>
                                )}
                                {post.author?.chapter && <span>•</span>}
                                <span>{formatTimeAgo(post.createdAt)}</span>
                                {typeof post.viewsCount === "number" && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1 text-tatt-gray">
                                            <Eye className="size-3" />
                                            {post.viewsCount}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Type badge */}
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${postTypeBadge.className}`}>
                            <postTypeBadge.icon className="size-3 text-tatt-gray" />
                            <span>{postTypeBadge.label}</span>
                        </div>

                        {/* Direct Shadow Ban Toggle Icon for Staff */}
                        {isStaff && (
                            <button
                                type="button"
                                onClick={handleShadowBan}
                                title={isShadowBanned ? "Remove Shadow Ban" : "Shadow Ban Post"}
                                className={`p-2 rounded-xl transition-all cursor-pointer outline-none ${
                                    isShadowBanned
                                        ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                                        : "text-tatt-gray hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                            >
                                <Zap className={`size-4 ${isShadowBanned ? "fill-amber-500" : ""}`} />
                            </button>
                        )}

                        {/* Options Dropdown */}
                        <ActionDropdown
                            ariaLabel="Post Options"
                            trigger={<MoreHorizontal className="size-5" />}
                            triggerClassName="p-2 text-tatt-gray hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer outline-none"
                            items={[
                                ...(canManagePost ? [{
                                    key: "edit",
                                    label: "Edit Post",
                                    icon: <Pencil className="size-4" />,
                                    onPress: handleStartEditPost
                                }] : []),
                                ...(!isStaff ? [{
                                    key: "report",
                                    label: "Report Post",
                                    icon: <Flag className="size-4" />,
                                    onPress: handleReport
                                }] : []),
                                ...(canManagePost ? [{
                                    key: "delete",
                                    label: "Delete Post",
                                    icon: <Trash2 className="size-4" />,
                                    isDanger: true,
                                    onPress: handleDeletePost
                                }] : [])
                            ]}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-2">
                    {postTitle && (
                        <h2 className="text-xl lg:text-2xl font-black tracking-tight leading-tight text-foreground">{postTitle}</h2>
                    )}

                    {post.isPremiumLocked ? (
                        <div className="bg-black/5 rounded-2xl p-8 border border-dashed border-border flex flex-col items-center text-center space-y-4">
                            <div className="size-16 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center text-tatt-lime">
                                <Lock className="size-8" />
                            </div>
                            <div className="max-w-md">
                                <h4 className="text-lg font-black mb-1">Elite Strategic Insight</h4>
                                <p className="text-sm text-tatt-gray">This resource is exclusive to TATT Ubuntu, Imani, and Kiongozi members. Upgrade your tier to unlock full access.</p>
                            </div>
                            <button className="bg-tatt-lime text-black font-black px-8 py-2.5 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-tatt-lime/10 cursor-pointer">
                                Upgrade Now
                            </button>
                        </div>
                    ) : post.contentFormat === 'HTML' ? (
                        <div
                            className="text-foreground/90 text-sm lg:text-base leading-relaxed whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: postContent || "" }}
                        />
                    ) : (
                        <div className="text-foreground/90 text-sm lg:text-base leading-relaxed whitespace-pre-wrap break-words">
                            {postContent}
                        </div>
                    )}

                    {/* Job Details Card */}
                    {post.type === "JOB" && !post.isPremiumLocked && (
                        <div className="mt-4 p-5 rounded-[24px] bg-tatt-bronze/5 border border-tatt-bronze/20 space-y-4 shadow-sm relative overflow-hidden">
                            {user?.communityTier === 'FREE' && post.author?.id !== user?.id ? (
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
                                    <Link href="/dashboard/upgrade" className="bg-tatt-bronze text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer">
                                        Unlock Opportunity
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-foreground/80">
                                        {post.jobCompany && (
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="size-4 text-tatt-bronze" />
                                                <span>{post.jobCompany}</span>
                                            </div>
                                        )}
                                        {post.jobLocation && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="size-4 text-tatt-bronze" />
                                                <span>{post.jobLocation}</span>
                                            </div>
                                        )}
                                    </div>
                                    {post.jobLink && (
                                        <a
                                            href={post.jobLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-tatt-bronze text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md shadow-tatt-bronze/20 cursor-pointer"
                                        >
                                            <Link2 className="size-4" />
                                            Apply / View Role
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Event Details Card */}
                    {post.type === "EVENT" && !post.isPremiumLocked && (post.eventType || post.eventDate || post.eventUrl) && (
                        <div className="mt-4 p-5 rounded-[24px] bg-tatt-gray/5 border border-tatt-gray/20 space-y-4 shadow-sm relative overflow-hidden">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-foreground/80">
                                {post.eventType && (
                                    <div className="flex items-center gap-2">
                                        <Zap className="size-4 text-tatt-lime-dark" />
                                        <span className="capitalize">{post.eventType.replace("_", " ")}</span>
                                    </div>
                                )}
                                {post.eventDate && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="size-4 text-tatt-lime-dark" />
                                        <span>{new Date(post.eventDate).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                            {post.eventUrl && (
                                <a
                                    href={post.eventUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-tatt-lime text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md shadow-tatt-lime/20 cursor-pointer"
                                >
                                    <ExternalLink className="size-4" />
                                    Join Event
                                </a>
                            )}
                        </div>
                    )}

                    {/* Topic Pill Badge */}
                    {post.topic && (
                        <div className="pt-2">
                            <button
                                onClick={() => onSelectTopic?.(post.topic.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider text-tatt-gray hover:text-foreground bg-black/5 dark:bg-white/5 border border-border/40 transition-all cursor-pointer"
                            >
                                <MessageSquare className="size-3" />
                                #{post.topic.name}
                            </button>
                        </div>
                    )}

                    {/* Media Attachments */}
                    {localMediaUrls && localMediaUrls.length > 0 && !post.isPremiumLocked && (
                        <div className={`grid gap-3 mt-4 ${localMediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {localMediaUrls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative group rounded-2xl overflow-hidden border border-border bg-black/5 aspect-video block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Parent Post (if Repost) */}
                    {post.parentPost && (
                        <div className="mt-4 border-l-4 border-tatt-lime/40 pl-4 py-2 bg-black/5 rounded-r-2xl space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-tatt-gray">
                                <Repeat2 className="size-3.5" />
                                <span>Original Post by {post.parentPost.author?.firstName} {post.parentPost.author?.lastName}</span>
                            </div>
                            <p className="text-xs text-foreground/80 line-clamp-3">
                                {post.parentPost.isPremiumLocked ? "Elite Strategic Insight (Locked)" : (post.parentPost.content || "").replace(/<[^>]*>?/gm, '').substring(0, 200) + '...'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer / Interaction Bar (Subtle Modern Design) */}
                <div className="-mx-5 -mb-5 mt-5 px-5 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-t border-border flex items-center gap-6 sm:gap-8 text-[11px] font-semibold uppercase tracking-wider text-tatt-gray">
                    <button
                        onClick={handleUpvote}
                        disabled={isPostAuthor}
                        title={isPostAuthor ? "You cannot react to your own post" : "React to post"}
                        className={`flex items-center gap-2 transition-colors ${
                            isUpvoted ? 'text-red-500 font-bold' : 'hover:text-foreground'
                        } ${isPostAuthor ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <Heart className={`size-4 ${isUpvoted ? 'fill-red-500 text-red-500' : ''}`} />
                        <span>{localUpvotesCount} {localUpvotesCount === 1 ? "REACTION" : "REACTIONS"}</span>
                    </button>

                    <button
                        onClick={toggleComments}
                        className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                    >
                        <MessageSquare className="size-4" />
                        <span>{localCommentsCount} {localCommentsCount === 1 ? "COMMENT" : "COMMENTS"}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                    >
                        <Share2 className="size-4" />
                        <span>SHARE</span>
                    </button>

                    <div className="flex items-center gap-2 text-tatt-gray ml-auto" title="Total post views">
                        <Eye className="size-4" />
                        <span>{post.viewsCount ?? 0} {(post.viewsCount ?? 0) === 1 ? "VIEW" : "VIEWS"}</span>
                    </div>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="mt-5 pt-5 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {/* Add Top-Level Comment Input */}
                        <form onSubmit={handleAddComment} className="flex gap-3 items-center">
                            <div className="size-8 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center font-bold text-tatt-lime shrink-0 text-xs overflow-hidden">
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
                                    type="text"
                                    placeholder="Share your strategic perspective..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl pl-4 pr-12 py-2.5 text-xs text-foreground placeholder:text-tatt-gray/60 focus:outline-none focus:ring-2 focus:ring-tatt-lime/20"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || isSubmittingComment}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-tatt-lime disabled:opacity-30 p-1 hover:scale-110 transition-transform cursor-pointer"
                                >
                                    <Send className="size-4" />
                                </button>
                            </div>
                        </form>

                        {/* Comments List */}
                        {isLoadingComments ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-tatt-lime"></div>
                            </div>
                        ) : comments.length === 0 ? (
                            <p className="text-xs text-tatt-gray italic text-center py-2">No comments yet. Start the conversation!</p>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {comments.map(c => {
                                    const commentAuthorId = c.author?.id;
                                    const canManageComment = Boolean(user?.id && commentAuthorId && String(commentAuthorId) === String(user.id)) || isStaff;

                                    return (
                                        <div key={c.id} className="p-3 bg-background rounded-xl space-y-2 border border-border/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-6 rounded-full bg-tatt-lime/10 flex items-center justify-center text-[10px] font-bold text-tatt-lime overflow-hidden">
                                                        {c.author?.profilePicture ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={c.author.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                        ) : (
                                                            <span>{c.author?.firstName?.charAt(0)}{c.author?.lastName?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-foreground">
                                                        {c.author?.firstName} {c.author?.lastName}
                                                    </span>
                                                    <span className="text-[10px] text-tatt-gray">
                                                        {formatTimeAgo(c.createdAt)}
                                                    </span>
                                                </div>

                                                {canManageComment && editingCommentId !== c.id && (
                                                    <ActionDropdown
                                                        ariaLabel="Comment Options"
                                                        trigger={<MoreHorizontal className="size-4" />}
                                                        triggerClassName="p-1 rounded-lg text-tatt-gray hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer outline-none"
                                                        items={[
                                                            {
                                                                key: "edit",
                                                                label: "Edit Comment",
                                                                icon: <Pencil className="size-3.5" />,
                                                                onPress: () => handleStartEditComment(c.id, c.content)
                                                            },
                                                            {
                                                                key: "delete",
                                                                label: "Delete Comment",
                                                                icon: <Trash2 className="size-3.5" />,
                                                                isDanger: true,
                                                                onPress: () => handleDeleteComment(c.id)
                                                            }
                                                        ]}
                                                    />
                                                )}
                                            </div>

                                            {editingCommentId === c.id ? (
                                                <div className="space-y-2 pt-1">
                                                    <input
                                                        type="text"
                                                        value={editCommentContent}
                                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                                        className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-tatt-lime"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingCommentId(null)}
                                                            className="px-2.5 py-1 text-[10px] font-bold text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveEditComment(c.id)}
                                                            disabled={savingComment || !editCommentContent.trim()}
                                                            className="bg-tatt-lime text-black font-black px-3 py-1 rounded-lg text-[10px] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                                        >
                                                            {savingComment ? "Saving..." : "Save"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-foreground/90 pl-8">{c.content}</p>
                                            )}

                                            <div className="flex items-center gap-4 pl-8 pt-1 text-[10px] font-bold text-tatt-gray">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (replyingTo?.id === c.id) {
                                                            setReplyingTo(null);
                                                            setReplyContent("");
                                                        } else {
                                                            setReplyContent("");
                                                            setReplyingTo({ id: c.id, authorName: `${c.author?.firstName || ''} ${c.author?.lastName || ''}`.trim() });
                                                            setExpandedReplies(prev => ({ ...prev, [c.id]: true }));
                                                        }
                                                    }}
                                                    className="hover:text-tatt-lime transition-colors cursor-pointer"
                                                >
                                                    {replyingTo?.id === c.id ? "Cancel Reply" : "Reply"}
                                                </button>

                                                {c.replies && c.replies.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedReplies(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                                        className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                                                    >
                                                        {expandedReplies[c.id] ? (
                                                            <>Hide {c.replies.length} {c.replies.length === 1 ? "Reply" : "Replies"}</>
                                                        ) : (
                                                            <>Show {c.replies.length} {c.replies.length === 1 ? "Reply" : "Replies"}</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Nested Replies List (Hidden by default) */}
                                            {c.replies && c.replies.length > 0 && expandedReplies[c.id] && (
                                                <div className="mt-2.5 ml-6 pl-3 border-l-2 border-tatt-lime/20 space-y-2">
                                                    {[...c.replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(r => {
                                                        const replyAuthorId = r.author?.id;
                                                        const canManageReply = Boolean(user?.id && replyAuthorId && String(replyAuthorId) === String(user.id)) || isStaff;

                                                        return (
                                                            <div key={r.id} className="p-2.5 bg-background/60 rounded-xl space-y-1.5 border border-border/40">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-5 rounded-full bg-tatt-lime/10 flex items-center justify-center text-[9px] font-bold text-tatt-lime overflow-hidden">
                                                                            {r.author?.profilePicture ? (
                                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                                <img src={r.author.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                                            ) : (
                                                                                <span>{r.author?.firstName?.charAt(0)}{r.author?.lastName?.charAt(0)}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-xs font-bold text-foreground">
                                                                            {r.author?.firstName} {r.author?.lastName}
                                                                        </span>
                                                                        <span className="text-[9px] text-tatt-gray">
                                                                            {formatTimeAgo(r.createdAt)}
                                                                        </span>
                                                                    </div>

                                                                    {canManageReply && editingCommentId !== r.id && (
                                                                        <ActionDropdown
                                                                            ariaLabel="Reply Options"
                                                                            trigger={
                                                                                <button className="p-1 rounded-lg text-tatt-gray hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer outline-none">
                                                                                    <MoreHorizontal className="size-3.5" />
                                                                                </button>
                                                                            }
                                                                            items={[
                                                                                {
                                                                                    key: "edit",
                                                                                    label: "Edit Reply",
                                                                                    icon: <Pencil className="size-3.5" />,
                                                                                    onPress: () => handleStartEditComment(r.id, r.content)
                                                                                },
                                                                                {
                                                                                    key: "delete",
                                                                                    label: "Delete Reply",
                                                                                    icon: <Trash2 className="size-3.5" />,
                                                                                    isDanger: true,
                                                                                    onPress: () => handleDeleteComment(r.id)
                                                                                }
                                                                            ]}
                                                                        />
                                                                    )}
                                                                </div>

                                                                {editingCommentId === r.id ? (
                                                                    <div className="space-y-2 pt-1">
                                                                        <input
                                                                            type="text"
                                                                            value={editCommentContent}
                                                                            onChange={(e) => setEditCommentContent(e.target.value)}
                                                                            className="w-full bg-surface border border-border rounded-lg px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-tatt-lime"
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingCommentId(null)}
                                                                                className="px-2 py-0.5 text-[10px] font-bold text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSaveEditComment(r.id)}
                                                                                disabled={savingComment || !editCommentContent.trim()}
                                                                                className="bg-tatt-lime text-black font-black px-3 py-0.5 rounded-lg text-[10px] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                                                            >
                                                                                {savingComment ? "Saving..." : "Save"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-foreground/90 pl-7">{r.content}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Inline Reply Input inside Comment Box */}
                                            {replyingTo?.id === c.id && (
                                                <form onSubmit={handleAddReply} className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 pl-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="size-6 rounded-full bg-tatt-lime/10 flex items-center justify-center text-[10px] font-bold text-tatt-lime overflow-hidden shrink-0">
                                                        {user?.profilePicture ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                        ) : (
                                                            <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder={`Reply to @${replyingTo.authorName}...`}
                                                            value={replyContent}
                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                            className="w-full bg-surface border border-border/80 rounded-xl pl-3 pr-14 py-1.5 text-xs text-foreground placeholder:text-tatt-gray/60 focus:outline-none focus:ring-1 focus:ring-tatt-lime"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-tatt-gray hover:text-foreground p-1 cursor-pointer"
                                                            title="Cancel reply"
                                                        >
                                                            <X className="size-3.5" />
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={!replyContent.trim() || isSubmittingComment}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-tatt-lime disabled:opacity-30 p-1 hover:scale-110 transition-transform cursor-pointer"
                                                        >
                                                            <Send className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Post Modal */}
            {isEditingPost && (
                <AppModal
                    isOpen={isEditingPost}
                    onClose={() => setIsEditingPost(false)}
                    title="Edit Strategic Post"
                    subtitle="Modify content, title, topics, or media attachments."
                    maxWidth="max-w-3xl"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={editFileInputRef}
                                    onChange={handleEditFileUpload}
                                    multiple
                                    hidden
                                    accept="image/*,video/*,application/pdf"
                                />
                                <button
                                    type="button"
                                    onClick={() => editFileInputRef.current?.click()}
                                    className="p-2.5 bg-black/5 hover:bg-tatt-lime/10 hover:text-tatt-lime rounded-xl transition-all cursor-pointer text-tatt-gray"
                                    title="Add Images"
                                >
                                    <ImageIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingPost(false)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-tatt-gray font-bold text-sm hover:bg-black/5 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSavePostEdit}
                                    disabled={savingPost || !editPostContent.trim()}
                                    className="bg-tatt-lime text-black font-black px-6 py-2.5 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 cursor-pointer disabled:opacity-50"
                                >
                                    {savingPost ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    }
                >
                    <input
                        value={editPostTitle}
                        onChange={(e) => setEditPostTitle(e.target.value)}
                        placeholder="Post Title (Optional)"
                        className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 placeholder:text-tatt-gray outline-none text-foreground mb-3"
                    />

                    {post.type === "JOB" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl mb-3">
                            <input
                                value={editJobCompany}
                                onChange={(e) => setEditJobCompany(e.target.value)}
                                placeholder="Company Name"
                                className="w-full bg-white border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                            />
                            <input
                                value={editJobLocation}
                                onChange={(e) => setEditJobLocation(e.target.value)}
                                placeholder="Location"
                                className="w-full bg-white border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                            />
                            <input
                                value={editJobLink}
                                onChange={(e) => setEditJobLink(e.target.value)}
                                placeholder="Job Link"
                                className="md:col-span-2 w-full bg-white border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                            />
                        </div>
                    )}

                    <textarea
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                        placeholder="Edit post content..."
                        className="w-full bg-transparent border-none text-base resize-none focus:ring-0 min-h-[180px] placeholder:text-tatt-gray/50 outline-none text-foreground"
                    />

                    {editMediaUrls.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                            {editMediaUrls.map((url, i) => (
                                <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border group bg-background">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="Media preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeEditMediaUrl(i)}
                                        className="absolute top-2 right-2 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </AppModal>
            )}
        </article>
    );
}
