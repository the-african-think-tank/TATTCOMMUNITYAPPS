"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ExternalLink, Play, Image as ImageIcon } from "lucide-react";

interface PostMediaGalleryProps {
    mediaUrls?: string[] | null;
    className?: string;
}

const isVideoUrl = (url?: string | null) => {
    if (!url) return false;
    const clean = (url.split("?")[0] || "").toLowerCase();
    return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".mov") || clean.endsWith(".ogg");
};

export function PostMediaGallery({ mediaUrls, className = "" }: PostMediaGalleryProps) {
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (activeIdx !== null) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [activeIdx]);

    // Keyboard navigation
    useEffect(() => {
        if (activeIdx === null || !mediaUrls?.length) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setActiveIdx(null);
            } else if (e.key === "ArrowLeft") {
                setActiveIdx((prev) => (prev === null ? null : prev > 0 ? prev - 1 : mediaUrls.length - 1));
            } else if (e.key === "ArrowRight") {
                setActiveIdx((prev) => (prev === null ? null : prev < mediaUrls.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeIdx, mediaUrls]);

    const validUrls = (mediaUrls || []).filter((u): u is string => Boolean(u && typeof u === "string"));

    if (validUrls.length === 0) return null;

    const total = validUrls.length;
    const currentMediaUrl = activeIdx !== null ? validUrls[activeIdx] : null;

    const renderGridItem = (url: string, index: number, extraClasses = "") => {
        const isVideo = isVideoUrl(url);
        const isLastOfFour = index === 3 && total > 4;
        const remainingCount = total - 3;

        return (
            <div
                key={index}
                onClick={() => setActiveIdx(index)}
                className={`relative overflow-hidden bg-black/10 cursor-pointer group ${extraClasses}`}
                role="button"
                tabIndex={0}
                aria-label={`View media ${index + 1} of ${total}`}
            >
                {isVideo ? (
                    <>
                        <video src={url} className="w-full h-full object-cover pointer-events-none" muted playsInline />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="size-10 sm:size-12 rounded-full bg-tatt-lime text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="size-5 sm:size-6 fill-current translate-x-0.5" />
                            </div>
                        </div>
                    </>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                )}

                {/* More images overlay on the 4th item */}
                {isLastOfFour && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition-all group-hover:bg-black/75">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                            +{remainingCount}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/90 mt-0.5">
                            More
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className={`mt-4 ${className}`}>
                {/* 1 Image */}
                {total === 1 && (
                    <div className="rounded-2xl overflow-hidden border border-border/80 aspect-[16/10] sm:aspect-[16/9] max-h-[500px]">
                        {renderGridItem(validUrls[0] || "", 0, "w-full h-full")}
                    </div>
                )}

                {/* 2 Images */}
                {total === 2 && (
                    <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-border/80 aspect-[16/9] sm:aspect-[2/1]">
                        {validUrls.map((url, i) => renderGridItem(url, i, "w-full h-full"))}
                    </div>
                )}

                {/* 3 Images: 1 tall on left, 2 stacked on right */}
                {total === 3 && (
                    <div className="grid grid-cols-2 grid-rows-2 gap-2 rounded-2xl overflow-hidden border border-border/80 aspect-[16/9] sm:aspect-[4/3]">
                        {renderGridItem(validUrls[0] || "", 0, "row-span-2 col-span-1 h-full")}
                        {renderGridItem(validUrls[1] || "", 1, "col-span-1 h-full")}
                        {renderGridItem(validUrls[2] || "", 2, "col-span-1 h-full")}
                    </div>
                )}

                {/* 4 or more Images: 2x2 grid with max 4 slots displayed */}
                {total >= 4 && (
                    <div className="grid grid-cols-2 grid-rows-2 gap-2 rounded-2xl overflow-hidden border border-border/80 aspect-[16/9] sm:aspect-[4/3]">
                        {validUrls.slice(0, 4).map((url, i) => renderGridItem(url, i, "w-full h-full"))}
                    </div>
                )}
            </div>

            {/* In-page Lightbox Modal */}
            {activeIdx !== null && mounted && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
                    onClick={() => setActiveIdx(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Image Preview Lightbox"
                >
                    {/* Top Navigation Bar */}
                    <div
                        className="flex items-center justify-between w-full max-w-6xl mx-auto z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs font-bold uppercase tracking-wider">
                            <ImageIcon className="size-3.5 text-tatt-lime" />
                            <span>
                                {activeIdx + 1} of {total}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {currentMediaUrl && (
                                <a
                                    href={currentMediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
                                    title="Open original in new tab"
                                >
                                    <ExternalLink className="size-5" />
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => setActiveIdx(null)}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Close preview (Esc)"
                                aria-label="Close"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                    </div>

                    {/* Center Display Area */}
                    <div
                        className="relative flex-1 flex items-center justify-center w-full max-w-6xl mx-auto my-3 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Prev Button */}
                        {total > 1 && (
                            <button
                                type="button"
                                onClick={() => setActiveIdx((prev) => (prev === null ? 0 : prev > 0 ? prev - 1 : total - 1))}
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 size-11 sm:size-14 rounded-full bg-black/60 hover:bg-tatt-lime hover:text-black border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl active:scale-90 z-20"
                                title="Previous image (Left arrow)"
                                aria-label="Previous"
                            >
                                <ChevronLeft className="size-6 sm:size-7" />
                            </button>
                        )}

                        {/* Current Media Element */}
                        <div className="relative max-h-full max-w-full flex items-center justify-center p-2">
                            {currentMediaUrl && isVideoUrl(currentMediaUrl) ? (
                                <video
                                    key={currentMediaUrl}
                                    src={currentMediaUrl}
                                    controls
                                    autoPlay
                                    className="max-h-[75vh] sm:max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black"
                                />
                            ) : currentMediaUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    key={currentMediaUrl}
                                    src={currentMediaUrl}
                                    alt={`Attachment ${activeIdx + 1}`}
                                    className="max-h-[75vh] sm:max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain animate-in fade-in zoom-in-95 duration-200"
                                />
                            ) : null}
                        </div>

                        {/* Next Button */}
                        {total > 1 && (
                            <button
                                type="button"
                                onClick={() => setActiveIdx((prev) => (prev === null ? 0 : prev < total - 1 ? prev + 1 : 0))}
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 size-11 sm:size-14 rounded-full bg-black/60 hover:bg-tatt-lime hover:text-black border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl active:scale-90 z-20"
                                title="Next image (Right arrow)"
                                aria-label="Next"
                            >
                                <ChevronRight className="size-6 sm:size-7" />
                            </button>
                        )}
                    </div>

                    {/* Bottom Thumbnails Strip */}
                    {total > 1 && (
                        <div
                            className="w-full max-w-3xl mx-auto z-10 flex justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-2 px-3 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 hide-scrollbar">
                                {validUrls.map((url, i) => {
                                    const isVideo = isVideoUrl(url);
                                    const isActive = i === activeIdx;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setActiveIdx(i)}
                                            className={`relative size-12 sm:size-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                                isActive
                                                    ? "border-tatt-lime scale-105 opacity-100 shadow-lg shadow-tatt-lime/25"
                                                    : "border-transparent opacity-40 hover:opacity-80"
                                            }`}
                                            title={`Go to image ${i + 1}`}
                                            aria-label={`Thumbnail ${i + 1}`}
                                        >
                                            {isVideo ? (
                                                <div className="size-full bg-zinc-800 flex items-center justify-center text-white">
                                                    <Play className="size-4 fill-current" />
                                                </div>
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={url} alt="" className="size-full object-cover" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
