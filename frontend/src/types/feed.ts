export type FeedFilter = "ALL" | "CHAPTER" | "PREMIUM";

export type PostAuthor = {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
    communityTier: string;
    tattMemberId: string;
};

export type PostChapter = {
    id: string;
    name: string;
    code: string;
} | null;

export type FeedPost = {
    id: string;
    type: string;
    isPremium: boolean;
    isPremiumLocked: boolean;
    title: string | null;
    content: string | null;
    contentFormat: string;
    mediaUrls: string[];
    tags: string[];
    author: PostAuthor;
    chapter: PostChapter;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    createdAt: string;
    updatedAt: string;
    jobLink?: string;
    jobLocation?: string;
    jobCompany?: string;
    eventType?: string | null;
    eventDate?: string | null;
    eventUrl?: string | null;
    topic?: { id: string; name: string } | null;
};

export type FeedMeta = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type FeedResponse = {
    data: FeedPost[];
    meta: FeedMeta;
    message?: string;
};
