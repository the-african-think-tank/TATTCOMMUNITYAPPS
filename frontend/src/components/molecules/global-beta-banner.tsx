"use client";

import React, { useRef, useEffect } from "react";
import { usePublicConfig } from "@/hooks/use-queries";

export function GlobalBetaBanner() {
    const { data: config } = usePublicConfig();
    const bannerRef = useRef<HTMLElement>(null);

    const isVisible = !!config?.showBetaNotice;

    useEffect(() => {
        if (!isVisible) {
            document.documentElement.style.setProperty("--beta-banner-h", "0px");
            return;
        }

        const updateHeight = () => {
            if (bannerRef.current) {
                const height = bannerRef.current.offsetHeight;
                document.documentElement.style.setProperty("--beta-banner-h", `${height}px`);
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);

        return () => {
            window.removeEventListener("resize", updateHeight);
            document.documentElement.style.setProperty("--beta-banner-h", "0px");
        };
    }, [isVisible]);

    if (!isVisible) {
        return null;
    }

    return (
        <aside
            ref={bannerRef}
            aria-label="Beta Testing Notice"
            className="sticky top-0 z-[100] w-full bg-[#0B0C0E] border-b border-[#22262B] text-white text-xs py-2 px-3 sm:px-6 shadow-sm"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-center text-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tatt-lime/15 border border-tatt-lime/30 text-tatt-lime font-mono text-[10px] sm:text-[11px] font-bold tracking-wider uppercase shrink-0">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tatt-lime opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-tatt-lime" />
                    </span>
                    Beta
                </span>

                {config.betaVersionTag && (
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px] shrink-0">
                        {config.betaVersionTag}
                    </span>
                )}

                <p className="text-gray-200 font-medium text-[11px] sm:text-xs">
                    {config.betaBannerMessage}
                </p>
            </div>
        </aside>
    );
}
