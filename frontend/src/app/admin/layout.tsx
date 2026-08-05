"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Globe,
    Heart,
    Calendar,
    Rss,
    Handshake,
    IdCard,
    BookOpen,
    Package,
    BarChart3,
    LogOut,
    Search,
    Bell,
    Settings,
    Menu,
    X,
    User as UserIcon,
    Check,
    Trash2,
    CheckCircle2,
    Eye,
    Clock,
    Briefcase,
    Banknote,
    Store,
    LifeBuoy,
} from "lucide-react";
import { DashboardFooter } from "@/components/organisms/dashboard-footer";
import api from "@/services/api";

interface MenuItem {
    icon: React.ReactNode;
    label: string;
    href: string;
    active?: boolean;
    badge?: string;
    dot?: boolean;
    flag?: string;
}


interface MenuGroup {
    group: string;
    items: MenuItem[];
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, logout } = useAuth();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get("/notifications");
            // Only show those that are NOT dismissed
            setNotifications(data.filter((n: any) => !n.dismissedAt));
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll every 1 min
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
        } catch (e) { console.error(e); }
    };

    const dismissNotification = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/dismiss`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (e) { console.error(e); }
    };

    const unreadCount = notifications.filter(n => !n.readAt).length;

    const userHasAccess = (href: string) => {
        if (!user || !user.systemRole) return false;
        if (user.systemRole === 'SUPERADMIN') return true;
        
        const rolePermissions: Record<string, string[]> = {
            "/admin": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN", "CONTENT_ADMIN", "SALES", "MODERATOR"],
            "/admin/org-management": ["SUPERADMIN", "ADMIN"],
            "/admin/regional-chapters": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN"],
            "/admin/feed-moderation": ["SUPERADMIN", "ADMIN", "MODERATOR"],
            "/admin/community-feed": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN", "CONTENT_ADMIN", "SALES", "MODERATOR"],
            "/admin/volunteers": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN"],
            "/admin/events": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN", "CONTENT_ADMIN"],
            "/admin/partnerships": ["SUPERADMIN", "ADMIN", "CONTENT_ADMIN"],
            "/admin/membership-center": ["SUPERADMIN", "ADMIN", "CONTENT_ADMIN"],
            "/admin/jobs": ["SUPERADMIN", "ADMIN", "CONTENT_ADMIN", "MODERATOR"],
            "/admin/business-directory": ["SUPERADMIN", "ADMIN", "MODERATOR"],
            "/admin/messages": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN", "CONTENT_ADMIN", "SALES", "MODERATOR"],
            "/admin/support-center": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN", "CONTENT_ADMIN", "MODERATOR"],
            "/admin/revenue": ["SUPERADMIN"],
            "/admin/sales-inventory": ["SUPERADMIN", "ADMIN", "CONTENT_ADMIN", "SALES"],
            "/admin/resources": ["SUPERADMIN", "ADMIN", "CONTENT_ADMIN"],
            "/admin/platform": ["SUPERADMIN", "ADMIN", "CONTENT_ADMIN"],
            "/admin/analytics": ["SUPERADMIN", "ADMIN"],
            "/admin/settings": ["SUPERADMIN", "ADMIN", "REGIONAL_ADMIN", "CONTENT_ADMIN", "SALES", "MODERATOR"]
        };
        
        const roles = rolePermissions[href];
        if (roles && roles.includes(user.systemRole)) return true;
        return false;
    };

    const menuItems: MenuGroup[] = [
        {
            group: "Overview", items: [
                { icon: <LayoutDashboard size={20} />, label: "Dashboard Overview", href: "/admin" }
            ]
        },
        {
            group: "Community", items: [
                { icon: <Users size={20} />, label: "Org Management", href: "/admin/org-management", badge: "NEW", flag: "CAN_ACCESS_ORG_MANAGEMENT" },
                { icon: <Globe size={20} />, label: "Regional Chapters", href: "/admin/regional-chapters", flag: "CAN_ACCESS_REGIONAL_CHAPTERS" },
                { icon: <Rss size={20} />, label: "TATT Feed Moderation", href: "/admin/feed-moderation", dot: true, flag: "CAN_ACCESS_FORUM_MODERATION" },
                { icon: <Globe size={20} />, label: "Community Feed", href: "/admin/community-feed", flag: "CAN_ACCESS_FORUM_MODERATION" },
                { icon: <Heart size={20} />, label: "Volunteer Center", href: "/admin/volunteers", flag: "CAN_ACCESS_VOLUNTEER_CENTER" },
                { icon: <Calendar size={20} />, label: "Events & Mixers", href: "/admin/events", flag: "CAN_ACCESS_EVENTS" },
                { icon: <Handshake size={20} />, label: "Partnerships", href: "/admin/partnerships", flag: "CAN_ACCESS_PARTNERSHIPS" },
                { icon: <IdCard size={20} />, label: "Membership Center", href: "/admin/membership-center", flag: "CAN_ACCESS_MEMBERSHIP_CENTER" },
                { icon: <Briefcase size={20} />, label: "Jobs Center", href: "/admin/jobs" },
                { icon: <Store size={20} />, label: "Business Directory", href: "/admin/business-directory" },
                { icon: <MessageSquare size={20} />, label: "Messages", href: "/admin/messages", badge: "NEW" },
                { icon: <LifeBuoy size={20} />, label: "Support Center", href: "/admin/support-center" }
            ]
        },
        {
            group: "Financial Management", items: [
                { icon: <Banknote size={20} />, label: "Revenue Center", href: "/admin/revenue", flag: "CAN_ACCESS_REVENUE_CENTER" },
                { icon: <Package size={20} />, label: "Sales & Inventory", href: "/admin/sales-inventory", flag: "CAN_ACCESS_SALES_INVENTORY" },
            ]
        },
        {
            group: "Resources", items: [
                { icon: <BookOpen size={20} />, label: "Content & Resources", href: "/admin/resources", flag: "CAN_ACCESS_CONTENT_RESOURCES" },
                { icon: <Globe size={20} />, label: "Platform Management", href: "/admin/platform", flag: "CAN_ACCESS_PLATFORM_SETTINGS" },
                { icon: <BarChart3 size={20} />, label: "Analytics", href: "/admin/analytics", flag: "CAN_ACCESS_ANALYTICS" }
            ]
        }
    ];

    return (
        <AdminGuard>
            <div className="flex h-screen overflow-hidden bg-background font-sans">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    fixed inset-y-0 left-0 z-50 w-72 bg-tatt-black text-white flex flex-col shrink-0 border-r border-border transform transition-transform duration-300 ease-in-out
                    lg:relative lg:translate-x-0
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                `}>
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 flex items-center justify-center p-1">
                                <Image src="/assets/tatt-logo.webp" alt="TATT" width={32} height={32} className="object-contain" style={{ width: 'auto', height: 'auto' }} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight tracking-tight">TATT</h1>
                                <p className="text-[10px] uppercase tracking-widest text-tatt-lime font-semibold">Admin Portal</p>
                            </div>
                        </div>
                        <button className="lg:hidden text-white hover:text-tatt-lime" onClick={() => setIsSidebarOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
                        {menuItems.map((group, idx) => {
                            const visibleItems = group.items.filter(item => userHasAccess(item.href));
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={idx} className="pb-4">
                                    {group.group !== "Overview" && (
                                        <p className="px-3 py-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">{group.group}</p>
                                    )}
                                    {visibleItems.map((item, i) => (
                                        <Link
                                            key={i}
                                            href={item.href}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                                                pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                                                ? "bg-tatt-lime text-tatt-black font-bold"
                                                : "text-white/70 hover:text-white hover:bg-tatt-lime/10"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon}
                                                {item.label}
                                            </div>
                                            {item.badge && (
                                                <span className="bg-tatt-lime/20 text-tatt-lime text-[10px] px-1.5 py-0.5 rounded font-bold">{item.badge}</span>
                                            )}
                                            {item.dot && (
                                                <div className="size-2 rounded-full bg-red-500"></div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="p-4 mt-auto border-t border-white/10">
                        <button
                            onClick={logout}
                            className="w-full bg-tatt-lime hover:bg-tatt-lime/90 text-tatt-black font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs shadow-sm"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Header */}
                    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0">
                        <div className="flex items-center gap-4 flex-1">
                            <button className="lg:hidden p-2 text-tatt-gray hover:bg-background rounded-lg" onClick={() => setIsSidebarOpen(true)}>
                                <Menu size={24} />
                            </button>
                            <div className="flex-1 max-w-md hidden md:block">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray size-4 group-focus-within:text-tatt-lime transition-colors" />
                                    <input
                                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/50"
                                        placeholder="Search members, reports, or resources..."
                                        type="text"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-6">
                            <div className="flex items-center gap-1 lg:gap-2">
                                <div className="relative" ref={notificationsRef}>
                                    <button 
                                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                                        className={`p-2 rounded-lg relative transition-all ${notificationsOpen ? 'bg-tatt-lime/10 text-tatt-lime' : 'text-tatt-gray hover:bg-background'}`}
                                    >
                                        <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-2 right-2 size-4 bg-red-600 text-[8px] font-black text-white flex items-center justify-center rounded-full border-2 border-surface animate-bounce shadow-sm">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {notificationsOpen && (
                                        <div className="absolute right-0 mt-3 w-[24rem] md:w-[28rem] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-border overflow-hidden z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
                                                <h4 className="text-sm font-black uppercase tracking-widest text-tatt-black">Notifications</h4>
                                                {unreadCount > 0 && (
                                                    <span className="text-[10px] font-bold text-tatt-lime-dark bg-tatt-lime/20 px-2 py-0.5 rounded-full">
                                                        {unreadCount} New
                                                    </span>
                                                )}
                                            </div>

                                            <div className="max-h-[32rem] overflow-y-auto custom-scrollbar divide-y divide-border">
                                                {notifications.length === 0 ? (
                                                    <div className="p-12 text-center">
                                                        <div className="size-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-tatt-gray/40">
                                                            <Bell size={32} />
                                                        </div>
                                                        <p className="text-sm font-bold text-tatt-black">All Caught Up!</p>
                                                        <p className="text-xs text-tatt-gray mt-1">No pending notifications at the moment.</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((n) => (
                                                        <div key={n.id} className={`p-4 flex gap-4 transition-all group ${!n.readAt ? 'bg-tatt-lime/5' : 'hover:bg-surface'}`}>
                                                            <div className={`mt-1 size-10 rounded-xl shrink-0 flex items-center justify-center ${!n.readAt ? 'bg-tatt-lime/20 text-tatt-lime-dark' : 'bg-surface text-tatt-gray'}`}>
                                                                {n.type === 'NEW_MESSAGE' ? <MessageSquare size={18} /> : 
                                                                 n.type === 'CONNECTION_REQUEST' ? <Users size={18} /> :
                                                                 <Bell size={18} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                    <p className={`text-sm font-black line-clamp-1 ${!n.readAt ? 'text-tatt-black' : 'text-tatt-gray-dark'}`}>
                                                                        {n.title}
                                                                    </p>
                                                                    <span className="text-[9px] font-bold text-tatt-gray whitespace-nowrap">
                                                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-tatt-gray line-clamp-2 font-medium leading-relaxed mb-3">
                                                                    {n.message}
                                                                </p>
                                                                <div className="flex items-center gap-3">
                                                                    {!n.readAt && (
                                                                        <button 
                                                                            onClick={() => markAsRead(n.id)}
                                                                            className="text-[9px] font-black uppercase tracking-widest text-tatt-lime-dark hover:underline flex items-center gap-1"
                                                                        >
                                                                            <Check size={10} strokeWidth={3} /> Mark Read
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        onClick={() => dismissNotification(n.id)}
                                                                        className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline flex items-center gap-1"
                                                                    >
                                                                        <X size={10} strokeWidth={3} /> Dismiss
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            
                                            <div className="p-4 bg-surface/50 border-t border-border text-center">
                                                <Link href="/admin/platform" className="text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-tatt-black transition-colors px-4 py-2">
                                                    Notification Settings
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {user?.systemRole === "SUPERADMIN" && (
                                    <Link 
                                        href="/admin/settings"
                                        className="p-2 text-tatt-gray hover:bg-background rounded-lg hover:text-tatt-lime transition-all"
                                    >
                                        <Settings size={20} />
                                    </Link>
                                )}
                            </div>
                            <div className="h-8 w-px bg-border hidden sm:block"></div>
                            <div className="relative group" ref={dropdownRef}>
                                <div
                                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-foreground line-clamp-1">{user?.firstName} {user?.lastName}</p>
                                        <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest">{user?.systemRole?.replace('_', ' ')}</p>
                                    </div>
                                    <div className="size-10 rounded-full border-2 border-tatt-lime flex items-center justify-center overflow-hidden shrink-0 bg-background select-none">
                                        {user?.profilePicture ? (
                                            <Image src={user.profilePicture} alt="Admin" width={40} height={40} className="object-cover" style={{ width: 'auto', height: 'auto' }} />
                                        ) : (
                                            <div className="size-full bg-tatt-lime/20 flex items-center justify-center text-tatt-lime font-bold">
                                                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-48 bg-white  rounded-lg shadow-xl border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                        <Link
                                            href={user?.id ? `/dashboard/network/${user.id}` : "/dashboard/feed"}
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-black/5  transition-colors"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            <UserIcon className="h-4 w-4" />
                                            Go to Profile
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

                    {/* Dashboard Body */}
                    <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-background custom-scrollbar flex flex-col">
                        <div className="flex-1">
                            {children}
                        </div>
                        <DashboardFooter />
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
