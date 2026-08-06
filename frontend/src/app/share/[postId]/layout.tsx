import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
    const { postId } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
    
    try {
        const res = await fetch(`${backendUrl}/feed/${postId}`, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            return {
                title: "Strategic Insight | The African Think Tank",
                description: "Explore high-impact strategic insights from top leaders in The African Think Tank network.",
            };
        }

        const post = await res.json();
        const authorName = post.author ? `${post.author.firstName} ${post.author.lastName}` : "TATT Member";
        const cleanContent = post.content ? post.content.replace(/<[^>]*>?/gm, "").substring(0, 160) : "";
        const title = post.title || `${authorName} on TATT: Strategic Insight`;
        const description = cleanContent || `Strategic insight shared by ${authorName} in The African Think Tank.`;
        const ogImage = post.mediaUrls && post.mediaUrls.length > 0 
            ? post.mediaUrls[0] 
            : post.author?.profilePicture || "/assets/tatt_profile_banner.png";

        return {
            title: `${title} | The African Think Tank`,
            description,
            openGraph: {
                title,
                description,
                type: "article",
                url: `/share/${postId}`,
                siteName: "The African Think Tank",
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                images: [ogImage],
            },
        };
    } catch {
        return {
            title: "Strategic Insight | The African Think Tank",
            description: "Explore high-impact strategic insights from top leaders in The African Think Tank network.",
        };
    }
}

export default function SharePostLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
