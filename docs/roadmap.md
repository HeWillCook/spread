# Spread: public launch roadmap

Last updated: 11 November 2026

This is the plan from "works on my laptop" to "a stranger can plan a party and pay for it". It assumes one developer working part-time (10-15 hours a week) and a 12-week runway to public launch. Dates are relative; the order matters more than the calendar.

## 1. Where the app stands

**Working today**

- Host accounts (Better Auth, email and password), multiple hosts per deployment.
- Events with title, time, IANA timezone, location, and a share code.
- Guest RSVP at `/e/[code]` with yes / maybe / no, plus-ones, food notes and a personal edit link.
- Headcount with a configurable share of maybes and a range.
- 29 built-in recipes with per-serving math, package rounding, price estimates and a shopping list.
- Bill split in whole cents, Venmo share links, paid tracking, walk-ins and exclusions.
- Kitchen sheet (copy and print), attendance what-if simulator, reminder text to copy.
- 430+ unit tests, lint, TypeScript, production build and 6 end-to-end tests.

**Not built yet (blocking a real launch)**

- No email or SMS. Invitations and reminders are link-and-copy only.
- No password reset, email verification, or account deletion.
- No cookie, privacy or terms pages.
- No error tracking, uptime monitoring, analytics or backups beyond the database host.
- No user feedback loop, support address or changelog.
- Shopping lines are per dish, so shared ingredients appear twice.
- Venmo is manual by design: the app never confirms a payment.

## 2. Launch shape

Do not launch to the public on day one. Three stages:

1. **Private beta (10-20 hosts you know).** Proves the RSVP loop and the food math on real parties.
2. **Invite beta (100-300 hosts).** Proves email deliverability, support load, and that hosts come back for a second event.
3. **Public.** Opens sign-up, publishes pricing, starts marketing.

The gate between each stage is a metric, not a date. Suggested gates are in section 9.

## 3. Phase 0: production baseline (week 1)

Goal: the current app running on a real domain, with a database you can restore and errors you can see.

### Infrastructure

- [ ] Create a Neon Postgres project (or Supabase). Use the pooled connection string for the app and the direct string for migrations.
- [ ] Create a Vercel project from the repo. Framework preset: Next.js, no custom build command.
- [ ] Set env vars in Vercel for Production and Preview:
  - `DATABASE_URL` (pooled)
  - `DATABASE_POOL_MAX=1`
  - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
  - `BETTER_AUTH_URL=https://your-domain.com` (no trailing slash)
- [ ] Run migrations against the direct connection: `DATABASE_URL="<direct>" npm run db:migrate`.
- [ ] Buy the domain, point it at Vercel, force HTTPS.
- [ ] Confirm the starter recipes seed on first request.

### Safety net

- [ ] Turn on Neon point-in-time restore (7 days is enough to start) and write down the restore steps.
- [ ] Add Sentry (or equivalent) for server and client errors. Set a release tag per deploy.
- [ ] Add an uptime check on `/` and one authenticated page, alerting to your phone.
- [ ] Add Vercel deployment protection for preview URLs.
- [ ] Verify the app refuses to start on PGlite in production (it should) and that `DATABASE_URL` is required.

### CI

- [ ] GitHub Actions on every PR: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] Run the Playwright suite on `main` after merge, not on every PR, to keep it cheap.
- [ ] Add a `main` branch protection rule: no direct pushes, one review or a green self-check.

### Code hygiene

- [ ] Commit the current working tree, tag `v0.1.0`.
- [ ] Add `/api/health` returning app version and a cheap `select 1`.
- [ ] Set security headers in `next.config.ts`: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, a CSP that allows only self plus the analytics and error hosts you chose.
- [ ] Rotate the auth secret once after the first deploy to prove the process works.

**Done when:** a friend can sign up on the real domain, create an event, RSVP from their phone, and you get an alert if the site goes down.

## 4. Phase 1: private beta (weeks 2-3)

Goal: ten real parties, with you watching every one.

### Accounts

- [ ] Password reset by email. Better Auth supports it; you need a transactional email provider first (section 6).
- [ ] Email verification before creating an event. This cuts spam events and protects your sending reputation.
- [ ] Account deletion that removes the host, their events, guests and recipes. Add a `Delete my account` button with a typed confirmation.
- [ ] Session expiry and a "sign out everywhere" action.

### Feedback and support

