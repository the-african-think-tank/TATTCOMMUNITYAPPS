/**
 * Event types matching backend API (GET /events, GET /events/:id).
 * Backend EventType: EVENT | MIXER | WORKSHOP
 */
export type EventType = "EVENT" | "MIXER" | "WORKSHOP";

export type EventLocation = {
    eventId: string;
    chapterId: string;
    address: string;
    chapter?: { id: string; name: string; code: string };
};

export type EventGuest = {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
};

export type EventItem = {
    id: string;
    title: string;
    description: string;
    dateTime: string;
    type: EventType;
    imageUrl?: string | null;
    timezone?: string | null;
    isForAllMembers: boolean;
    targetMembershipTiers?: string[] | null;
    basePrice: number;
    createdAt: string;
    updatedAt: string;
    locations?: EventLocation[];
    featuredGuests?: EventGuest[];
    registrations?: unknown[];
};

/** UI filter: map to backend type or "ALL" */
export type EventFilterTab = "ALL" | "WORKSHOP" | "EVENT" | "MIXER";

export type SortOption = "newest" | "oldest" | "title";
