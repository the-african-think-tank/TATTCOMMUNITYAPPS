"use client";

import React from "react";
import Link from "next/link";
import { useTermsModal } from "@/context/terms-context";
import { usePublicConfig } from "@/hooks/use-queries";

export function DashboardFooter() {
  const { showTerms } = useTermsModal();
  const { data: config } = usePublicConfig();
  const currentYear = 2026; // Fixed per user request

  return (
    <footer className="w-full py-10 px-6 mt-auto bg-surface border-t border-border">
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Left: Copyright & Beta indicator */}
        <div className="flex flex-wrap items-center gap-2.5 font-sans text-[10px] tracking-widest uppercase text-tatt-gray font-black">
          <span>© {currentYear} The African Think Tank. All Rights Reserved.</span>
          {config?.showBetaNotice && config?.betaVersionTag && (
            <span className="px-2 py-0.5 rounded-full bg-tatt-lime/15 text-tatt-lime-dark border border-tatt-lime/40 font-mono text-[9px] font-bold tracking-normal normal-case">
              {config.betaVersionTag}
            </span>
          )}
        </div>

        {/* Right: Links & Maintenance */}
        <div className="flex flex-wrap justify-center md:justify-end items-center gap-x-8 gap-y-3 font-sans text-[10px] tracking-[0.2em] font-black uppercase">
          <a 
            href="https://www.theafricanthinktank.com/privacy-policy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-tatt-gray hover:text-tatt-black transition-all"
          >
            Privacy Policy
          </a>
          <button 
            onClick={showTerms}
            className="text-tatt-gray hover:text-tatt-black transition-all uppercase"
          >
            Terms of Service
          </button>
          
          <span className="hidden lg:inline text-border">|</span>
          
          <a 
            href="https://www.dohtechsolutions.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-tatt-gray/40 hover:text-tatt-lime transition-colors italic tracking-normal normal-case font-bold"
          >
            Developed and maintained by DOHTECH SOLUTIONS
          </a>
        </div>
      </div>
    </footer>
  );
}