- [ ] `support@your-domain.com` (or a form) linked in the footer and the dashboard.
- [ ] A one-question feedback prompt after an event date passes: "Did Spread get the food right?"
- [ ] A public changelog page, updated weekly.
- [ ] A 15-minute onboarding call offer for the first ten hosts.

### Operations

- [ ] A runbook in the repo: how to deploy, roll back, restore the database, rotate secrets, and check logs.
- [ ] A staging database separate from production, used for every migration rehearsal.
- [ ] Weekly backup restore drill. A backup you have never restored is a guess.

**Done when:** five hosts have run an event end to end without your help, and the RSVP completion rate (guests who answer) is above 70%.

## 5. Phase 2: the invitation loop (weeks 4-6)

This is the phase that makes the product actually solve the original problem. Everything before it is a nicer spreadsheet.

### Email and reminders

- [ ] Pick a transactional provider: Resend, Postmark or Amazon SES. Resend is the fastest to set up.
- [ ] Set up the sending domain: SPF, DKIM, DMARC, and a dedicated subdomain such as `mail.your-domain.com`.
- [ ] Send the invitation from the host's event: guest email field, one email per guest, personal link included.
- [ ] Send automatic reminders: 7 days and 2 days before the event, only to guests who have not answered.
- [ ] Send the host a nudge list ("4 guests have not replied") with a one-tap resend.
- [ ] Add unsubscribe and a preference page. Required by law in most markets.
- [ ] Bounce and complaint webhooks: mark the guest as unreachable and tell the host.
- [ ] SMS later, only if hosts ask. It adds cost, compliance work and a second provider.

### Guest list import

- [ ] Paste or upload a CSV of names and emails.
- [ ] Match replies to invitees by email first, then by name, so the "who hasn't replied" list is accurate.
- [ ] Show a send status per guest: sent, opened, answered, bounced.

**Done when:** a host can create an event, paste 30 emails, and watch replies arrive without leaving the app.

## 6. Phase 3: money (weeks 7-9)

Venmo has no public API, so today the host shares a prefilled link and ticks "paid". That is honest but manual. Two options:

**Option A, stay out of the money flow (recommended for launch).**

- Keep Venmo and add other link formats: PayPal.Me, Cash App, Revolut.
- Host still ticks paid; add partial payments and a "who owes" summary.
- No money transmission, no chargebacks, no KYC. This is the lowest-risk public launch.

**Option B, take payments (later, if hosts ask).**

- Stripe Connect Express: the host onboards, guests pay by card, the app takes an application fee.
- Requires refunds, disputes, payout timing, tax reporting and stronger terms of service.
- Do not start here. It turns a party planner into a payments company.

Also add:

- [ ] Split presets: equal split, split by head, custom weights.
- [ ] Receipt upload or a note per guest.
- [ ] A printable "who paid" summary for the host.

**Done when:** a host can collect from 20 guests without keeping a second spreadsheet, and disputes are rare.

## 7. Phase 4: hardening and public launch (weeks 10-12)

### Product gaps worth closing before the public

- [ ] Merge shopping lines that share an ingredient (two bun lines become one). This is the most visible correctness issue today.
- [ ] Warn when a ticked shopping item's needed quantity grows after new RSVPs.
- [ ] Per-plus-one exclusion so a guest with kids can split their own bill.
- [ ] Metric units and a per-host default (lb/kg, oz/g).
- [ ] Kids and light eaters: a per-guest appetite multiplier.
- [ ] Public event templates ("Backyard burger night", "Taco bar") that preload a menu.

### Security and abuse

- [ ] Rate limit sign-up, login, RSVP and the share-link page per IP and per event.
- [ ] Add a CAPTCHA to sign-up only, not to guest RSVP.
- [ ] Audit guest token handling: 192-bit tokens, noindex, no-referrer, no listing.
- [ ] Dependency scanning (Dependabot) and a monthly `npm audit` review.
- [ ] Spend caps and alerts on Vercel, Neon and the email provider.
- [ ] A simple abuse path: report an event, hide it, and a contact address.

### Legal and trust

- [ ] Privacy policy: what you store (names, emails, food notes), why, where, and for how long.
- [ ] Terms of service, including acceptable use and the fact that food quantities are estimates.
- [ ] Cookie notice if you add analytics beyond a privacy-friendly one. A session cookie alone usually needs only a mention.
- [ ] Data processing agreements with Vercel, Neon and the email provider.
- [ ] Data retention: delete events and guest data N months after the event date; make it configurable.
- [ ] Accessibility pass: keyboard, focus order, labels, contrast, screen reader on the guest flow.

