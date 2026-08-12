# Lead Sourcing

Two sources, feeding the same pipeline (`docs/ARCHITECTURE.md`), tagged separately so they can be measured against each other.

## Source 1: Vibe Prospecting (intent-based) — validated, active

Uses Explorium's `business_intent_topics` signal — a company-level behavioral score indicating a business is showing research/interest around financing topics. This is **not** the same as an applied lead (nobody asked us for money); treat it as "call this business before a random one," not "this person is waiting for our call."

### What we validated (2026-08-12)

- Raw intent-topic search with no size/industry filter returns enterprise noise (Microsoft, Google, GM) — intent topic alone is not enough.
- Adding small-business firmographics (revenue, size) removes the enterprise noise but still returns off-target industries (an SBA lender, ad agencies, consulting firms) — industry targeting is required too.
- Full validated filter (intent topics + right industries + small revenue/size + owner-level contact + has email/phone) narrowed to **~25-29 matching US businesses total** at query time — high quality, too low volume for daily use alone.
- Broadening (more industries, revenue up to $10M, size up to 51-200 employees, job levels down to manager, dropped hard phone requirement) raised the pool to **~178 matching records** — the working default below. One false positive slipped through at this looser setting (a business later acquired by a large conglomerate) — dedupe/review should watch for parent-company subsidiaries.

### Working filter (`config/vibe-query-config.json`)

- `business_intent_topics`: `business finance: merchant cash advances`, `funding & loans: business funding`, `business finance: business loans`, `business finance: working capital finance`, `funding & loans: business credit`
- `linkedin_category`: restaurants, food and beverage services, retail (+ groceries/apparel/sporting goods), construction (+ building/residential/nonresidential), truck transportation (+ freight/rail), vehicle repair and maintenance, retail motor vehicles, automotive, personal care services, wellness and fitness services, cosmetology and barber schools
- `company_country_code`: US
- `company_revenue`: 0-500K, 500K-1M, 1M-5M, 5M-10M
- `company_size`: 1-10, 11-50, 51-200
- `job_level`: owner, founder, president, c-suite, vice president, manager
- `has_email`: true

### Cost

Credit packs (one-time, 365-day validity): $29.90/900 credits, $89.99/3,000, $199.99/8,000, $649.99/30,000. Observed cost ≈2 credits/contact record → roughly **$0.04-0.07/lead** depending on tier. A 20%-off new-user promo code (`WELCOME20`) was available as of 2026-08-12 — check expiry before using.

### Known limits

- This is a **finite snapshot pool**, not an infinite daily feed. Re-running daily surfaces newly-scored businesses at a much slower rate than the current total pool size — expect a trickle (single digits to low tens/day), not hundreds, from this source alone. This is why source 2 exists.
- Company-level intent doesn't guarantee the specific contact pulled is the one researching — it's the best available contact at that company.

## Source 2: UCC filing data — vendor not yet selected

Public UCC-1 filing records identify businesses that have taken secured financing. Cheap, high volume (filings happen daily nationwide), but **the targeting has a trap**:

> Real broker-community feedback (dailyfunder.com forum, not vendor marketing): most MCA funders only file a UCC when there's a payment problem. A UCC list filtered to "secured party = MCA company" skews toward businesses that had trouble with their last MCA — not healthy renewal candidates.

**Decision: target Bank UCC filings and Equipment Finance/Leasing UCC filings, not MCA-secured-party UCC filings.** These signal a business that's actively financing operations and is creditworthy, without the default signal.

### Candidate vendors (not independently verified — see caveat)

MCA Leads Pro, Bull Market Leads, MerchantFinancingLeads (claims lowest cost/record), Lead Tycoons, Klover Data. Independent broker-community review sites (deBanked, dailyfunder) are blocked by this environment's network egress, so vendor reputation here is **not independently verified** — most accessible sources are the vendors' own marketing. Before committing volume: get quotes from 2-3, explicitly request Bank/Equipment UCC (not MCA-secured-party UCC), and order a small paid test batch from each to compare real quality — same discipline used to validate Source 1.

### Status

Blocked on: vendor selection → test batch → pricing/volume confirmed → wire into n8n as second intake.
