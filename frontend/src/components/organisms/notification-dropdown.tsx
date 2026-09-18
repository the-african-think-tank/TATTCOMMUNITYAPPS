"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, X, Check, Trash2, Info, MessageSquare, UserPlus, CreditCard, Calendar, AlertTriangle, Megaphone, Heart } from "lucide-react";
import api from "@/services/api";
import { Notification, NotificationType } from "@/types/notifications";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { useAuth } from "@/context/auth-context";

export function NotificationDropdown() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const safeDate = (dateStr: any) => {
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch {
            return new Date();
        }
    };

    const unreadCount = (notifications || []).filter(n => !n.readAt && !n.dismissedAt).length;

    const fetchNotifications = async () => {
        try {
            const response = await api.get("/notifications");
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Polling for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const dismiss = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/dismiss`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissedAt: new Date().toISOString() } : n));
        } catch (error) {
            console.error("Failed to dismiss notification", error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.patch(`/notifications/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
        } catch (error) {
            console.error("Failed to mark all notifications as read", error);
        }
    };


    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.NEW_MESSAGE:
                return <MessageSquare className="size-4 text-blue-500" />;
            case NotificationType.CONNECTION_REQUEST:
            case NotificationType.CONNECTION_ACCEPTED:
                return <UserPlus className="size-4 text-green-500" />;
            case NotificationType.SUBSCRIPTION_RENEWAL:
            case NotificationType.SUBSCRIPTION_EXPIRING:
            case NotificationType.SUBSCRIPTION_DOWNGRADE:
                return <CreditCard className="size-4 text-purple-500" />;
            case NotificationType.EVENT_REMINDER:
                return <Calendar className="size-4 text-orange-500" />;
            case NotificationType.SYSTEM_ALERT:
                return <AlertTriangle className="size-4 text-red-500" />;
            case NotificationType.SYSTEM_ANNOUNCEMENT:
                return <Megaphone className="size-4 text-tatt-lime" />;
            case NotificationType.VOLUNTEER_ROLE:
                return <Heart className="size-4 text-pink-500" />;
            default:
                return <Info className="size-4 text-tatt-gray" />;
        }
    };

    const getLink = (notification: Notification, systemRole?: string) => {
        const { type, data } = notification;
        const isAdmin = systemRole === "ADMIN" || systemRole === "SUPERADMIN";
        const base = isAdmin ? "/admin" : "/dashboard";

        switch (type) {
            case NotificationType.NEW_MESSAGE:
                return `${base}/messages/${data?.connectionId || ""}`;
            case NotificationType.CONNECTION_REQUEST:
                return isAdmin ? "/admin/membership-center" : "/dashboard/messages?tab=pending";
            case NotificationType.CONNECTION_ACCEPTED:
                return isAdmin ? "/admin/membership-center" : `/dashboard/network/${data?.partnerId || ""}`;
            case NotificationType.SUBSCRIPTION_RENEWAL:
            case NotificationType.SUBSCRIPTION_EXPIRING:
            case NotificationType.SUBSCRIPTION_DOWNGRADE:
                return isAdmin ? "/admin/revenue" : `/dashboard/settings`;
            case NotificationType.EVENT_REMINDER:
                return isAdmin ? `/admin/events/${data?.eventId || ""}` : `/dashboard/events/${data?.eventId || ""}`;
            case NotificationType.SYSTEM_ALERT:
            case NotificationType.SYSTEM_ANNOUNCEMENT:
                return isAdmin ? "/admin" : "/dashboard";
            case NotificationType.VOLUNTEER_ROLE:
                return isAdmin ? "/admin/volunteers" : "/dashboard/volunteers";
            default:
                return isAdmin ? "/admin" : "/dashboard";
        }
    };

    const activeNotifications = (notifications || []).filter(n => !n.dismissedAt);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-tatt-lime/10 text-tatt-lime' : 'text-foreground hover:bg-black/5  hover:text-tatt-lime'}`}
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-4 bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-surface flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-border flex items-center justify-between bg-black/5">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-[10px] bg-tatt-lime text-black px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                    New
                                </span>
                            )}
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-black/10 rounded-full transition-colors"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {activeNotifications.length === 0 ? (
                            <div className="py-12 px-4 text-center">
                                <div className="size-12 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="size-6 text-tatt-gray/40" />
                                </div>
                                <p className="text-tatt-gray font-medium">All caught up!</p>
                                <p className="text-xs text-tatt-gray/60 mt-1">No new notifications at the moment.</p>
                            </div>
                        ) : (
                            activeNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-border/50 flex gap-4 transition-colors hover:bg-black/5 group relative ${!notification.readAt ? 'bg-tatt-lime/[0.03]' : ''}`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${!notification.readAt ? 'bg-white shadow-sm ring-1 ring-tatt-lime/20' : 'bg-black/5'}`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={getLink(notification, user?.systemRole)}
                                            onClick={() => {
                                                markAsRead(notification.id);
                                                setIsOpen(false);
                                            }}
                                            className="block cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <p className={`text-sm font-bold truncate ${!notification.readAt ? 'text-foreground' : 'text-tatt-gray'}`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-tatt-gray whitespace-nowrap shrink-0 italic">
                                                    {formatDistanceToNow(safeDate(notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-tatt-gray line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                        </Link>

                                        <div className="mt-3 flex items-center gap-3">
                                            {getLink(notification, user?.systemRole) !== "#" && (
                                                <Link
                                                    href={getLink(notification, user?.systemRole)}
                                                    onClick={() => {
                                                        markAsRead(notification.id);
                                                        setIsOpen(false);
                                                    }}
                                                    className="text-[10px] font-bold text-tatt-lime hover:underline uppercase tracking-widest"
                                                >
                                                    View Details
                                                </Link>
                                            )}
                                            {!notification.readAt && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-tatt-gray hover:text-foreground uppercase tracking-widest"
                                                >
                                                    <Check className="size-3" />
                                                    Mark as Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => dismiss(notification.id)}
                                            className="p-1.5 text-tatt-gray hover:text-red-500 rounded-lg hover:bg-red-50"
                                            title="Clear"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {activeNotifications.length > 0 && (
                        <div className="p-3 bg-black/5 border-t border-border flex items-center justify-center">
                            <button
                                className="text-[11px] font-black uppercase tracking-[0.2em] text-tatt-gray hover:text-tatt-lime transition-colors"
                                onClick={markAllRead}
                            >
                                Mark All as Read
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
