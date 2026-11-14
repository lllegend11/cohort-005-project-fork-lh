# Notification delivery: Postmark alone vs a notification-orchestration service

Research for wayfinder ticket #6 (map #4). Facts and trade-offs only; no decision is made here.
Researched 2026-11-14 from vendor pages (pricing changes; re-check before committing). Terms follow `GLOSSARY.md` (a **Notification** is a message to one recipient).

Cadence today: React Router app, one SQLite file via Drizzle (`docs/adr/0006-one-sqlite-file-through-drizzle.md`), inline transactional email via Postmark's "outbound" stream (`app/lib/mailer.server.ts`, per the map; not re-read here).

## 1. Postmark (what it covers)

| Area | Finding | Source |
|---|---|---|
| Streams | Three types: Transactional ("automated, non-promotional"), Broadcast ("marketing and bulk"), Inbound. A server has up to 10 streams incl. defaults; only 1 inbound. Separate infrastructure per stream protects deliverability. | https://postmarkapp.com/developer/api/message-streams-api ; https://postmarkapp.com/pricing |
| Unsubscribe handling | Per stream: None (default for transactional), Postmark-managed (default and required for broadcast), Custom (approved accounts only). Postmark-managed unsubscribe therefore exists only on broadcast streams. | message-streams-api page above |
| Content rules | The Terms of Service apply the same prohibited-content list to all streams and require spam-complaint rate < 0.1% and bounce rate < 10%; they do not draw a transactional-vs-marketing line. The stream docs describe transactional as non-promotional. The support article that spells out the boundary returned 404, so confirm it before routing digest-style mail through transactional. | https://postmarkapp.com/terms-of-service |
| Templates | Mustachio templates (variables, conditionals), layout templates, `sendWithTemplate` and `batchWithTemplates` (500 per call). Max 100 templates per server. | https://postmarkapp.com/developer/api/templates-api |
| Batch API | Up to 500 messages per call, 50 MB payload. | https://postmarkapp.com/developer/user-guide/send-email-with-api/batch-emails |
| Webhooks | Delivery, Bounce, Spam Complaint, Open, Click, Subscription Change, Inbound. Retries 5xx/408/429/network failures over 6 attempts (1 to 15 min); 4xx is not retried. Auth by IP allowlist or basic auth in the URL. Docs advise idempotency on `MessageID`. | https://postmarkapp.com/developer/webhooks/webhooks-overview |
| Suppressions | Per stream; reasons HardBounce, SpamComplaint, ManualSuppression. API to list/create/delete (50 per request). SpamComplaint suppressions cannot be deleted. | https://postmarkapp.com/developer/api/suppressions-api |
| Pricing | Free 100 emails/mo. Basic $15/mo (10k, $1.80 per extra 1k, 45-day retention). Pro $16.50 (10k, $1.30/1k, up to 365-day retention). Platform $18. No tier between 100 and 10k; no rollover. | https://postmarkapp.com/pricing |

Not in Postmark at all: an in-app inbox, per-recipient preference storage or UI, event-to-Notification fan-out, digest/batching logic (it sends what it is given), scheduling. A Notification record, preferences and unread state would live in Cadence's SQLite. Postmark's bounce/complaint webhooks are the signal Cadence would persist (e.g. a suppression flag) so it stops emailing that recipient.

## 2. Orchestration services

