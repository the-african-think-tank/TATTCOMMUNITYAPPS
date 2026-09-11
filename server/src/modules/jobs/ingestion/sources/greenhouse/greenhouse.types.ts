export interface GreenhouseJobRaw {
    id: number | string;
    title: string;
    company_name?: string;
    absolute_url: string;
    content?: string;
    location?: { name?: string };
    offices?: Array<{ id: number; name: string; location: string }>;
    departments?: Array<{ id: number; name: string }>;
    updated_at?: string;
    first_published?: string;
    metadata?: Array<{ name: string; value: any }>;
}

export interface GreenhouseApiResponse {
    jobs: GreenhouseJobRaw[];
}
