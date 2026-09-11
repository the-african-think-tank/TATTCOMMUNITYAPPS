# TATT Community Apps

The official platform connecting, empowering, and providing economic, career, and networking opportunities for the African Think Tank community across Africa and the global diaspora.

## Language

### Jobs & Ingestion

**Job Listing**:
An employment opportunity stored in the database and presented to community members.
_Avoid_: Vacancy, job post, position listing

**Job Source**:
An external ATS or platform from which job opportunities are harvested.
_Avoid_: Job board provider, crawl origin

**Board Token**:
The unique public slug identifying an organization's specific Greenhouse job board.
_Avoid_: Company key, ATS slug, board ID

**Harvest**:
The automated process of fetching, normalizing, filtering, and syncing job listings from an external source.
_Avoid_: Crawl, scrape, batch pull

**Fingerprint**:
A deterministic hash computed from a role's normalized company, title, and region to prevent cross-source duplicates.
_Avoid_: Deduplication key, signature, unique hash