| | Knock | Novu | Courier |
|---|---|---|---|
| In-app inbox | Feeds (per-user lists, real-time via WebSocket, read/seen/archive, badge counts); React components plus lower-level APIs. https://docs.knock.app/in-app-ui/overview | `<Inbox />` React component (React 18+), composable parts (Bell, Notifications, Preferences), plus headless `@novu/react` / `@novu/js`. https://docs.novu.co/platform/inbox/overview | Inbox, Toasts and Preference Center components; React, Vue, Angular, web components; JWT auth. https://www.courier.com/docs/platform/inbox/inbox-overview |
| Preferences | `PreferenceSet` JSON of opted-out channels, categories, workflows; hosted preference center or custom UI. https://docs.knock.app/concepts/preferences | Preferences part of Inbox UI | Preference Center component (topics and frequency) |
| Batching / digests | Batch and digest on all plans (pricing page); batch concept page returned 404 | Digest windows on paid tiers (pricing page) | Not confirmed in fetched pages |
| Email provider | Postmark channel: API key + from address, optional webhooks mapping delivered/bounced/complaint; payload override can pick a message stream. https://docs.knock.app/integrations/email/postmark | Postmark provider (server token + sender); 60+ providers. https://docs.novu.co/platform/integrations/email/postmark | Postmark (token + from address); overrides allow MessageStream and Postmark native templates; failover to other providers. https://www.courier.com/docs/external-integrations/email/postmark |
| Pricing at small scale | Free: 10,000 messages/mo. Starter $250/mo incl. 50k, then $0.005/message. https://knock.app/pricing | Free: 10,000 workflow runs/mo, 5 workflows, 24 h activity-feed retention, 3 members. Pro from $30/mo (30k runs). https://novu.co/pricing | Free: 10,000 sends/mo. Then $0.005/send; multi-channel counts as one send. https://www.courier.com/pricing |
| Self-host | Not found in pages fetched; treat as SaaS | Yes (open source). Single VM 4 vCPU/8 GB or multi-VM; needs MongoDB (Atlas M20+ recommended), Redis, S3-compatible storage. Docs say self-hosted lacks Inbox, activity tracking, SSO, RBAC; pricing page lists self-host under Enterprise. https://docs.novu.co/community/self-hosting-novu/overview | SaaS |
| Data residency | Not verified | Cloud regions US, EU, Singapore, UK, Australia, Japan, South Korea (pricing page) | Not verified |

Common points: all keep your email provider account; the orchestrator calls Postmark with your token and Postmark still bills delivery. Each needs recipient identity (and email address) synced to it, and the inbox UI talks to the vendor's servers, so Notification state, read state and preferences live outside the Cadence SQLite file.

## 3. Other option: Resend

Email API with transactional and marketing products: free 3,000 emails/mo (100/day), Pro from $20/mo; marketing plans priced by contacts (free 1,000 contacts). Email only as far as the pricing page shows (no in-app inbox). Switching would replace Postmark rather than solve the in-app half. Source: https://resend.com/pricing. Not investigated further.

## 4. Comparison

| Concern | Postmark only | Postmark + Knock / Novu / Courier |
|---|---|---|
| Email delivery, bounce/complaint webhooks, suppression, templates | Provided | Still Postmark (orchestrator calls it) |
| In-app inbox (list, unread, read/archive, real-time) | Build: table in SQLite + loader/action + polling or SSE | Provided by vendor component/SDK |
| Preferences (storage, UI, enforcement per channel/type) | Build | Provided |
| Fan-out of one happening to many Notifications | Build in app code | Workflows/topics provided |
| Digests / batching | Build; needs a scheduler (no queue infra under ADR 0006) | Provided (Knock all plans; Novu paid tiers) |
| Retries / background sending | Build around SQLite (outbox table + poller) | Vendor queue |
| Cost at small scale | $0 up to 100 emails/mo, then $15/mo for 10k | Orchestrator free tier (10k) + Postmark; paid tiers from $30 (Novu), $250 (Knock) or $0.005/send (Courier) |
| Single-SQLite-file fit (ADR 0006) | Best: Notification record, read state and preferences stay in the one file, queryable with Drizzle | Splits state across vendor and SQLite; needs user sync, a signed-token endpoint for the inbox, webhooks; lock-in on workflows and templates. Novu self-host adds MongoDB + Redis, against the spirit of ADR 0006 |
| No-fatigue principle | Enforced by Cadence's own code | Preferences and digests help, but the trigger catalogue decides fatigue regardless of tool |

## 5. Open facts to verify before deciding

- Postmark's own definition of what may go in a transactional stream versus broadcast (support article not reachable); matters if any digest or nudge is promotional-adjacent.
- Courier digest/batching, and Knock self-host and data residency, were not confirmed.
- Pages were read through a summarizing fetcher; verify figures on the live pages.
