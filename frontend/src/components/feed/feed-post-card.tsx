"use client";

import { useState, useRef } from "react";
import api from "@/services/api";
import Link from "next/link";
import {
    Heart,
    MessageCircle,
    Lock,
    Send,
    Loader2,
    MoreVertical,
    MoreHorizontal,
    Trash2,
    Pencil,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    X,
    Briefcase,
    MapPin,
    Link2,
    Calendar,
    Image as ImageIcon,
    Paperclip
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import toast from "react-hot-toast";
import { AppModal } from "@/components/modals/app-modal";

import type { FeedPost } from "@/types/feed";

type FeedPostCardProps = {
    post: FeedPost;
    onLikeToggle: () => void;
    onCommentAdded: () => void;
    onDelete?: () => void;
    onPostUpdated?: () => void;
};

import { formatTimeAgo, formatForDateTimeLocal } from "@/utils/date";
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
    DropdownItem
} from "@heroui/react";

function formatDate(iso: string) {
    return formatTimeAgo(iso);
}

export function FeedPostCard({ post, onLikeToggle, onCommentAdded, onDelete, onPostUpdated }: FeedPostCardProps) {
    const { user } = useAuth();
    const isStaff = user?.systemRole !== "COMMUNITY_MEMBER";
    const isProfileComplete = isStaff || user?.flags?.includes("PROFILE_COMPLETED");

    const postAuthorId = post.author?.id || (post as any).authorId;
    const isPostAuthor = Boolean(user?.id && postAuthorId && String(postAuthorId) === String(user.id));
    const canManagePost = isPostAuthor || isStaff;

    const canEditComment = (commentAuthor: any) => {
        const authorId = commentAuthor?.id || commentAuthor;
        return Boolean(user?.id && authorId && String(authorId) === String(user.id)) || isStaff;
    };

    const canDeleteComment = (commentAuthor: any) => {
        const authorId = commentAuthor?.id || commentAuthor;
        return Boolean(user?.id && authorId && String(authorId) === String(user.id)) || isPostAuthor || isStaff;
    };

    const [liking, setLiking] = useState(false);

    const [showOptions, setShowOptions] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Array<{
        id: string;
        content: string;
        author: { id?: string; firstName: string; lastName: string; profilePicture?: string | null };
        createdAt: string;
        updatedAt?: string;
        replies?: Array<{ id: string; content: string; author: { id?: string; firstName: string; lastName: string }; createdAt: string; updatedAt?: string }> | undefined;
    }>>([]);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    // Post edit state
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostTitle, setEditPostTitle] = useState(post.title ?? "");
    const [editPostContent, setEditPostContent] = useState(post.content ?? "");
    const [editJobCompany, setEditJobCompany] = useState(post.jobCompany || "");
    const [editJobLocation, setEditJobLocation] = useState(post.jobLocation || "");
    const [editJobLink, setEditJobLink] = useState(post.jobLink || "");
    const [editEventType, setEditEventType] = useState(post.eventType || "WEBINAR");
    const [editEventDate, setEditEventDate] = useState(formatForDateTimeLocal(post.eventDate));
    const [editEventUrl, setEditEventUrl] = useState(post.eventUrl || "");
    const [editIsPremium, setEditIsPremium] = useState(post.isPremium || false);
    const [editMediaUrls, setEditMediaUrls] = useState<string[]>(post.mediaUrls || []);
    const [savingPost, setSavingPost] = useState(false);

    // Comment edit state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    const [savingComment, setSavingComment] = useState(false);
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);

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

    const loadComments = async () => {
        setCommentsLoading(true);
        try {
            const { data } = await api.get<{ data: typeof comments }>(`/feed/${post.id}/comments`, { params: { limit: 20 } });
            setComments(data.data ?? []);
        } catch {
            setComments([]);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleLikeClick = async () => {
        if (liking) return;
        setLiking(true);
        try {
            await api.post(`/feed/${post.id}/like`);
            onLikeToggle();
        } finally {
            setLiking(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isProfileComplete) return;
        
        const trimmed = newComment.trim();
        if (!trimmed || submittingComment) return;

        setSubmittingComment(true);
        try {
            await api.post(`/feed/${post.id}/comments`, {
                content: trimmed,
                parentId: replyingTo ? replyingTo.id : undefined,
            });
            setNewComment("");
            setReplyingTo(null);
            onCommentAdded();
            loadComments();
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            await api.delete(`/feed/${post.id}`);
            toast.success("Post deleted");
            if (onDelete) onDelete();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete post.");
        }
        setShowOptions(false);
    };

    const handleStartEditPost = () => {
        setEditPostTitle(post.title || "");
        setEditPostContent(post.content || "");
        setEditJobCompany(post.jobCompany || "");
        setEditJobLocation(post.jobLocation || "");
        setEditJobLink(post.jobLink || "");
        setEditEventType(post.eventType || "WEBINAR");
        setEditEventDate(formatForDateTimeLocal(post.eventDate));
        setEditEventUrl(post.eventUrl || "");
        setEditIsPremium(post.isPremium || false);
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
            setEditMediaUrls(prev => [...prev, ...uploadedUrls]);
            toast.success("Image uploaded!", { id: "edit-upload" });
        } catch (err) {
            toast.error("Upload failed.", { id: "edit-upload" });
        }
    };

    const removeEditMediaUrl = (index: number) => {
        setEditMediaUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSavePostEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPostContent.trim()) return;
        setSavingPost(true);
        try {
            const res = await api.patch(`/feed/${post.id}`, {
                title: editPostTitle.trim() || undefined,
                content: editPostContent.trim(),
                mediaUrls: editMediaUrls,
                isPremium: editIsPremium,
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
                post.title = updated.title;
                post.content = updated.content;
                post.mediaUrls = updated.mediaUrls;
                post.isPremium = updated.isPremium;
                post.jobCompany = updated.jobCompany;
                post.jobLocation = updated.jobLocation;
                post.jobLink = updated.jobLink;
                post.eventType = updated.eventType;
                post.eventDate = updated.eventDate;
                post.eventUrl = updated.eventUrl;
            }
            toast.success("Post updated successfully");
            setIsEditingPost(false);
            if (onPostUpdated) onPostUpdated();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update post.");
        } finally {
            setSavingPost(false);
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
            await api.patch(`/feed/comment/${commentId}`, {
                content: editCommentContent.trim(),
            });
            setComments(prev => prev.map(c => {
                if (c.id === commentId) {
                    return { ...c, content: editCommentContent.trim(), updatedAt: new Date().toISOString() };
                }
                if (c.replies) {
                    return {
                        ...c,
                        replies: c.replies.map(r => r.id === commentId ? { ...r, content: editCommentContent.trim(), updatedAt: new Date().toISOString() } : r)
                    };
                }
                return c;
            }));
            toast.success("Comment updated");
            setEditingCommentId(null);
            setEditCommentContent("");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update comment.");
        } finally {
            setSavingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            await api.delete(`/feed/comment/${commentId}`);
            setComments(prev => prev
                .filter(c => c.id !== commentId)
                .map(c => {
                    if (!c.replies) return c;
                    return {
                        ...c,
                        replies: c.replies.filter(r => r.id !== commentId)
                    };
                })
            );
            toast.success("Comment deleted");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete comment.");
        }
    };

    const handleToggleComments = () => {
        const next = !showComments;
        setShowComments(next);
        if (next) loadComments();
    };

    const authorName = `${post.author.firstName} ${post.author.lastName}`;
    const authorInitials = `${post.author.firstName?.charAt(0) || ''}${post.author.lastName?.charAt(0) || ''}`;
    const isLocked = post.isPremiumLocked;

    return (
        <article className="p-4 sm:p-6 hover:bg-background/30 transition-colors">
            <div className="flex gap-3 sm:gap-4">
                <div className="shrink-0">
                    {post.author.profilePicture ? (
                        <img
                            src={post.author.profilePicture}
                            alt=""
                            className="rounded-full size-9 sm:size-10 object-cover border border-border"
                        />
                    ) : (
                        <div className="size-9 sm:size-10 rounded-full bg-tatt-lime/20 flex items-center justify-center text-tatt-lime font-bold text-xs sm:text-sm">
                            {authorInitials}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-foreground text-sm sm:text-base truncate">{authorName}</span>
                        {post.author.professionTitle && (
                            <span className="text-tatt-gray text-xs sm:text-sm truncate">• {post.author.professionTitle}</span>
                        )}
                        {post.chapter && (
                            <Link
                                href="/dashboard/feed"
                                className="text-tatt-lime font-bold text-xs sm:text-sm hover:underline truncate"
                            >
                                {post.chapter.name}
                            </Link>
                        )}
                        <span className="text-tatt-gray text-xs ml-auto shrink-0">{formatDate(post.createdAt)}</span>
                        
                        {canManagePost && (
                            <Dropdown>
                                <DropdownTrigger className="p-1.5 hover:bg-surface border border-transparent hover:border-border rounded-lg transition-colors cursor-pointer text-tatt-gray hover:text-foreground outline-none" aria-label="Post options">
                                    <MoreVertical className="h-4 w-4" />
                                </DropdownTrigger>
                                <DropdownPopover placement="bottom end" className="bg-white border border-border rounded-2xl shadow-xl p-1 z-50">
                                    <DropdownMenu aria-label="Post Actions">
                                        <DropdownItem
                                            key="edit"
                                            onPress={handleStartEditPost}
                                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-black/5 rounded-xl cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Pencil className="h-3.5 w-3.5 text-tatt-lime" />
                                                <span>Edit Post</span>
                                            </div>
                                        </DropdownItem>
                                        <DropdownItem
                                            key="delete"
                                            onPress={handleDelete}
                                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 text-red-500">
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Delete Post</span>
                                            </div>
                                        </DropdownItem>
                                    </DropdownMenu>
                                </DropdownPopover>
                            </Dropdown>
                        )}
                    </div>
                    {post.isPremium && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-tatt-lime">
                            <Lock className="h-3 w-3" /> Premium
                        </span>
                    )}
                    {post.title && (
                        <h4 className="mt-2 text-sm sm:text-base font-bold text-foreground break-words">{post.title}</h4>
                    )}
                    {isLocked ? (
                        <div className="mt-3 p-3 sm:p-4 rounded-lg bg-tatt-lime/10 border border-tatt-lime/30 flex items-center gap-2 sm:gap-3">
                            <Lock className="h-4 w-4 sm:h-5 w-5 text-tatt-lime shrink-0" />
                            <p className="text-xs sm:text-sm text-tatt-gray font-medium">
                                This is premium content. Upgrade your membership to view and engage.
                            </p>
                        </div>
                    ) : (
                        <>
                            {post.content && (
                                <div
                                    className="mt-2 text-foreground text-xs sm:text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 break-words"
                                    dangerouslySetInnerHTML={
                                        post.contentFormat === "HTML"
                                            ? { __html: post.content }
                                            : undefined
                                    }
                                >
                                    {post.contentFormat !== "HTML" ? <p>{post.content}</p> : null}
                                </div>
                            )}
                            {post.mediaUrls?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {post.mediaUrls.slice(0, 4).map((url, i) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block size-16 sm:size-20 rounded-lg overflow-hidden border border-border bg-background shrink-0"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt=""
                                                className="object-cover w-full h-full"
                                            />
                                        </a>
                                    ))}
                                </div>
                            )}
                            {post.tags?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                    {post.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2.5 sm:px-3 py-1 bg-tatt-lime/10 text-foreground font-semibold text-xs rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions — touch-friendly */}
                    {!isLocked && (
                        <div className="mt-4 flex items-center gap-4 sm:gap-6">
                            <button
                                type="button"
                                onClick={handleLikeClick}
                                disabled={liking}
                                className={`min-h-[44px] sm:min-h-0 flex items-center gap-1.5 text-sm font-bold transition-colors touch-manipulation py-1 ${
                                    post.isLikedByMe ? "text-tatt-lime" : "text-tatt-gray hover:text-tatt-lime"
                                }`}
                            >
                                {liking ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Heart
                                        className={`h-4 w-4 ${post.isLikedByMe ? "fill-current" : ""}`}
                                    />
                                )}
                                {post.likesCount}
                            </button>
                            <button
                                type="button"
                                onClick={handleToggleComments}
                                className="min-h-[44px] sm:min-h-0 flex items-center gap-1.5 text-sm font-bold text-tatt-gray hover:text-tatt-lime transition-colors touch-manipulation py-1"
                            >
                                <MessageCircle className="h-4 w-4" />
                                {post.commentsCount}
                            </button>
                        </div>
                    )}

                    {/* Comments section */}
                    {showComments && !isLocked && (
                        <div className="mt-4 sm:mt-6 pt-4 border-t border-border space-y-4">
                            {/* Header with Close Option */}
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                                <span className="text-xs font-black uppercase tracking-widest text-tatt-gray">
                                    {post.commentsCount} {post.commentsCount === 1 ? "Comment" : "Comments"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowComments(false);
                                        setReplyingTo(null);
                                    }}
                                    className="text-xs font-bold text-tatt-gray hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    <ChevronUp className="h-4 w-4" /> Close Comments
                                </button>
                            </div>

                            {/* Top Comment Input */}
                            {!replyingTo && (
                                <form onSubmit={handleSubmitComment} className="flex gap-3 items-center">
                                    <div className="flex-1 relative">
                                        <input
                                            ref={commentInputRef}
                                            type="text"
                                            placeholder={!isProfileComplete ? "Setup profile to comment..." : "Write a comment..."}
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            disabled={!isProfileComplete || submittingComment}
                                            className={`w-full bg-black/5 border border-border rounded-xl pl-4 pr-16 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-tatt-lime text-foreground ${!isProfileComplete ? "cursor-not-allowed opacity-60" : ""}`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!isProfileComplete || !newComment.trim() || submittingComment}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-tatt-lime text-tatt-black font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 hover:brightness-95 transition-all"
                                        >
                                            Post
                                        </button>
                                    </div>
                                </form>
                            )}

                            {commentsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-tatt-lime" />
                                </div>
                            ) : (
                                <ul className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {comments.map((c) => (
                                        <li key={c.id} className="space-y-2">
                                            <div className="flex gap-2 sm:gap-3">
                                                <div className="shrink-0 size-7 sm:size-8 rounded-full bg-tatt-lime/20 flex items-center justify-center text-tatt-lime text-xs font-bold">
                                                    {c.author.firstName?.charAt(0) || "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <p className="text-xs sm:text-sm font-bold text-foreground">
                                                            {c.author.firstName} {c.author.lastName}
                                                        </p>
                                                        {(canEditComment(c.author) || canDeleteComment(c.author)) && (
                                                            <Dropdown>
                                                                <DropdownTrigger className="p-1 rounded-lg text-tatt-gray hover:text-foreground hover:bg-black/5 transition-all cursor-pointer outline-none">
                                                                    <MoreHorizontal className="size-4" />
                                                                </DropdownTrigger>
                                                                <DropdownPopover placement="bottom end" className="bg-white border border-border rounded-xl shadow-lg p-1 z-50">
                                                                    <DropdownMenu aria-label="Comment Options">
                                                                        {canEditComment(c.author) ? (
                                                                            <DropdownItem
                                                                                key="edit"
                                                                                onPress={() => handleStartEditComment(c.id, c.content)}
                                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:bg-black/5 rounded-lg cursor-pointer"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <Pencil className="size-3.5 text-tatt-lime" />
                                                                                    <span>Edit</span>
                                                                                </div>
                                                                            </DropdownItem>
                                                                        ) : null}
                                                                        {canDeleteComment(c.author) ? (
                                                                            <DropdownItem
                                                                                key="delete"
                                                                                onPress={() => handleDeleteComment(c.id)}
                                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                                                            >
                                                                                <div className="flex items-center gap-2 text-red-500">
                                                                                    <Trash2 className="size-3.5" />
                                                                                    <span>Delete</span>
                                                                                </div>
                                                                            </DropdownItem>
                                                                        ) : null}
                                                                    </DropdownMenu>
                                                                </DropdownPopover>
                                                            </Dropdown>
                                                        )}
                                                    </div>

                                                    {editingCommentId === c.id ? (
                                                        <div className="mt-2 flex gap-2 items-center">
                                                            <input
                                                                type="text"
                                                                value={editCommentContent}
                                                                onChange={(e) => setEditCommentContent(e.target.value)}
                                                                className="flex-1 bg-black/5 border border-tatt-lime/40 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-tatt-lime outline-none text-foreground"
                                                                autoFocus
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEditComment(c.id)}
                                                                disabled={savingComment || !editCommentContent.trim()}
                                                                className="bg-tatt-lime text-tatt-black font-bold text-xs px-3 py-1.5 rounded-lg hover:brightness-95 disabled:opacity-50"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingCommentId(null)}
                                                                className="text-tatt-gray hover:text-foreground text-xs font-bold px-1"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs sm:text-sm text-foreground/90 break-words">{c.content}</p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] sm:text-xs text-tatt-gray">
                                                                    {formatDate(c.createdAt)} {c.updatedAt && c.updatedAt !== c.createdAt && <span className="italic text-tatt-gray/80">(edited)</span>}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (replyingTo?.id === c.id) {
                                                                            setReplyingTo(null);
                                                                            setNewComment("");
                                                                        } else {
                                                                            handleStartReply(c.id, `${c.author.firstName} ${c.author.lastName}`);
                                                                        }
                                                                    }}
                                                                    className="text-[11px] font-bold text-tatt-lime hover:underline"
                                                                >
                                                                    {replyingTo?.id === c.id ? "Cancel Reply" : "Reply"}
                                                                </button>

                                                                {c.replies && c.replies.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleRepliesVisibility(c.id)}
                                                                        className="text-[10px] font-bold text-tatt-gray hover:text-foreground flex items-center gap-1 uppercase tracking-wider"
                                                                    >
                                                                        {collapsedReplies[c.id] ? (
                                                                            <>
                                                                                <ChevronDown className="h-3 w-3" />
                                                                                Show {c.replies.length} {c.replies.length === 1 ? "Reply" : "Replies"}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronUp className="h-3 w-3" />
                                                                                Hide {c.replies.length} {c.replies.length === 1 ? "Reply" : "Replies"}
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Inline Reply Input directly under comment */}
                                            {replyingTo?.id === c.id && (
                                                <div className="mt-2 ml-8 sm:ml-10 border-l-2 border-tatt-lime pl-3">
                                                    <form onSubmit={handleSubmitComment} className="flex gap-2 items-center">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                ref={commentInputRef}
                                                                type="text"
                                                                placeholder={`Reply to @${replyingTo.authorName}...`}
                                                                value={newComment}
                                                                onChange={(e) => setNewComment(e.target.value)}
                                                                disabled={submittingComment}
                                                                className="w-full bg-black/5 border border-tatt-lime/40 rounded-xl pl-4 pr-16 py-2.5 text-xs focus:ring-1 focus:ring-tatt-lime outline-none text-foreground"
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={!newComment.trim() || submittingComment}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-tatt-lime text-tatt-black font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 hover:brightness-95 transition-all"
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
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </form>
                                                </div>
                                            )}

                                            {/* Render Nested Replies when NOT collapsed */}
                                            {c.replies && c.replies.length > 0 && !collapsedReplies[c.id] && (
                                                <ul className="pl-8 sm:pl-10 space-y-2 border-l-2 border-border ml-3 mt-2">
                                                    {c.replies.map((reply) => (
                                                        <li key={reply.id} className="flex gap-2">
                                                            <div className="shrink-0 size-6 rounded-full bg-tatt-lime/20 flex items-center justify-center text-tatt-lime text-[10px] font-bold">
                                                                {reply.author?.firstName?.charAt(0) || "?"}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-0.5">
                                                                    <p className="text-xs font-bold text-foreground">
                                                                        {reply.author?.firstName} {reply.author?.lastName}
                                                                    </p>
                                                                    {(canEditComment(reply.author) || canDeleteComment(reply.author)) && (
                                                                        <Dropdown>
                                                                            <DropdownTrigger className="p-0.5 rounded-lg text-tatt-gray hover:text-foreground hover:bg-black/5 transition-all cursor-pointer outline-none">
                                                                                <MoreHorizontal className="size-3.5" />
                                                                            </DropdownTrigger>
                                                                            <DropdownPopover placement="bottom end" className="bg-white border border-border rounded-xl shadow-lg p-1 z-50">
                                                                                <DropdownMenu aria-label="Reply Options">
                                                                                    {canEditComment(reply.author) ? (
                                                                                        <DropdownItem
                                                                                            key="edit"
                                                                                            onPress={() => handleStartEditComment(reply.id, reply.content)}
                                                                                            className="flex items-center gap-2 px-3 py-1 text-xs font-semibold hover:bg-black/5 rounded-lg cursor-pointer"
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Pencil className="size-3 text-tatt-lime" />
                                                                                                <span>Edit</span>
                                                                                            </div>
                                                                                        </DropdownItem>
                                                                                    ) : null}
                                                                                    {canDeleteComment(reply.author) ? (
                                                                                        <DropdownItem
                                                                                            key="delete"
                                                                                            onPress={() => handleDeleteComment(reply.id)}
                                                                                            className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                                                                        >
                                                                                            <div className="flex items-center gap-2 text-red-500">
                                                                                                <Trash2 className="size-3" />
                                                                                                <span>Delete</span>
                                                                                            </div>
                                                                                        </DropdownItem>
                                                                                    ) : null}
                                                                                </DropdownMenu>
                                                                            </DropdownPopover>
                                                                        </Dropdown>
                                                                    )}
                                                                </div>

                                                                {editingCommentId === reply.id ? (
                                                                    <div className="mt-2 flex gap-2 items-center">
                                                                        <input
                                                                            type="text"
                                                                            value={editCommentContent}
                                                                            onChange={(e) => setEditCommentContent(e.target.value)}
                                                                            className="flex-1 bg-black/5 border border-tatt-lime/40 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-tatt-lime outline-none text-foreground"
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveEditComment(reply.id)}
                                                                            disabled={savingComment || !editCommentContent.trim()}
                                                                            className="bg-tatt-lime text-tatt-black font-bold text-xs px-3 py-1.5 rounded-lg hover:brightness-95 disabled:opacity-50"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingCommentId(null)}
                                                                            className="text-tatt-gray hover:text-foreground text-xs font-bold px-1"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <p className="text-xs text-foreground/90 break-words">{reply.content}</p>
                                                                        <div className="flex items-center gap-3 mt-1">
                                                                            <span className="text-[10px] text-tatt-gray">
                                                                                {formatDate(reply.createdAt)} {reply.updatedAt && reply.updatedAt !== reply.createdAt && <span className="italic text-tatt-gray/80">(edited)</span>}
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {!isProfileComplete && (
                                <p className="text-[10px] text-tatt-gray flex items-center gap-1.5 px-1 font-medium italic">
                                    <AlertCircle className="size-3 text-tatt-lime" />
                                    Identity verification required. Please complete your professional profile in <Link href="/dashboard/settings" className="text-tatt-lime hover:underline font-bold">Settings</Link> to join the discussion.
                                </p>
                            )}

                        </div>
                    )}
                </div>
            </div>

            {/* Edit Post Modal */}
            <AppModal
                isOpen={isEditingPost}
                onClose={() => setIsEditingPost(false)}
                title={`Edit ${post.type} Post`}
                subtitle={
                    <span>
                        Authoring as <span className="text-tatt-lime">{post.author.firstName} {post.author.lastName}</span>
                    </span>
                }
                maxWidth="max-w-4xl"
            >
                <form onSubmit={handleSavePostEdit} className="space-y-6">
                    <input
                        value={editPostTitle}
                        onChange={(e) => setEditPostTitle(e.target.value)}
                        placeholder={post.type === "JOB" ? "Job Position / Role (e.g. Senior Software Engineer)" : "Post Title (Optional)"}
                        className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 placeholder:text-tatt-gray outline-none text-foreground"
                    />

                    {/* JOB Fields */}
                    {post.type === "JOB" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Company Name</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                    <input
                                        value={editJobCompany}
                                        onChange={(e) => setEditJobCompany(e.target.value)}
                                        placeholder="e.g. Google Africa"
                                        className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                    <input
                                        value={editJobLocation}
                                        onChange={(e) => setEditJobLocation(e.target.value)}
                                        placeholder="e.g. Nairobi, Kenya"
                                        className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Job Description Link</label>
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                    <input
                                        value={editJobLink}
                                        onChange={(e) => setEditJobLink(e.target.value)}
                                        placeholder="https://careers.company.com/job/..."
                                        className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EVENT Fields */}
                    {post.type === "EVENT" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Event Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {["WEBINAR","WORKSHOP","CONFERENCE","IN_PERSON","HYBRID"].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setEditEventType(t)}
                                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                                editEventType === t
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
                                        value={editEventDate}
                                        onChange={e => setEditEventDate(e.target.value)}
                                        className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Event Link</label>
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                                    <input
                                        type="url"
                                        value={editEventUrl}
                                        onChange={e => setEditEventUrl(e.target.value)}
                                        placeholder="https://zoom.us/j/..."
                                        className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <textarea
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                        placeholder="Write post content..."
                        rows={5}
                        className="w-full bg-black/5 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none resize-none text-foreground"
                        required
                    />

                    {/* Image Attachments */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1 flex items-center gap-1.5">
                                <ImageIcon className="size-3" /> Media Attachments
                            </label>
                            <label className="text-xs font-bold text-tatt-lime hover:underline cursor-pointer flex items-center gap-1">
                                <Paperclip className="size-3.5" /> Add Images
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleEditFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        {editMediaUrls.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {editMediaUrls.map((url, i) => (
                                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border group bg-black/5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeEditMediaUrl(i)}
                                            className="absolute top-2 right-2 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
                        {(user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPERADMIN' || user?.systemRole === 'MODERATOR') && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-tatt-lime">
                                <input
                                    type="checkbox"
                                    checked={editIsPremium}
                                    onChange={(e) => setEditIsPremium(e.target.checked)}
                                    className="rounded border-border text-tatt-lime focus:ring-tatt-lime size-4"
                                />
                                Premium Lock
                            </label>
                        )}
                        <div className="flex justify-end gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsEditingPost(false)}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-tatt-gray border border-border hover:bg-black/5 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingPost || !editPostContent.trim()}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-tatt-lime text-tatt-black hover:brightness-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-tatt-lime/20"
                            >
                                {savingPost && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </AppModal>
        </article>
    );
}
