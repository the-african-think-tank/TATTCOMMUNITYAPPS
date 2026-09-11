import { JobCategoryClassifierService } from './job-category-classifier.service';

describe('JobCategoryClassifierService', () => {
    let service: JobCategoryClassifierService;

    beforeEach(() => {
        service = new JobCategoryClassifierService();
    });

    describe('Multi-Sector Classification (No Tech-Only Bias)', () => {
        it('should classify healthcare and medical roles', () => {
            expect(service.classifyCategory('Clinical Care Coordinator')).toBe('Healthcare & Medicine');
            expect(service.classifyCategory('Senior Registered Nurse')).toBe('Healthcare & Medicine');
            expect(service.classifyCategory('Public Health Specialist')).toBe('Healthcare & Medicine');
        });

        it('should classify agriculture, climate and energy roles', () => {
            expect(service.classifyCategory('Senior Agronomist')).toBe('Agriculture & Agribusiness');
            expect(service.classifyCategory('Solar Field Operations Lead')).toBe('Agriculture & Agribusiness');
            expect(service.classifyCategory('Soil Health Scientist')).toBe('Agriculture & Agribusiness');
        });

        it('should classify non-profit, NGO and development roles', () => {
            expect(service.classifyCategory('Country Program Officer')).toBe('Non-Profit & Social Impact');
            expect(service.classifyCategory('Monitoring and Evaluation (M&E) Specialist')).toBe('Non-Profit & Social Impact');
            expect(service.classifyCategory('Community Outreach Coordinator')).toBe('Non-Profit & Social Impact');
        });

        it('should classify finance and accounting roles', () => {
            expect(service.classifyCategory('Senior Accountant')).toBe('Finance & Banking');
            expect(service.classifyCategory('Credit Risk Underwriter')).toBe('Finance & Banking');
            expect(service.classifyCategory('Financial Analyst')).toBe('Finance & Banking');
        });

        it('should classify operations and administrative roles', () => {
            expect(service.classifyCategory('Executive Assistant')).toBe('Operations & Logistics');
            expect(service.classifyCategory('Office & Facilities Manager')).toBe('Operations & Logistics');
            expect(service.classifyCategory('Logistics & Procurement Officer')).toBe('Operations & Logistics');
        });

        it('should classify education and teaching roles', () => {
            expect(service.classifyCategory('Curriculum Developer')).toBe('Education & Academia');
            expect(service.classifyCategory('Lead High School Teacher')).toBe('Education & Academia');
        });

        it('should classify engineering and tech roles', () => {
            expect(service.classifyCategory('Software Engineer')).toBe('Technology & Software');
            expect(service.classifyCategory('Data Analyst')).toBe('Technology & Software');
        });

        it('should classify legal and policy roles', () => {
            expect(service.classifyCategory('General Counsel')).toBe('Legal & Public Policy');
            expect(service.classifyCategory('Public Policy Specialist')).toBe('Legal & Public Policy');
        });

        it('should classify sales and marketing roles', () => {
            expect(service.classifyCategory('Growth Marketing Manager')).toBe('Sales & Marketing');
            expect(service.classifyCategory('Business Development Lead')).toBe('Sales & Marketing');
        });
    });

    describe('Employment Type Heuristic', () => {
        it('should detect internships', () => {
            expect(service.classifyEmploymentType('Data Science Intern')).toBe('Internship');
            expect(service.classifyEmploymentType('Summer 2026 Fellowship')).toBe('Internship');
        });

        it('should detect contracts', () => {
            expect(service.classifyEmploymentType('Agronomy Field Specialist (Contract)')).toBe('Contract');
            expect(service.classifyEmploymentType('Temporary Administrative Assistant')).toBe('Contract');
        });

        it('should detect part-time', () => {
            expect(service.classifyEmploymentType('Part-Time Nurse Educator')).toBe('Part-time');
        });

        it('should default cleanly to Full-time', () => {
            expect(service.classifyEmploymentType('Country Director')).toBe('Full-time');
            expect(service.classifyEmploymentType('Financial Controller')).toBe('Full-time');
        });
    });

    describe('Content Fingerprinting', () => {
        it('should generate consistent SHA-256 fingerprint', () => {
            const fp1 = service.generateFingerprint('Moniepoint Inc', 'Data Engineer', 'Africa');
            const fp2 = service.generateFingerprint('moniepoint-inc', 'data-engineer', 'Africa');
            expect(fp1).toBe(fp2);
            expect(fp1.length).toBe(64);
        });

        it('should produce different fingerprints for different companies or titles', () => {
            const fp1 = service.generateFingerprint('Moniepoint', 'Data Engineer', 'Africa');
            const fp2 = service.generateFingerprint('One Acre Fund', 'Data Engineer', 'Africa');
            expect(fp1).not.toBe(fp2);
        });
    });
});
