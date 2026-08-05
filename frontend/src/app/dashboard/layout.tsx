"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/organisms/dashboard-sidebar";
import { DashboardHeader } from "@/components/organisms/dashboard-header";
import { DashboardFooter } from "@/components/organisms/dashboard-footer";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/');
            } else if (
                user && 
                user.systemRole !== 'COMMUNITY_MEMBER' && 
                !window.location.pathname.includes('/volunteers') &&
                !window.location.pathname.includes('/dashboard/network')
            ) {
                router.push('/admin');
            } else if (user && user.systemRole === 'COMMUNITY_MEMBER' && !user.flags?.includes('ONBOARDING_COMPLETED')) {
                // If they are a member but haven't finished the plans selection,
                // kick them back to onboarding.
                router.push('/onboarding/plans');
            }

        }
    }, [isAuthenticated, isLoading, user, router]);


    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tatt-lime"></div>
            </div>
        );
    }

    if (
        !isAuthenticated || 
        (
            user && 
            user.systemRole !== 'COMMUNITY_MEMBER' && 
            !window.location.pathname.includes('/volunteers') &&
            !window.location.pathname.includes('/dashboard/network')
        )
    ) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <DashboardSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
                {user?.deletionRequestedAt && (
                    <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between shadow-lg z-20">
                        <div className="flex items-center gap-3">
                            <span className="animate-ping size-2 bg-white rounded-full"></span>
                            <span className="text-xs font-black uppercase tracking-widest">Account Closure Pending</span>
                            <span className="hidden md:inline text-xs opacity-90 italic">
                                Your account is scheduled for deletion in {Math.ceil((new Date(new Date(user.deletionRequestedAt).getTime() + 14 * 24 * 60 * 60 * 1000).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days.
                            </span>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/settings')}
                            className="bg-white text-red-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full hover:bg-red-50 hover:scale-105 transition-all"
                        >
                            Review Request
                        </button>
                    </div>
                )}
                <div className="flex-1">
                    {children}
                </div>
                <DashboardFooter />
            </main>
        </div>
    );
}
