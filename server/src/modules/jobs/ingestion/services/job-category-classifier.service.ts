import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class JobCategoryClassifierService {
    /**
     * Determines employment type ('Full-time', 'Part-time', 'Contract', 'Internship')
     * scanning title, metadata, and description. Defaults cleanly to 'Full-time'.
     */
    classifyEmploymentType(title: string, rawType?: string, description?: string): string {
        const text = `${title} ${rawType ?? ''} ${(description ?? '').slice(0, 500)}`.toLowerCase();

        if (text.includes('intern') || text.includes('internship') || text.includes('apprentice') || text.includes('fellowship')) {
            return 'Internship';
        }
        if (text.includes('contract') || text.includes('contractor') || text.includes('temporary') || text.includes('temp role')) {
            return 'Contract';
        }
        if (text.includes('part-time') || text.includes('part time')) {
            return 'Part-time';
        }
        return 'Full-time';
    }

    public static readonly CANONICAL_CATEGORIES = [
        'Technology & Software',
        'Finance & Banking',
        'Agriculture & Agribusiness',
        'Healthcare & Medicine',
        'Operations & Logistics',
        'Non-Profit & Social Impact',
        'Sales & Marketing',
        'Legal & Public Policy',
        'Education & Academia',
        'Other Opportunities',
    ] as const;

    /**
     * Categorizes jobs across TATT's 10 canonical industry categories.
     * Eliminates rogue company department names from the primary category.
     */
    classifyCategory(title: string, departmentName?: string): string {
        const text = `${title} ${departmentName ?? ''}`.toLowerCase();

        // 1. Agriculture & Agribusiness
        if (
            this.matchesAny(text, [
                'agri', 'agronomy', 'agronomist', 'crop', 'soil', 'farm', 'farming', 'solar',
                'renewable', 'clean energy', 'climate', 'sustainability', 'environment', 'veterinary',
                'livestock', 'forestry', 'water resource', 'irrigation', 'trees', ' tre -', 'tree planting'
            ])
        ) {
            return 'Agriculture & Agribusiness';
        }

        // 2. Healthcare & Medicine
        if (
            this.matchesAny(text, [
                'nurse', 'nursing', 'doctor', 'physician', 'medical', 'clinical', 'pharmacy',
                'pharmacist', 'therapist', 'patient', 'healthcare', 'care coordinator',
                'radiology', 'epidemiologist', 'biochemist', 'hospital', 'public health', 'mental health', 'health'
            ])
        ) {
            return 'Healthcare & Medicine';
        }

        // 3. Finance & Banking
        if (
            this.matchesAny(text, [
                'accountant', 'accounting', 'auditor', 'audit', 'finance', 'financial', 'banker',
                'banking', 'credit', 'underwriter', 'treasury', 'tax', 'payroll', 'investment',
                'wealth management', 'actuary', 'controller', 'fintech', 'mfb', 'moniebook'
            ])
        ) {
            return 'Finance & Banking';
        }

        // 4. Non-Profit & Social Impact
        if (
            this.matchesAny(text, [
                'ngo', 'non-profit', 'nonprofit', 'social impact', 'program officer', 'program manager',
                'mne', 'monitoring and evaluation', 'monitoring, evaluation', 'community development',
                'grant', 'humanitarian', 'peacebuilding', 'field coordinator', 'outreach', 'government services', 'gsv'
            ])
        ) {
            return 'Non-Profit & Social Impact';
        }

        // 5. Legal & Public Policy
        if (
            this.matchesAny(text, [
                'legal', 'counsel', 'attorney', 'paralegal', 'compliance', 'regulatory',
                'public policy', 'policy', 'government relations', 'grl', 'advocacy'
            ])
        ) {
            return 'Legal & Public Policy';
        }

        // 6. Education & Academia
        if (
            this.matchesAny(text, [
                'teacher', 'teaching', 'instructor', 'professor', 'faculty', 'curriculum',
                'academic', 'principal', 'tutor', 'educator', 'school', 'advising', 'counselor',
                'education', 'training'
            ])
        ) {
            return 'Education & Academia';
        }

        // 7. Technology & Software
        if (
            this.matchesAny(text, [
                'software', 'engineer', 'engineering', 'developer', 'frontend', 'backend',
                'full stack', 'devops', 'cloud', 'data scientist', 'data analyst', 'data engineer',
                'data analytics', 'cybersecurity', 'security analyst', 'product manager', 'ui/ux', 'designer',
                'product design', 'architect', 'qa', 'system administrator', 'hardware', 'flight sw',
                'application sw', 'platform eng', 'it support', 'technology'
            ])
        ) {
            return 'Technology & Software';
        }

        // 8. Operations & Logistics
        if (
            this.matchesAny(text, [
                'admin', 'administrator', 'administrative', 'executive assistant', 'office',
                'office manager', 'operations', 'ops', 'procurement', 'logistics', 'supply chain',
                'warehouse', 'facility', 'facilities', 'fleet', 'dispatch', 'receptionist',
                'inventory', 'technician', 'maintenance', 'visual observer', 'uav', 'uas'
            ])
        ) {
            return 'Operations & Logistics';
        }

        // 9. Sales & Marketing
        if (
            this.matchesAny(text, [
                'sales', 'account executive', 'business development', 'marketing', 'mkt', 'growth',
                'brand', 'communications', 'public relations', 'pr manager', 'customer support',
                'customer service', 'client success', 'customer experience', 'content creator',
                'market access', 'commercial', 'partnerships'
            ])
        ) {
            return 'Sales & Marketing';
        }

        return 'Other Opportunities';
    }

    /**
     * Generates a deterministic SHA-256 fingerprint for cross-source deduplication.
     * Normalized: lower(company) + ':' + lower(title) + ':' + region
     */
    generateFingerprint(companyName: string, title: string, region: string): string {
        const cleanCompany = this.slugify(companyName);
        const cleanTitle = this.slugify(title);
        const cleanRegion = this.slugify(region);
        const raw = `${cleanCompany}:${cleanTitle}:${cleanRegion}`;
        return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
    }

    private matchesAny(text: string, keywords: string[]): boolean {
        return keywords.some(k => text.includes(k));
    }

    private slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}
