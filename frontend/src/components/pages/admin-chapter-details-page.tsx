"use client";

import { useParams } from "next/navigation";
import { RegionalDirectorDashboard } from "@/components/pages/regional-director-dashboard";

export function AdminChapterDetailsPage() {
    const { chapterId } = useParams();
    return (
        <RegionalDirectorDashboard
            initialChapterId={typeof chapterId === 'string' ? chapterId : undefined}
            isSuperAdminView={true}
        />
    );
}
