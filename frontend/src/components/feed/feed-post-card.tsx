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
    Trash2,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    X
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

import type { FeedPost } from "@/types/feed";

type FeedPostCardProps = {
    post: FeedPost;
    onLikeToggle: () => void;
    onCommentAdded: () => void;
    onDelete?: () => void;
};

import { formatTimeAgo } from "@/utils/date";

function formatDate(iso: string) {
    return formatTimeAgo(iso);
}

export function FeedPostCard({ post, onLikeToggle, onCommentAdded, onDelete }: FeedPostCardProps) {
    const { user } = useAuth();
    const isStaff = user?.systemRole !== "COMMUNITY_MEMBER";
    const isProfileComplete = isStaff || user?.flags?.includes("PROFILE_COMPLETED");

    const [liking, setLiking] = useState(false);

    const [showOptions, setShowOptions] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Array<{
        id: string;
        content: string;
        author: { firstName: string; lastName: string; profilePicture: string | null };
        createdAt: string;
        replies?: Array<{ id: string; content: string; author: { firstName: string; lastName: string }; createdAt: string }>;
    }>>([]);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

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

    const authorName = `${post.author.firstName} ${post.author.lastName}`;
    const authorInitials = `${post.author.firstName.charAt(0)}${post.author.lastName.charAt(0)}`;

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
            if (onDelete) onDelete();
        } catch {
            // handle error
        }
        setShowOptions(false);
    };
    const handleToggleComments = () => {
        const next = !showComments;
        setShowComments(next);
        if (next) loadComments();
    };

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
                        
                        <div className="relative ml-2">
                            <button
                                onClick={() => setShowOptions(!showOptions)}
                                className="p-1 hover:bg-background rounded-full transition-colors"
                            >
                                <MoreVertical className="h-4 w-4 text-tatt-gray" />
                            </button>
                            {showOptions && (
                                <div className="absolute right-0 mt-1 w-32 bg-background border border-border rounded-lg shadow-lg z-10 py-1">
                                    <button
                                        onClick={handleDelete}
                                        className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
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
                                                    <p className="text-xs sm:text-sm font-bold text-foreground">
                                                        {c.author.firstName} {c.author.lastName}
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-foreground/90 break-words">{c.content}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] sm:text-xs text-tatt-gray">
                                                            {formatDate(c.createdAt)}
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
                                                                <p className="text-xs font-bold text-foreground">
                                                                    {reply.author?.firstName} {reply.author?.lastName}
                                                                </p>
                                                                <p className="text-xs text-foreground/90 break-words">{reply.content}</p>
                                                                <span className="text-[10px] text-tatt-gray">
                                                                    {formatDate(reply.createdAt)}
                                                                </span>
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
        </article>
    );
}
