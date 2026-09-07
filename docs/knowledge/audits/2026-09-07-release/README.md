# Karte hosted link release — 2026-09-07

[Deploy run 34129473645](https://github.com/Significant-Hobbies/karte/actions/runs/34129473645)
released `e7072fc6171dc4fa926cac1ee846068b4243b370`. Cloudflare reports
`8f4a28c3-db91-40d2-9749-58b0404fa1ab` at 100% traffic. Rollback version:
`51cc9395-19ce-4992-9ee0-2317cca88840` (source `a13ca649`). No migration ran.

Ordinary [public profile](https://karte.cc/sarthak), without cache-busting:

- Truncated secondary booking link is noninteractive and says “Link unavailable.”
- Three homepage destinations say “Visit website”; intended article URLs still need owner correction.
- Desktop and 390px phone screenshots were visually reviewed; no horizontal overflow or page errors observed.
- Encyclopedia, newspaper and roast routes returned 200 with substantive published text. This verifies viewing, not fresh generation.

## Protected chat limit

The account-free chat requires email lead capture and real Turnstile. Source
inspection found no email/notification/webhook call in chat creation, message
persistence or response handling; targeted D1 inspection found no triggers for
those two tables. `ensureProjectsTable` is a no-op, not a lazy migration.

A reserved synthetic email was entered only in isolated browser storage. The
question text was explicitly marked as a synthetic release check and limited
to this public profile. The real checkbox was visually inspected, then clicked once normally at its
observed location. The UI reported “Verification failed to load. Refresh and
try again.” No token was issued and Send remained disabled. No bypass, account, contact message, booking, chat POST, or inference
request was performed. A prior harness used the wrong button accessible name;
that test error was corrected before recording this final result.

Targeted D1 counts for the exact reserved email were zero before and after.
There are no created conversation/message IDs and no test records to delete.
The browser contexts were closed. No schema, credentials or pre-existing
application data were modified. Fresh protected response and grounding remain
open in [#82](https://github.com/Significant-Hobbies/karte/issues/82), along with
owner URLs, onboarding, customer custom domains and company adoption.

## Evidence

- [Compact receipt](receipt.json)
- [Desktop destination labels](links-desktop.png)
- [Phone entry](profile-phone.png)
- [Phone unavailable link](link-phone.png)
- [Phone real challenge / disabled Send](chat-phone.png)

Validation: exact-source CI and Docs green before deploy; nine focused local
tests pass. Documentation corrections pass lint and docs checks (eight existing
archive warnings). The later evidence-only commit is not a second deployment.
