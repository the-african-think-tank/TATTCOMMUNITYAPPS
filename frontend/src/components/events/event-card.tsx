"use client";

import Link from "next/link";
import { MapPin, Clock, Users, Video, User } from "lucide-react";
import type { EventItem } from "@/types/events";

type EventCardProps = {
    event: EventItem;
    /** e.g. "FILLING FAST" for waitlist urgency */
    highlight?: string | null;
};

import dayjs, { formatLocalTime } from "@/lib/dayjs";

function formatDateShort(dateTime: string) {
    try {
        return dayjs(dateTime).format("MMM D").toUpperCase();
    } catch {
        return "";
    }
}

function formatTime(dateTime: string) {
    return formatLocalTime(dateTime);
}

function typeLabel(type: string): string {
    switch (type) {
        case "WORKSHOP": return "REGIONAL";
        case "MIXER": return "MIXER";
        case "EVENT": return "INTENSIVE";
        default: return type;
    }
}

function typeTagClass(type: string): string {
    switch (type) {
        case "WORKSHOP": return "bg-tatt-green-deep text-tatt-white";
        case "MIXER": return "bg-tatt-lime text-tatt-black";
        case "EVENT": return "bg-tatt-lime-dark text-tatt-white";
        default: return "bg-tatt-gray text-tatt-white";
    }
}

export function EventCard({ event, highlight }: EventCardProps) {
    const dateStr = formatDateShort(event.dateTime);
    const timeStr = formatTime(event.dateTime);
    const firstLocation = event.locations?.[0];
    const address = firstLocation?.address ?? "Virtual Event";
    const isVirtual = address.toLowerCase().includes("zoom") || address.toLowerCase().includes("virtual");
    const leadGuest = event.featuredGuests?.[0];
    const registrationCount = Array.isArray(event.registrations) ? event.registrations.length : 0;

    return (
        <article className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            {/* Image + date/type tags */}
            <div className="relative aspect-[16/10] sm:aspect-video bg-tatt-black overflow-hidden">
                {event.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={event.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full bg-cover bg-center"
                        style={{
                            backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600')",
                        }}
                    />
                )}
                <div className="absolute top-3 left-3">
                    <span className="bg-tatt-black text-tatt-white text-xs font-bold px-2 py-1 rounded">
                        {dateStr}
                    </span>
                </div>
                <div className="absolute top-3 right-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${typeTagClass(event.type)}`}>
                        {typeLabel(event.type)}
                    </span>
                </div>
                {highlight && (
                    <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-tatt-lime text-xs font-medium italic">⏳ {highlight}</span>
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-5 flex flex-col flex-1">
                <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight mb-3 line-clamp-2">
                    {event.title}
                </h3>

                <div className="space-y-2 text-sm text-tatt-gray">
                    {isVirtual ? (
                        <p className="flex items-center gap-2">
                            <Video className="h-4 w-4 shrink-0 text-tatt-lime" />
                            Virtual Event (Zoom)
                        </p>
                    ) : (
                        <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-tatt-lime" />
                            <span className="line-clamp-1">{address}</span>
                        </p>
                    )}
                    <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 text-tatt-lime" />
                        {timeStr}
                    </p>
                    {leadGuest && (
                        <p className="flex items-center gap-2">
                            <User className="h-4 w-4 shrink-0 text-tatt-lime" />
                            Lead: {leadGuest.firstName} {leadGuest.lastName}
                        </p>
                    )}
                    {registrationCount > 0 && (
                        <p className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0 text-tatt-lime" />
                            {registrationCount} Confirmed
                        </p>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex-1 flex items-end">
                    <Link
                        href={`/dashboard/events/${event.id}`}
                        className="block w-full min-h-[44px] sm:min-h-0 py-2.5 text-center bg-tatt-lime text-tatt-black font-bold rounded-lg text-sm hover:brightness-95 transition-all touch-manipulation"
                    >
                        {event.type === "MIXER" && registrationCount >= 15 ? "Join Waitlist" : "Register"}
                    </Link>
                </div>
            </div>
        </article>
    );
}
