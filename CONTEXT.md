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

### Billing & Memberships

**Membership Tier**:
The community membership level granted to a member (Free, Ubuntu, Imani, Kiongozi), defining access privileges and permissions.
_Avoid_: Subscription plan, user level, package

**Billing Cycle**:
The recurring cadence of a membership subscription, strictly either Monthly or Yearly.
_Avoid_: Term, frequency, billing period

**Canonical Price**:
A permanent, predefined Stripe Price object representing a specific tier and billing cycle.
_Avoid_: Ad-hoc price, price_data, inline amount

**Auto-Renewing Subscription**:
Every paid membership tier is strictly an automatic recurring subscription. Memberships do not expire at period end; they automatically bill and advance the period end date until explicitly canceled by the member or terminated due to chronic payment failure.
_Avoid_: Manual renewal, prepaid term, expiring account (unless canceled)

**Period End**:
The scheduled date on which Stripe automatically bills the card for the next subscription cycle and advances access.
_Avoid_: Expiration date (for active auto-renewing subscriptions)

**Webhook Signing Secret**:
The cryptographic secret (`whsec_...`) used by the API to verify the authenticity of asynchronous events sent by Stripe.
_Avoid_: Webhook key, callback token


