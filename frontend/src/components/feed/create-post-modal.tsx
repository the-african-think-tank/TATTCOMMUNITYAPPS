"use client";

import { useState, useRef, useEffect } from "react";
import {
    MessageSquare, Calendar, Briefcase, Zap, Plus, ChevronDown,
    Lock, Image as ImageIcon, Paperclip, MapPin, Link2, X,
    Film, FileText, Music, Info, Upload
} from "lucide-react";
import { AppModal } from "@/components/modals/app-modal";
import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import toast from "react-hot-toast";

export const FEED_FILE_LIMITS = {
    IMAGE: { maxBytes: 50 * 1024 * 1024, maxMb: 50, label: "Images" },
    VIDEO: { maxBytes: 500 * 1024 * 1024, maxMb: 500, label: "Videos" },
    AUDIO: { maxBytes: 100 * 1024 * 1024, maxMb: 100, label: "Audio" },
    DOCUMENT: { maxBytes: 100 * 1024 * 1024, maxMb: 100, label: "Documents" },
};

export function getFeedFileCategory(file: File): keyof typeof FEED_FILE_LIMITS {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type.startsWith("audio/")) return "AUDIO";
    return "DOCUMENT";
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const POST_TYPES = [
    { id: "GENERAL", name: "General Update", icon: MessageSquare, description: "Share a thought, insight, or status update." },
    { id: "EVENT", name: "Event or Workshop", icon: Calendar, description: "Promote a chapter event, webinar, or workshop." },
    { id: "RESOURCE", name: "Strategic Resource", icon: Briefcase, description: "Share reports, whitepapers, or strategic frameworks." },
    { id: "ANNOUNCEMENT", name: "Organization Announcement", icon: Zap, description: "Official TATT news and major updates." },
    { id: "JOB", name: "Job Announcement", icon: Briefcase, description: "Share available career opportunities with the network." },
];

export interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPostCreated?: (newPost?: any) => void;
    topics?: any[];
    initialPostType?: string;
}

