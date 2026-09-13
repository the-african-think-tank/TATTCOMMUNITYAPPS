"use client";

import { useAuth } from "@/context/auth-context";
import { Search, Bell, Menu, LogOut, User as UserIcon, Settings } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function DashboardHeader({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, logout } = useAuth();
    const isAdmin = user?.systemRole === "SUPERADMIN" || user?.systemRole === "ADMIN";
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="h-16 bg-surface/80 border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-[var(--beta-banner-h,0px)] z-40 backdrop-blur-sm transition-all">
            <div className="flex items-center gap-4 flex-1">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 -ml-2 text-tatt-gray hover:text-foreground rounded-lg hover:bg-black/5 "
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray h-5 w-5" />
                    <input
                        className="w-full bg-surface border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-tatt-lime outline-none text-foreground placeholder:text-tatt-gray shadow-inner"
                        placeholder="Search members, jobs, or discussions..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
                {isAdmin && (
                    <Link 
                        href="/admin/settings" 
                        className="p-2 hover:bg-black/5 rounded-lg text-tatt-gray hover:text-tatt-lime transition-all group"
                        title="Platform Settings"
                    >
                        <Settings className="h-5 w-5 group-hover:rotate-45 transition-transform duration-300" />
                    </Link>
                )}
                <NotificationDropdown />
                <div className="relative" ref={dropdownRef}>
                    <div
                        className="flex items-center gap-3 pl-4 lg:pl-6 border-l border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold leading-none">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[11px] text-tatt-gray font-medium uppercase mt-1">{user?.systemRole?.replace('_MEMBER', '').replace('_', ' ') || user?.communityTier || "—"}</p>
                        </div>
                        <div className="size-10 rounded-full border-2 border-tatt-lime overflow-hidden bg-background flex items-center justify-center font-bold text-tatt-lime select-none">
                            {user?.profilePicture ? (
                                <img
                                    src={user.profilePicture}
                                    alt={`${user.firstName} ${user.lastName}`}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <span className="text-sm">
                                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-3 w-48 bg-white  rounded-lg shadow-xl border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2">
                            <Link
                                href={`/dashboard/network/${user?.id}`}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-black/5  transition-colors"
                                onClick={() => setDropdownOpen(false)}
                            >
                                <UserIcon className="h-4 w-4" />
                                My Public Profile
                            </Link>

                            <button
                                onClick={() => {
                                    setDropdownOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50  transition-colors text-left"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