### Performance and reliability

- [ ] Set a performance budget: guest RSVP page interactive under 2.5s on a mid-range phone over 4G.
- [ ] Add caching for starter recipes only; keep every host page dynamic.
- [ ] Load test the guest page with 500 concurrent RSVPs; the write path is small but the share page may be hit hard.
- [ ] A maintenance page and a documented rollback (Vercel instant rollback plus migration notes).

**Done when:** a stranger can sign up, invite 30 people, collect replies and money, and you can sleep through the night.

## 8. Phase 5: after launch

- SEO: one landing page per occasion (burger night, taco bar, birthday, cookout), each with a real recipe example.
- Referral loop: "plan your own" link in every guest confirmation.
- Templates marketplace or host-shared menus.
- Team hosts: two people planning one event.
- Native apps only if the web share sheet proves limiting.
- Pricing experiments: free for events under 10 guests, Pro at $3/month or $24/year for reminders, email invites and templates.

## 9. Metrics and gates

| Stage | Metric | Gate |
| --- | --- | --- |
| Private beta | Events completed without support | 5 |
| Private beta | Guest RSVP completion | > 70% |
| Invite beta | Hosts who create a second event within 60 days | > 30% |
| Invite beta | Invitation emails delivered | > 98% |
| Public | Guest page error rate | < 0.5% |
| Public | Median time from sign-up to first share link | < 5 minutes |
| Public | Refund or payment disputes | < 1% |

Track with a privacy-friendly analytics tool (Plausible, Umami) or Vercel Analytics. Event names: `signup`, `event_created`, `invite_shared`, `rsvp_submitted`, `menu_added`, `shopping_ticked`, `split_link_shared`, `event_completed`.

## 10. Costs (monthly, early stage)

| Item | Cost |
| --- | --- |
| Vercel Pro | $20 |
| Neon Launch (or Supabase Pro) | $19 |
| Domain | ~$1.50 |
| Resend (up to 50k emails) | $20 |
| Sentry Team | $26 |
| Uptime monitor | $0-10 |
| **Total** | **~$85-95/month** |

Free tiers cover the private beta: Vercel Hobby, Neon Free, Resend 3k emails, Sentry free. Move to paid before the invite beta, mostly for backup and email limits.

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Venmo changes or blocks prefilled links | Medium | High | Support multiple payment links; consider Stripe later; tell hosts to verify on a second phone |
| Invitation emails land in spam | Medium | High | Dedicated sending subdomain, SPF/DKIM/DMARC, warm up slowly, monitor bounces |
| Seasonal traffic spike (summer weekends) | High | Medium | Load test, DB pool limits, Vercel scaling, queue reminders |
| Food math is wrong for unusual diets | Medium | Medium | Keep portions editable per dish, show package rounding, collect feedback |
| Guest data privacy complaint | Low | High | Minimal data, retention policy, deletion, clear privacy page |
| Abuse or spam events | Medium | Medium | Email verification, CAPTCHA on sign-up, rate limits, reporting |
| Single developer bus factor | High | High | Runbook, infrastructure as code, backups, no bespoke servers |

## 12. Launch-day checklist

- [ ] Production migrations applied and verified against a restored backup.
- [ ] `BETTER_AUTH_URL` matches the live domain, cookies work over HTTPS.
- [ ] Sentry release created; test error appears in the dashboard.
- [ ] Uptime monitor green.
- [ ] Email sending tested to Gmail, Outlook and iCloud; check spam scores.
- [ ] Privacy, terms and support links live.
- [ ] Sign-up, RSVP, menu, shopping, split and print tested on a real phone.
- [ ] Rollback plan written: previous Vercel deployment ID and migration steps.
- [ ] Announcement post and a support rota for the first 48 hours.

## 13. Immediate next ten tasks

1. Commit the current tree and tag `v0.1.0`.
2. Add CI (lint, types, unit, build) and branch protection.
3. Deploy to Vercel with Neon and a real domain.
4. Add `/api/health`, Sentry and an uptime check.
5. Write the runbook and rehearse a restore.
6. Add password reset and email verification (needs the email provider).
7. Add privacy, terms and a support address.
8. Add per-IP rate limits on sign-up and RSVP.
9. Run five private-beta events and watch the funnel.
10. Decide payment strategy (stay link-only or Stripe Connect) based on what hosts ask for.
