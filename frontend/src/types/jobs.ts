/** Job listing from GET /jobs */
export interface JobListing {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string | null;
  companyWebsite?: string | null;
  location: string;
  salaryLabel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  type: string;
  category: string;
  description?: string | null;
  requirements?: string | null;
  qualifications?: string | null;
  isNew?: boolean;
  isActive?: boolean;
  source?: string;
  externalId?: string | null;
  externalUrl?: string | null;
  region?: string | null;
  postedById?: string | null;
  postedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    communityTier: string;
    businessName?: string | null;
    businessRole?: string | null;
    businessProfileLink?: string | null;
    industry?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobsResponse {
  data: JobListing[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface MarketInsights {
  topCategory: { name: string; growth: string } | null;
  salaryTrend: { avg: number; label: string };
  topEmployers: { name: string; initials: string }[];
}

export const JOB_CATEGORIES = [
  "Technology & Software",
  "Finance & Banking",
  "Agriculture & Agribusiness",
  "Healthcare & Medicine",
  "Operations & Logistics",
  "Non-Profit & Social Impact",
  "Sales & Marketing",
  "Legal & Public Policy",
  "Education & Academia",
  "Other Opportunities",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export interface ApplyJobPayload {
  fullName: string;
  email: string;
  phone?: string | undefined;
  resumeUrl?: string | undefined;
  coverLetter?: string | undefined;
}

