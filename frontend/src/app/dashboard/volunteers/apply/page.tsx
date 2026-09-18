"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, HeartHandshake, Loader2 } from "lucide-react";
import { VolunteerApplyForm } from "@/components/volunteers/volunteer-apply-form";
import { Suspense } from "react";

function ApplyFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleId = searchParams?.get("roleId") || undefined;

    const handleApplySuccess = () => {
        // Redirect back to volunteers page after successful application
        setTimeout(() => {
            router.push("/dashboard/volunteers?justApplied=true");
        }, 3000);
    };

    return (
        <VolunteerApplyForm roleId={roleId} onSuccess={handleApplySuccess} />
    );
}

export default function VolunteerApplyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full bg-background text-foreground">
            {/* Page header */}
            <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button 
                            onClick={() => router.back()}
                            className="p-2 hover:bg-black/5 rounded-xl transition-colors text-tatt-gray hover:text-foreground"
                            title="Go back"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <div className="size-10 sm:size-12 rounded-xl bg-tatt-lime flex items-center justify-center text-tatt-black shrink-0">
                            <HeartHandshake className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">Volunteer Application</h1>
                            <p className="text-tatt-gray text-xs sm:text-sm mt-0.5">Join the TATT-U global movement</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="bg-surface rounded-3xl border border-border p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                    {/* Background glassmorphism accent */}
                    <div className="absolute -top-24 -right-24 size-64 bg-tatt-lime/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 size-64 bg-tatt-lime/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10">
                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-tatt-lime mb-4" />
                                <p className="text-tatt-gray font-medium">Preparing application...</p>
                            </div>
                        }>
                            <ApplyFormContent />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
