"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { formatTimeAgo } from "@/utils/date";
import { 
    Lock, Share2, ThumbsUp, MessageSquare, ArrowLeft, 
    UserPlus, LogIn, Send, ArrowBigUp, Check, Copy, Heart
} from "lucide-react";
import { Navbar, Footer } from "@/components/organisms";
import toast from "react-hot-toast";

interface CommentAuthor {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
}

interface CommentReply {
    id: string;
    content: string;
    createdAt: string;
    author: CommentAuthor;
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: CommentAuthor;
    replies?: CommentReply[];
}

interface Post {
    id: string;
    title: string | null;
    content: string | null;
    contentFormat: string;
    isPremium: boolean;
    isPremiumLocked: boolean;
    createdAt: string;
    author: {
        id: string;
        firstName: string;
        lastName: string;
        profilePicture: string | null;
        communityTier: string;
    };
    chapter: { name: string } | null;
    mediaUrls?: string[];
    likesCount: number;
    commentsCount: number;
    upvotesCount?: number;
    isLikedByMe?: boolean;
    isUpvotedByMe?: boolean;
}

export default function SharePostPage() {
    const { postId } = useParams();
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    
    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Engagement state
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [upvotesCount, setUpvotesCount] = useState(0);
    const [isUpvoted, setIsUpvoted] = useState(false);
    
    // Comments state
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsCount, setCommentsCount] = useState(0);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);

    // Share state
    const [copied, setCopied] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);

    const fetchPost = async () => {
        try {
            const res = await api.get(`/feed/${postId}`);
            const data = res.data;
            setPost(data);
            setLikesCount(data.likesCount || 0);
            setIsLiked(!!data.isLikedByMe);
            setUpvotesCount(data.upvotesCount || 0);
            setIsUpvoted(!!data.isUpvotedByMe);
            setCommentsCount(data.commentsCount || 0);
        } catch (error) {
            console.error("Error fetching post:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchComments = async () => {
        if (!postId) return;
        setIsLoadingComments(true);
        try {
            const res = await api.get(`/feed/${postId}/comments`);
            setComments(res.data.data || []);
            setCommentsCount(res.data.meta?.total || (res.data.data || []).length);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    useEffect(() => {
        if (postId) {
            fetchPost();
            fetchComments();
        } else {
            setIsLoading(false);
        }
    }, [postId]);

    const handleLike = async () => {
        if (!isAuthenticated) {
            toast.error("Please sign in to like this strategic insight");
            return;
        }
        if (post?.author.id === user?.id) {
            toast.error("You cannot like your own insight");
            return;
        }
        try {
            const res = await api.post(`/feed/${post?.id}/like`);
            setIsLiked(res.data.isLiked);
            setLikesCount(prev => res.data.isLiked ? prev + 1 : Math.max(0, prev - 1));
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to toggle like");
        }
    };

    const handleUpvote = async () => {
        if (!isAuthenticated) {
            toast.error("Please sign in to upvote this post");
            return;
        }
        if (post?.author.id === user?.id) {
            toast.error("You cannot upvote your own insight");
            return;
        }
        try {
            const res = await api.post(`/feed/${post?.id}/upvote`);
            setIsUpvoted(res.data.upvoted);
            setUpvotesCount(prev => res.data.upvoted ? prev + 1 : Math.max(0, prev - 1));
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to upvote");
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error("Please sign in to join the conversation");
            return;
        }
        if (!newComment.trim()) return;

        setIsSubmittingComment(true);
        try {
            await api.post(`/feed/${post?.id}/comments`, {
                content: newComment.trim(),
                parentId: replyingTo ? replyingTo.id : undefined,
            });
            setNewComment("");
            setReplyingTo(null);
            fetchComments();
            toast.success("Comment posted!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add comment");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleStartReply = (commentId: string, authorName: string) => {
        if (!isAuthenticated) {
            toast.error("Please sign in to reply");
            return;
        }
        setReplyingTo({ id: commentId, authorName });
        setTimeout(() => {
            commentInputRef.current?.focus();
        }, 50);
    };

    const handleCopyLink = () => {
        const shareUrl = window.location.href;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        const shareUrl = window.location.href;
        const shareTitle = post?.title || `Insight by ${post?.author.firstName} ${post?.author.lastName}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    url: shareUrl,
                });
            } catch {
                handleCopyLink();
            }
        } else {
            handleCopyLink();
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tatt-lime"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-black mb-4">Post not found</h1>
                <Link href="/" className="text-tatt-lime hover:underline flex items-center gap-2 font-bold">
                    <ArrowLeft className="h-4 w-4" /> Return to Home
                </Link>
            </div>
        );
    }

    const cleanContent = post.content ? post.content.replace(/<[^>]*>?/gm, "").substring(0, 160) : "";
    const authorName = post.author ? `${post.author.firstName} ${post.author.lastName}` : "TATT Member";

    // JSON-LD Structured Data
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        "headline": post.title || `Strategic Insight by ${authorName}`,
        "articleBody": cleanContent,
        "datePublished": post.createdAt,
        "author": {
            "@type": "Person",
            "name": authorName,
        },
        "publisher": {
            "@type": "Organization",
            "name": "The African Think Tank",
            "url": "https://theafricanthinktank.org",
        },
    };

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-tatt-lime selection:text-black">
            {/* Structured Data script injection for search engine indexing */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <Navbar />

            <main className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
                <Link 
                    href={isAuthenticated ? "/dashboard/feed" : "/"} 
                    className="inline-flex items-center gap-2 text-tatt-gray hover:text-tatt-lime font-bold text-xs uppercase tracking-widest mb-8 transition-colors group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    {isAuthenticated ? "Back to Feed" : "Discover More Insights"}
                </Link>

                <article className="bg-surface rounded-[2.5rem] border border-border shadow-2xl overflow-hidden">
                    {post.isPremium && (
                        <div className="bg-gradient-to-r from-tatt-lime via-tatt-lime/50 to-transparent h-1.5" />
                    )}

                    <div className="p-6 sm:p-8 lg:p-12">
                        {/* Author Header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="relative size-12 rounded-full bg-surface border-2 border-tatt-lime shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                                {post.author?.profilePicture ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={post.author.profilePicture} alt={authorName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-base font-black text-tatt-lime">
                                        {(post.author?.firstName || "U").charAt(0)}{(post.author?.lastName || "U").charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl font-black text-foreground">{authorName}</h3>
                                    <span className="bg-tatt-lime/10 text-tatt-lime text-[10px] font-black px-2.5 py-0.5 rounded border border-tatt-lime/20 uppercase tracking-widest">
                                        {post.author?.communityTier}
                                    </span>
                                </div>
                                <p className="text-xs text-tatt-gray font-bold uppercase tracking-[0.2em] mt-1">
                                    {post.chapter?.name || 'Global'} Chapter • {formatTimeAgo(post.createdAt)}
                                </p>
                            </div>
                        </div>

                        {/* Post Body */}
                        <div className="space-y-6">
                            {post.title && (
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter leading-[1.1] text-foreground">{post.title}</h1>
                            )}

                            {post.isPremiumLocked ? (
                                <div className="space-y-8">
                                    <div className="text-foreground/90 text-lg leading-relaxed italic opacity-50 select-none">
                                        {post.content ? post.content : "The strategic wisdom contained in this insight is reserved for the TATT community elite..."}
                                    </div>

                                    <div className="bg-black/5 rounded-[2rem] p-8 sm:p-10 border border-dashed border-border flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
                                        <div className="size-16 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center text-tatt-lime relative z-10 shadow-inner">
                                            <Lock className="size-8" />
                                        </div>
                                        <div className="max-w-md relative z-10">
                                            <h4 className="text-xl font-black mb-2 uppercase tracking-tighter italic">Strategic Intelligence Locked</h4>
                                            <p className="text-tatt-gray text-sm font-medium leading-relaxed">
                                                This high-value resource is exclusive to TATT members. Join the movement to unlock full access and participate in the dialogue.
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center relative z-10">
                                            <Link href="/signup" className="bg-tatt-lime text-black font-black px-8 py-3.5 rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-tatt-lime/20 flex items-center justify-center gap-2">
                                                <UserPlus className="h-4 w-4" /> Join TATT Community
                                            </Link>
                                            <Link href="/login" className="bg-white/10 backdrop-blur-md border border-white/20 text-foreground font-black px-8 py-3.5 rounded-2xl text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                                                <LogIn className="h-4 w-4" /> Sign In
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="text-foreground/90 text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words font-medium"
                                    dangerouslySetInnerHTML={{ __html: post.content || "" }}
                                />
                            )}

                            {/* Media Display */}
                            {post.mediaUrls && post.mediaUrls.length > 0 && !post.isPremiumLocked && (
                                <div className={`grid gap-3 mt-6 overflow-hidden rounded-2xl border border-border ${post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {post.mediaUrls.map((url, i) => (
                                        <div key={i} className="aspect-video overflow-hidden bg-black/5">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt="Insight media" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interactive Engagement Bar */}
                        <div className="flex items-center justify-between pt-8 mt-10 border-t border-border flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleLike}
                                    disabled={post.author.id === user?.id}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                        isLiked 
                                            ? 'bg-tatt-lime text-black shadow-md shadow-tatt-lime/20 cursor-pointer' 
                                            : 'bg-black/5 text-tatt-gray hover:text-tatt-lime hover:bg-tatt-lime/10 cursor-pointer'
                                    } ${post.author.id === user?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-black' : ''}`} />
                                    <span>{likesCount > 0 ? `${likesCount} Likes` : 'Like'}</span>
                                </button>

                                <button
                                    onClick={handleUpvote}
                                    disabled={post.author.id === user?.id}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                        isUpvoted 
                                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 cursor-pointer' 
                                            : 'bg-black/5 text-tatt-gray hover:text-orange-500 hover:bg-orange-500/10 cursor-pointer'
                                    } ${post.author.id === user?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <ArrowBigUp className={`h-4 w-4 ${isUpvoted ? 'fill-orange-500' : ''}`} />
                                    <span>{upvotesCount > 0 ? `${upvotesCount} Upvotes` : 'Upvote'}</span>
                                </button>
                            </div>

                            {/* Share Buttons */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleCopyLink} 
                                    className="p-2.5 text-tatt-gray hover:text-foreground bg-black/5 rounded-xl transition-all cursor-pointer"
                                    title="Copy link"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </button>

                                <button 
                                    onClick={handleNativeShare} 
                                    className="flex items-center gap-2 px-4 py-2.5 bg-tatt-lime text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all shadow-md shadow-tatt-lime/20 cursor-pointer"
                                >
                                    <Share2 className="h-4 w-4" />
                                    <span>Share</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </article>

                {/* ── COMMENTS & DISCUSSION SECTION ───────────────────────────── */}
                <section className="mt-10 bg-surface rounded-[2.5rem] border border-border p-6 sm:p-8 shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-tatt-lime" />
                            Community Discussion ({commentsCount})
                        </h3>
                    </div>

                    {/* New Comment / Reply Input Form */}
                    {isAuthenticated ? (
                        <form onSubmit={handleAddComment} className="space-y-3">
                            {replyingTo && (
                                <div className="flex items-center justify-between text-xs bg-tatt-lime/10 border border-tatt-lime/20 text-tatt-lime px-3 py-1.5 rounded-lg">
                                    <span>Replying to <strong>{replyingTo.authorName}</strong></span>
                                    <button 
                                        type="button" 
                                        onClick={() => setReplyingTo(null)}
                                        className="font-bold hover:underline text-[10px] uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={replyingTo ? `Write a reply to ${replyingTo.authorName}...` : "Add your strategic perspective..."}
                                    className="flex-1 bg-black/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-tatt-lime placeholder:text-tatt-gray"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingComment || !newComment.trim()}
                                    className="px-5 py-3 bg-tatt-lime text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                                >
                                    <Send className="h-4 w-4" />
                                    <span className="hidden sm:inline">Post</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="p-4 rounded-xl bg-black/5 border border-border text-center space-y-2">
                            <p className="text-sm font-bold text-tatt-gray">Sign in to join the discussion and share your thoughts.</p>
                            <div className="flex justify-center gap-3 pt-1">
                                <Link href="/login" className="px-4 py-2 bg-tatt-lime text-black font-bold text-xs rounded-lg uppercase tracking-wider hover:opacity-90">
                                    Sign In
                                </Link>
                                <Link href="/signup" className="px-4 py-2 bg-surface border border-border text-foreground font-bold text-xs rounded-lg uppercase tracking-wider hover:bg-black/5">
                                    Join TATT
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Comments List */}
                    {isLoadingComments ? (
                        <div className="py-8 text-center text-tatt-gray font-bold text-sm">
                            Loading discussion...
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="py-8 text-center text-tatt-gray font-medium text-sm">
                            No comments yet. Be the first to share your perspective!
                        </div>
                    ) : (
                        <div className="space-y-6 pt-2">
                            {comments.map((comment) => (
                                <div key={comment.id} className="space-y-3">
                                    <div className="flex gap-3 bg-black/5 p-4 rounded-2xl border border-border">
                                        <div className="size-9 rounded-full bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-tatt-lime">
                                            {comment.author.profilePicture ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={comment.author.profilePicture} alt={comment.author.firstName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{comment.author.firstName.charAt(0)}{comment.author.lastName.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-foreground">{comment.author.firstName} {comment.author.lastName}</span>
                                                <span className="text-[10px] text-tatt-gray font-medium">{formatTimeAgo(comment.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{comment.content}</p>
                                            
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => handleStartReply(comment.id, `${comment.author.firstName} ${comment.author.lastName}`)}
                                                    className="text-[10px] font-black text-tatt-lime hover:underline uppercase tracking-widest cursor-pointer"
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nested Replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="ml-6 pl-4 border-l-2 border-tatt-lime/30 space-y-2">
                                            {comment.replies.map((reply) => (
                                                <div key={reply.id} className="flex gap-3 bg-black/5 p-3.5 rounded-xl border border-border">
                                                    <div className="size-7 rounded-full bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden font-bold text-[10px] text-tatt-lime">
                                                        {reply.author.profilePicture ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={reply.author.profilePicture} alt={reply.author.firstName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{reply.author.firstName.charAt(0)}{reply.author.lastName.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-xs text-foreground">{reply.author.firstName} {reply.author.lastName}</span>
                                                            <span className="text-[10px] text-tatt-gray font-medium">{formatTimeAgo(reply.createdAt)}</span>
                                                        </div>
                                                        <p className="text-xs text-foreground/90 mt-1 leading-relaxed">{reply.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Public Guest Call to Action */}
                {!isAuthenticated && (
                    <div className="mt-12 text-center space-y-6 bg-surface p-8 sm:p-10 rounded-[2.5rem] border border-border shadow-lg">
                        <h2 className="text-2xl font-black tracking-tighter uppercase italic text-foreground">Ready to Shape the Future of Africa?</h2>
                        <p className="text-tatt-gray max-w-xl mx-auto text-sm font-medium leading-relaxed">
                            Join thousands of African professionals, visionaries, and leaders in the world's premier strategic networking platform.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
                            {[
                                { title: "Elite Network", desc: "Connect with vetted pan-African leaders." },
                                { title: "Strategic Insights", desc: "Access premium resources and guides." },
                                { title: "Global Chapters", desc: "Participate in exclusive local events." }
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-black/5 border border-border">
                                    <h4 className="font-black text-tatt-lime mb-1 text-xs uppercase tracking-widest">{item.title}</h4>
                                    <p className="text-xs text-tatt-gray leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2 flex justify-center gap-4">
                            <Link href="/signup" className="px-8 py-3.5 bg-tatt-lime text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-md shadow-tatt-lime/20">
                                Join TATT Network
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
