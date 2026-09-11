import { LocationFilterService } from './location-filter.service';

describe('LocationFilterService', () => {
    let service: LocationFilterService;

    beforeEach(() => {
        service = new LocationFilterService();
    });

    describe('African Locations', () => {
        it('should match African countries', () => {
            expect(service.classifyLocation('Nairobi, Kenya')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Lagos, Nigeria')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Cape Town, South Africa')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Kigali, Rwanda')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Accra, Ghana')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Remote, Egypt')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
        });

        it('should match African hub cities even without country name', () => {
            expect(service.classifyLocation('Nairobi Hub')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Lagos Office')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
            expect(service.classifyLocation('Johannesburg')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'Africa' })
            );
        });
    });

    describe('United States Locations', () => {
        it('should match full US country and variations', () => {
            expect(service.classifyLocation('United States')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
            expect(service.classifyLocation('Remote - USA')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
            expect(service.classifyLocation('Remote - US')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
        });

        it('should match US states and major cities', () => {
            expect(service.classifyLocation('San Francisco, CA')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
            expect(service.classifyLocation('Austin, Texas')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
            expect(service.classifyLocation('New York, NY • United States')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
            expect(service.classifyLocation('Atlanta, GA')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
            expect(service.classifyLocation('Seattle, Washington')).toEqual(
                expect.objectContaining({ isMatch: true, region: 'US' })
            );
        });
    });

    describe('Global Remote Locations (Out of Scope)', () => {
        it('should reject generic worldwide and global remote positions outside US and Africa', () => {
            expect(service.classifyLocation('Remote - Worldwide')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
            expect(service.classifyLocation('Anywhere')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
        });
    });

    describe('Out of Scope Locations', () => {
        it('should reject Europe, Asia, Australia, and South America', () => {
            expect(service.classifyLocation('London, United Kingdom')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
            expect(service.classifyLocation('Paris, France')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
            expect(service.classifyLocation('Berlin, Germany')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
            expect(service.classifyLocation('Sydney, Australia')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
            expect(service.classifyLocation('Tokyo, Japan')).toEqual(
                expect.objectContaining({ isMatch: false, region: 'Other' })
            );
        });
    });
});
