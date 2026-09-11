import { Injectable } from '@nestjs/common';

export interface LocationMatchResult {
    isMatch: boolean;
    region: 'US' | 'Africa' | 'Other';
    matchedLocation?: string;
}

@Injectable()
export class LocationFilterService {
    // 54 African nations and territories
    private readonly africanCountries = [
        'algeria', 'angola', 'benin', 'botswana', 'burkina faso', 'burundi', 'cabo verde', 'cape verde',
        'cameroon', 'central african republic', 'chad', 'comoros', 'congo', 'democratic republic of the congo',
        'dr congo', 'drc', 'djibouti', 'egypt', 'equatorial guinea', 'eritrea', 'eswatini', 'swaziland',
        'ethiopia', 'gabon', 'gambia', 'the gambia', 'ghana', 'guinea', 'guinea-bissau', 'ivory coast',
        'cote d\'ivoire', 'kenya', 'lesotho', 'liberia', 'libya', 'madagascar', 'malawi', 'mali',
        'mauritania', 'mauritius', 'morocco', 'mozambique', 'namibia', 'niger', 'nigeria', 'rwanda',
        'sao tome and principe', 'senegal', 'seychelles', 'sierra leone', 'somalia', 'south africa',
        'south sudan', 'sudan', 'tanzania', 'togo', 'tunisia', 'uganda', 'zambia', 'zimbabwe'
    ];

    // Major African tech and economic hub cities
    private readonly africanHubs = [
        'lagos', 'abuja', 'nairobi', 'mombasa', 'accra', 'kumasi', 'johannesburg', 'cape town',
        'durban', 'cairo', 'alexandria', 'kigali', 'casablanca', 'rabat', 'addis ababa', 'dakar',
        'kampala', 'dar es salaam', 'arusha', 'lusaka', 'harare', 'algiers', 'tunis', 'maputo',
        'windhoek', 'gaborone', 'luanda', 'yaounde', 'douala', 'kinshasa', 'abidjan'
    ];

    // 50 US States (Full names)
    private readonly usStates = [
        'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
        'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
        'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
        'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
        'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
        'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
        'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
        'wisconsin', 'wyoming', 'district of columbia', 'puerto rico'
    ];

    // US State 2-letter postal codes (matched as standalone words or after comma e.g. "Austin, TX")
    private readonly usStateCodes = new Set([
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
        'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
        'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
        'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR'
    ]);

    // Major US Metropolitan Cities
    private readonly usMajorCities = [
        'san francisco', 'new york city', 'los angeles', 'chicago', 'houston', 'phoenix',
        'philadelphia', 'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
        'fort worth', 'columbus', 'charlotte', 'indianapolis', 'seattle', 'denver', 'washington dc',
        'boston', 'el paso', 'nashville', 'detroit', 'oklahoma city', 'portland', 'las vegas',
        'memphis', 'louisville', 'baltimore', 'milwaukee', 'albuquerque', 'tucson', 'fresno',
        'sacramento', 'mesa', 'kansas city', 'atlanta', 'omaha', 'colorado springs', 'raleigh',
        'long beach', 'virginia beach', 'miami', 'oakland', 'minneapolis', 'tulsa', 'tampa',
        'arlington', 'new orleans', 'wichita', 'cleveland', 'bakersfield', 'aurora', 'anaheim',
        'honolulu', 'santa ana', 'riverside', 'corpus christi', 'lexington', 'stockton',
        'st. paul', 'cincinnati', 'irvine', 'greensboro', 'pittsburgh', 'st. louis', 'orlando'
    ];

    // Global / Worldwide remote phrases
    private readonly globalRemoteKeywords = [
        'worldwide', 'anywhere', 'global remote', 'remote - worldwide', 'remote (worldwide)',
        'remote - global', 'remote (global)', 'remote - anywhere'
    ];

    // Explicit exclusions (to avoid false positives when a description mentions a US office alongside an EU-only role)
    private readonly exclusionRegions = [
        'united kingdom', 'london, uk', 'germany', 'berlin', 'france', 'paris', 'netherlands',
        'amsterdam', 'australia', 'sydney', 'melbourne', 'india', 'bengaluru', 'bangalore',
        'singapore', 'japan', 'tokyo', 'brazil', 'sao paulo', 'poland', 'warsaw', 'spain', 'madrid',
        'ireland', 'dublin', 'canada', 'toronto', 'vancouver'
    ];

    /**
     * Evaluates a raw location string or office array to determine whether the role is in the US, Africa, or Global Remote.
     */
    classifyLocation(rawLocation?: string, offices?: Array<{ name?: string; location?: string }>): LocationMatchResult {
        const fullLocationText = [
            rawLocation ?? '',
            ...(offices?.map(o => `${o.name ?? ''} ${o.location ?? ''}`) ?? [])
        ].join(' ').trim();

        if (!fullLocationText) {
            return { isMatch: false, region: 'Other' };
        }

        const lower = fullLocationText.toLowerCase();

        // 1. Check for Africa match
        for (const country of this.africanCountries) {
            if (this.containsWord(lower, country)) {
                return { isMatch: true, region: 'Africa', matchedLocation: country };
            }
        }
        for (const hub of this.africanHubs) {
            if (this.containsWord(lower, hub)) {
                return { isMatch: true, region: 'Africa', matchedLocation: hub };
            }
        }
        if (this.containsWord(lower, 'africa') || this.containsWord(lower, 'sub-saharan africa')) {
            return { isMatch: true, region: 'Africa', matchedLocation: 'Africa' };
        }

        // 2. Check for United States match
        if (
            this.containsWord(lower, 'united states') ||
            this.containsWord(lower, 'usa') ||
            this.containsWord(lower, 'u.s.') ||
            this.containsWord(lower, 'u.s.a.') ||
            lower.includes('remote - us') ||
            lower.includes('remote (us)') ||
            lower.includes('us remote')
        ) {
            return { isMatch: true, region: 'US', matchedLocation: 'United States' };
        }

        for (const state of this.usStates) {
            if (this.containsWord(lower, state)) {
                return { isMatch: true, region: 'US', matchedLocation: state };
            }
        }

        for (const city of this.usMajorCities) {
            if (this.containsWord(lower, city)) {
                return { isMatch: true, region: 'US', matchedLocation: city };
            }
        }

        // If text explicitly mentions foreign exclusions without any US/Africa mention, reject early
        const hasExplicitUS = this.containsWord(lower, 'united states') || this.containsWord(lower, 'usa');
        if (!hasExplicitUS) {
            for (const excl of this.exclusionRegions) {
                if (this.containsWord(lower, excl)) {
                    return { isMatch: false, region: 'Other' };
                }
            }
        }

        // Check for 2-letter state codes: e.g. "San Francisco, CA" or "Austin, TX"
        const stateCodePattern = /[,/\s]\s*([A-Z]{2})(?:\s*[,/\d-]|\s*$)/g;
        let match: RegExpExecArray | null;
        while ((match = stateCodePattern.exec(fullLocationText)) !== null) {
            const code = match[1];
            if (this.usStateCodes.has(code)) {
                return { isMatch: true, region: 'US', matchedLocation: code };
            }
        }

        // Roles not explicitly in US or Africa (including global/worldwide remote) are out of scope for now
        return { isMatch: false, region: 'Other' };
    }

    private containsWord(text: string, word: string): boolean {
        const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
        return regex.test(text);
    }

    private escapeRegex(str: string): string {
        return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
}