export function CreatePostModal({
    isOpen,
    onClose,
    onPostCreated,
    topics = [],
    initialPostType
}: CreatePostModalProps) {
    const { user } = useAuth();
    const isStaff = user?.systemRole === "ADMIN" || user?.systemRole === "SUPERADMIN" || user?.systemRole === "MODERATOR";
    
    // Allowed post types filter: restrict restricted types for regular members
    const allowedPostTypes = POST_TYPES.filter(type => {
        if (type.id === "ANNOUNCEMENT" || type.id === "RESOURCE") {
            return isStaff;
        }
        return true;
    });

    const [step, setStep] = useState<"WIZARD" | "FORM">("WIZARD");
    const [selectedPostType, setSelectedPostType] = useState<string>("GENERAL");

    const [newPostTitle, setNewPostTitle] = useState("");
    const [newPostContent, setNewPostContent] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
    
    const [jobLink, setJobLink] = useState("");
    const [jobLocation, setJobLocation] = useState("");
    const [jobCompany, setJobCompany] = useState("");

    const [eventType, setEventType] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventUrl, setEventUrl] = useState("");

    const [postTopicId, setPostTopicId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialPostType) {
                setSelectedPostType(initialPostType);
                setStep("FORM");
            } else {
                setStep("WIZARD");
            }
        }
    }, [isOpen, initialPostType]);

    const resetForm = () => {
        setNewPostTitle("");
        setNewPostContent("");
        setAttachments([]);
        attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
        setAttachmentPreviews([]);
        setJobLink("");
        setJobLocation("");
        setJobCompany("");
        setEventType("");
        setEventDate("");
        setEventUrl("");
        setPostTopicId("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const processIncomingFiles = (incomingFiles: File[]) => {
        if (incomingFiles.length + attachments.length > 10) {
            toast.error("Maximum 10 attachments allowed per post");
            return;
        }

        const validFiles: File[] = [];
        const validPreviews: string[] = [];

        for (const file of incomingFiles) {
            const category = getFeedFileCategory(file);
            const limit = FEED_FILE_LIMITS[category];
            if (file.size > limit.maxBytes) {
                toast.error(`"${file.name}" is too large (${formatFileSize(file.size)}). Max limit for ${limit.label.toLowerCase()} is ${limit.maxMb}MB.`);
                continue;
            }
            validFiles.push(file);
            validPreviews.push(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
        }

        if (validFiles.length > 0) {
            setAttachments(prev => [...prev, ...validFiles]);
            setAttachmentPreviews(prev => [...prev, ...validPreviews]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const incomingFiles = Array.from(e.target.files || []);
        processIncomingFiles(incomingFiles);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files || []);
        if (droppedFiles.length > 0) {
            processIncomingFiles(droppedFiles);
        }
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

        setIsSubmitting(true);
        const loadingToast = toast.loading("Publishing post...");
        try {
            let uploadedMediaUrls: string[] = [];

            if (attachments.length > 0) {
                const formData = new FormData();
                attachments.forEach(file => formData.append("files", file));

                const uploadRes = await api.post("/uploads/media", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                    timeout: 300000, // 5 minutes to accommodate large media/video uploads
                });
                uploadedMediaUrls = uploadRes.data.files?.map((f: any) => f.url) || [];
            }

            const res = await api.post("/feed", {
                title: newPostTitle.trim() || undefined,
                content: newPostContent.trim(),
                type: selectedPostType,
                isPremium: false,
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

            toast.success("Post published successfully!", { id: loadingToast });
            resetForm();
            onClose();
            if (onPostCreated) {
                onPostCreated(res.data);
            }
        } catch (error: any) {
            const apiError =
                error.response?.data?.errors?.[0] ||
                (typeof error.response?.data?.message === "string" ? error.response.data.message : error.response?.data?.message?.[0]) ||
                (error.response?.status === 413 ? "File is too large (exceeds maximum upload limit)." : null) ||
                error.message ||
                "Failed to publish post";
            toast.error(apiError, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    if (step === "WIZARD") {
        return (
            <AppModal
                isOpen={isOpen}
                onClose={handleClose}
                title="Choose Post Type"
                subtitle="Select the nature of your contribution to the TATT-U community."
                headerClass="bg-gradient-to-r from-tatt-lime/10 to-transparent p-8"
                bodyClass="grid gap-4 p-6"
                maxWidth="max-w-2xl"
            >
                {allowedPostTypes.map(type => (
                    <button
                        key={type.id}
                        onClick={() => {
                            setSelectedPostType(type.id);
                            setStep("FORM");
                        }}
                        className="flex items-center gap-5 p-5 rounded-2xl border border-border hover:border-tatt-lime hover:bg-tatt-lime/5 transition-all text-left group cursor-pointer"
                    >
                        <div className="size-14 rounded-2xl bg-black/5 flex items-center justify-center group-hover:bg-tatt-lime group-hover:text-black transition-all">
                            <type.icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-foreground mb-1">{type.name}</h4>
                            <p className="text-xs text-tatt-gray">{type.description}</p>
                        </div>
                        <Plus className="h-5 w-5 text-tatt-gray group-hover:text-tatt-lime group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </AppModal>
        );
    }

    const currentPostTypeObj = POST_TYPES.find(t => t.id === selectedPostType);

    return (
        <AppModal
            isOpen={isOpen}
            onClose={handleClose}
            headerExtra={
                <button
                    type="button"
                    onClick={() => setStep("WIZARD")}
                    className="p-2 hover:bg-black/5 rounded-lg text-tatt-gray cursor-pointer"
                    title="Change Post Type"
                >
                    <ChevronDown className="h-5 w-5 rotate-90" />
                </button>
            }
            title={
                <div>
                    <h2 className="text-lg font-bold text-foreground">New {currentPostTypeObj?.name || "Post"}</h2>
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
            }
            footer={
                <div className="flex flex-col gap-3 w-full">
                    {/* Size Limit Indicator visible prior to posting */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-tatt-gray border-b border-border/40 pb-2.5">
                        <div className="flex items-center gap-1.5 font-medium">
                            <Info className="size-3.5 text-tatt-lime shrink-0" />
                            <span>
                                Max file size: <strong className="text-foreground">Images 50MB</strong> • <strong className="text-foreground">Videos 500MB</strong> • <strong className="text-foreground">Docs 100MB</strong>
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-tatt-gray/80 uppercase tracking-wider">
                            {attachments.length > 0 ? (
                                <span className="text-tatt-lime font-black">{attachments.length}/10 files attached</span>
                            ) : (
                                "Up to 10 files"
                            )}
                        </span>
                    </div>

                    <div className="flex items-center justify-between w-full">
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple
                                hidden
                                accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 bg-black/5 hover:bg-tatt-lime/10 hover:text-tatt-lime rounded-xl transition-all cursor-pointer text-tatt-gray active:scale-95"
                                title="Add Images or Videos (Images up to 50MB, Videos up to 500MB)"
                            >
                                <ImageIcon className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 bg-black/5 hover:bg-tatt-lime/10 hover:text-tatt-lime rounded-xl transition-all cursor-pointer text-tatt-gray active:scale-95"
                                title="Attach Documents or Audio (Up to 100MB)"
                            >
                                <Paperclip className="h-5 w-5" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreatePost}
                            disabled={isSubmitting || !newPostContent.trim()}
                            className="bg-tatt-lime text-black font-black px-8 py-3 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Publishing..." : "Publish Post"}
                        </button>
                    </div>
                </div>
            }
            maxWidth="max-w-3xl"
        >
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative transition-all rounded-2xl ${isDragging ? "ring-2 ring-tatt-lime ring-dashed bg-tatt-lime/5 p-2" : ""}`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur-xs border-2 border-dashed border-tatt-lime rounded-2xl flex flex-col items-center justify-center pointer-events-none p-6">
                        <Upload className="size-10 text-tatt-lime mb-2 animate-bounce" />
                        <p className="text-sm font-bold text-foreground">Drop media or documents to attach</p>
                        <p className="text-xs text-tatt-gray mt-1">Images up to 50MB • Videos up to 500MB • Docs up to 100MB</p>
                    </div>
                )}
            <input
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder={selectedPostType === "JOB" ? "Job Position / Role (e.g. Senior Software Engineer)" : "Post Title (Optional)"}
                className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 placeholder:text-tatt-gray outline-none text-foreground mb-3"
            />

            {selectedPostType === "JOB" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300 mb-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Company Name</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray" />
                            <input
                                value={jobCompany}
                                onChange={(e) => setJobCompany(e.target.value)}
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
                                value={jobLocation}
                                onChange={(e) => setJobLocation(e.target.value)}
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
                                value={jobLink}
                                onChange={(e) => setJobLink(e.target.value)}
                                placeholder="https://careers.company.com/job/..."
                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                            />
                        </div>
                    </div>
                </div>
            )}

            {selectedPostType === "EVENT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300 mb-3">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Event Type</label>
                        <div className="flex flex-wrap gap-2">
                            {["WEBINAR","WORKSHOP","CONFERENCE","IN_PERSON","HYBRID"].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setEventType(t)}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
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
                                value={eventUrl}
                                onChange={e => setEventUrl(e.target.value)}
                                placeholder="https://zoom.us/j/..."
                                className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none text-foreground"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Topic Selection */}
            {topics.length > 0 && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 mb-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1 flex items-center gap-1.5">
                        <MessageSquare className="size-3" /> Community Topic
                        <span className="font-normal normal-case opacity-60">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setPostTopicId("")}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
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
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
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
                className="w-full bg-transparent border-none text-base resize-none focus:ring-0 min-h-[180px] placeholder:text-tatt-gray/50 outline-none text-foreground"
            />

            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
                    {attachments.map((file, i) => {
                        const isImage = file.type.startsWith("image/");
                        const isVideo = file.type.startsWith("video/");
                        const isAudio = file.type.startsWith("audio/");
                        const preview = attachmentPreviews[i];

                        return (
                            <div
                                key={i}
                                className="relative rounded-xl overflow-hidden border border-border group bg-background p-2 flex flex-col justify-between min-h-[100px]"
                            >
                                {isImage && preview ? (
                                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/20 mb-1.5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center aspect-video w-full rounded-lg bg-black/5 border border-border/50 mb-1.5 text-tatt-gray group-hover:text-tatt-lime transition-colors">
                                        {isVideo ? (
                                            <Film className="size-8" />
                                        ) : isAudio ? (
                                            <Music className="size-8" />
                                        ) : (
                                            <FileText className="size-8" />
                                        )}
                                    </div>
                                )}

                                <div className="space-y-0.5 px-0.5">
                                    <p className="text-xs font-semibold text-foreground truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-[10px] text-tatt-gray font-medium">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeAttachment(i)}
                                    className="absolute top-2 right-2 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-red-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                                    title="Remove attachment"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            </div>
        </AppModal>
    );
}
