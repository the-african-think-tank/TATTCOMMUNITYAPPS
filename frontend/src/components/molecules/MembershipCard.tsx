"use client";

import React, { useRef } from 'react';
import { Award, Download, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import Link from 'next/link';

export interface MemberData {
    id: string;
    firstName: string;
    lastName: string;
    communityTier: string;
    professionTitle?: string | null | undefined;
    companyName?: string | null | undefined;
    chapterName?: string | null | undefined;
    chapterCode?: string | null | undefined;
    tattMemberId?: string | null | undefined;
    createdAt?: string | null | undefined;
}

interface MembershipCardProps {
    member: MemberData;
    isCurrentUser: boolean;
}

const MembershipCard: React.FC<MembershipCardProps> = ({ member, isCurrentUser }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const isFree = member.communityTier === "FREE";

    const handleDownloadPDF = async () => {
        if (!cardRef.current || isFree) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#000000",
            });
            const imgData = canvas.toDataURL('image/png');

            // Calculate height to maintain aspect ratio
            const pdfWidth = canvas.width / 3;
            const pdfHeight = canvas.height / 3;

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`TATT-Membership-Card-${member.lastName}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        }
    };

    const tier = member.communityTier || "FREE";
    const displayTierName =
        tier === "KIONGOZI"
            ? "Kiongozi Business"
            : tier === "FREE"
            ? "Sankofa"
            : `${tier.charAt(0)}${tier.slice(1).toLowerCase()}`;

    const joinedDate = member.createdAt ? format(new Date(member.createdAt), 'yyyy') : '2024';

    const CardContent = (
        <div
            ref={cardRef}
            className={`relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] aspect-[1.58/1] flex flex-col p-6 text-white border transition-all ${isFree ? 'bg-[#18181b80] backdrop-blur-md grayscale opacity-60' : 'bg-[#0a0a0a] border-[#ffffff1a]'}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className={`size-8 rounded flex items-center justify-center ${isFree ? 'bg-[#3f3f46] text-[#71717a]' : 'bg-[#9fcc00] text-[#000000]'}`}>
                        <Award className="h-4 w-4 font-black" />
                    </div>
                    <span className={`text-[10px] font-black tracking-widest uppercase ${isFree ? 'text-[#71717a]' : 'text-[#9fcc00]'}`}>{displayTierName}</span>
                </div>
                {isCurrentUser && (
                    <span className="text-[10px] opacity-50 font-black tracking-tighter">
                        {isFree ? "TATT-XXXX-XXXX" : (member.tattMemberId || `TATT-XXXX-${member.id.substring(0, 4)}`)}
                    </span>
                )}
            </div>

            <div className="mt-auto">
                <div className="mb-4">
                    <h4 className="text-2xl font-black tracking-tight leading-tight mb-2 uppercase py-1">
                        {member.firstName} {member.lastName}
                    </h4>
                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] leading-snug py-1 ${isFree ? 'text-[#71717a]' : 'text-[#9fcc00]'}`}>
                        {member.professionTitle || "Professional Member"}
                    </p>
                </div>

                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="size-6 bg-[#181811] rounded-sm flex items-center justify-center border border-[#ffffff1a] shadow-sm">
                                <span className={`text-[8px] font-black ${isFree ? 'text-[#71717a]' : 'text-[#9fcc00]'}`}>
                                    {(member.companyName || "TATT").slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <span className="text-sm font-black tracking-tight leading-normal py-0.5">
                                {member.companyName || "Member of TATT"}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0.5">
                            <p className="text-[10px] opacity-60 font-black uppercase tracking-widest leading-normal">Member Since {joinedDate}</p>
                            <p className="text-[10px] opacity-60 font-black uppercase tracking-widest leading-normal">{member.chapterName || "Global"}</p>
                        </div>
                    </div>

                    <div className="size-16 bg-[#ffffff0d] border border-[#ffffff1a] p-1.5 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm">
                        <ShieldCheck className={`${isFree ? 'text-[#3f3f46]' : 'text-[#9fcc00]'} size-8 mb-1 opacity-50`} />
                        <span className="text-[6px] font-black uppercase tracking-[0.05em] text-center opacity-40">Verified<br />Member</span>
                    </div>
                </div>
            </div>

            {isFree && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#00000066] backdrop-blur-[2px] p-6 text-center">
                    <div className="bg-[#9fcc00e6] text-black px-3 py-1 rounded-full text-[10px] font-black mb-2 uppercase tracking-tighter">Upgrade Required</div>
                    <p className="text-xs font-bold leading-tight">Upgrade to a paid tier to get your official TATT member ID card.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="relative group w-full max-w-[480px] mx-auto lg:mx-0">
                <div className={`absolute -inset-0.5 rounded-2xl blur transition-opacity ${isFree ? 'bg-zinc-500 opacity-10' : 'bg-tatt-lime opacity-20 group-hover:opacity-40'}`} />
                {isFree ? (
                    <Link href="/dashboard/upgrade" className="block cursor-pointer hover:scale-[1.01] transition-transform">
                        {CardContent}
                    </Link>
                ) : (
                    CardContent
                )}
            </div>

            {isFree ? (
                <div className="p-4 bg-tatt-lime/5 border border-tatt-lime/10 rounded-xl max-w-[480px]">
                    <p className="text-[11px] text-tatt-gray font-medium leading-relaxed">
                        <span className="text-tatt-lime font-black">PRO TIP:</span> TATT Member IDs unlock exclusive discounts across our 
                        partner network and community businesses worldwide.
                    </p>
                </div>
            ) : (
                <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-foreground hover:border-tatt-lime hover:bg-tatt-lime/5 transition-all w-full max-w-[480px] mx-auto lg:mx-0 group shadow-sm"
                >
                    <Download className="size-3.5 group-hover:translate-y-0.5 transition-transform" />
                    Download Print Copy
                </button>
            )}
        </div>
    );
};

export default MembershipCard;
