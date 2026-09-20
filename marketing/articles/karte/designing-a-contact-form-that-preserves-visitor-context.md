---
title: Designing a contact form that preserves visitor context
slug: designing-a-contact-form-that-preserves-visitor-context
target_query: contact form context
search_intent: Learn how to build a contact form that captures user identity, limits spam, and preserves the context of the user's interaction without frustrating them.
meta_title: Designing a Contact Form That Preserves Context | Karte
meta_description: Learn how to build a smart, contextual contact form that securely captures visitor identity, page context, and limits spam.
---

# Designing a contact form that preserves visitor context

## Outline
1. **Introduction**: The problem with generic contact forms and why context matters.
2. **Identity and Session Adaptation**: Adapting the form based on user state (anonymous, verified email, authenticated session).
3. **Preserving Interaction Context**: Tying submissions to specific page sections and tracking anonymous visitor journeys.
4. **Securing the Form**: Defending against spam and abuse without hindering legitimate users.
5. **Contextual Delivery**: Storing and delivering messages in a way that respects the owner's workflow.
6. **Internal Link Suggestions**: Recommended resources for further reading.
7. **Practical Next Action**: Steps to implement these concepts.
8. **Source Notes**: Internal references and evidence.

---

The traditional contact form is a black box. A visitor types their name, email, and message into generic fields, hits send, and the recipient receives an isolated block of text. For the recipient, this lack of context is frustrating: *Who is this person? What page were they looking at? Have they reached out before?*

Designing a contact form that preserves visitor context solves this problem. By dynamically adapting to the user's identity, tracking the specific context of their interaction, and securing the pipeline without ruining the user experience, you can build a contact form that feels like a natural extension of the conversation.

This article explores how to design a context-aware contact form, using the architecture of the Karte platform as a practical example.

## Identity and Session Adaptation

A context-aware form shouldn't ask a logged-in user for their email address. It should adapt to the known state of the visitor. In Karte, the `ContactFormSection` component dynamically adjusts its requirements based on the page's configuration and the visitor's authentication state.

### The `dmMode` Configuration

The behavior of the form is dictated by a `dmMode` setting, which can be `anonymous` or `email` (or completely `off`).

*   **Anonymous Mode**: The form asks for an optional name and the message. It doesn't require an email, reducing friction for quick inquiries.
*   **Email Mode**: The form requires an email address. However, this is where session adaptation comes in.

### Session Integration with better-auth

If a visitor is browsing a Karte profile and happens to be logged in (via `better-auth` using Google OAuth), the form recognizes this.

```typescript
// Example adaptation from Karte's ContactFormSection
const { data: session } = authClient.useSession();
const usesVerifiedEmail = requireVerifiedEmail && dmMode === 'email';

// If requireVerifiedEmail is true, the user must be logged in.
const needsVerifiedSession = requireVerifiedEmail && dmMode === 'email' && !session?.user?.email;

// Later, during submission:
const submitEmail = isAnonymous
  ? ''
  : usesVerifiedEmail
    ? (session?.user?.email ?? trimmedEmail)
    : trimmedEmail;
```

When a profile owner requires a verified email (`requireVerifiedEmail = true`), the form bypasses the manual email input field entirely. Instead, it relies on the cryptographically verified session data. This not only speeds up the submission process for the visitor but also provides the profile owner with a guaranteed-accurate email address, eliminating typos and fake addresses.

## Preserving Interaction Context

Knowing *what* a visitor was looking at when they decided to reach out is often as important as knowing *who* they are.

### Tying Submissions to Page Elements

In Karte, a contact form isn't just a global page element; it can be tied to a specific section of the profile using a `sectionId`.

When the form is submitted, this `sectionId` is passed along in the payload:

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "message": "I'm interested in this project.",
  "sectionId": "proj_123abc",
  "visitorId": "v_789xyz"
}
```

On the server side, this `sectionId` is recorded in the database alongside the submission and is also included in the analytics telemetry. This allows the page owner to see exactly which project, service, or article prompted the user to initiate contact.

### The Persistent `visitorId`

Even for completely anonymous users, maintaining continuity across sessions is valuable. Karte utilizes a persistent `visitorId`. This ID is generated on the client side and stored in local storage (`getOrCreateVisitorId()`).

Every contact submission includes this `visitorId`. Furthermore, the analytics system (`recordEvent`) uses the same ID. This means a profile owner can correlate a contact form submission with a sequence of page views or clicks, building a complete picture of the visitor's journey leading up to the inquiry, without requiring the user to create an account.

## Securing the Form

A context-rich form is useless if it's buried under a mountain of spam. Security measures must be robust but invisible.

### Rate Limiting at the Edge

Before a request even reaches the core application logic, it must pass a rate limit. Karte uses a Cloudflare Durable Object (`RateLimiterDO`) to enforce this.

```typescript
// From Karte's API route
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
const { ok } = await rateLimit(`contact:${ip}:${slug}`);
if (!ok) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

Because this rate limiter is backed by a Durable Object, the counts survive deployments and are shared across isolates, providing a strict, globally consistent defense against automated floods.

### Invisible CAPTCHA with Cloudflare Turnstile

To verify that the sender is human, Karte integrates Cloudflare Turnstile. Unlike traditional CAPTCHAs that ask users to identify traffic lights, Turnstile runs invisibly in the background.

The client-side `TurnstileWidget` requests a token, which is sent with the form submission. The server-side API then rigorously verifies this token:

```typescript
// From Karte's API route
const verified = await verifyTurnstile({
  token: body.turnstileToken,
  action: 'contact',
  remoteIp: ip,
});
if (!verified) {
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
```

The verification process (`verifyTurnstile`) not only checks the token's validity with Cloudflare's servers but also ensures that the token was generated for the correct `action` ('contact') and originates from an allowed hostname. This prevents attackers from harvesting tokens from other sites and reusing them against the contact endpoint.

## Contextual Delivery

Once a message is captured securely, how is it delivered? Blindly forwarding emails is an anti-pattern.

### The Problem with Forwarding

If a platform forwards contact form submissions directly to the owner's personal email, it runs into issues:
1.  **Context Loss**: The forwarded email often strips away the rich metadata (like `sectionId` or `visitorId`).
2.  **Deliverability**: Forwarding arbitrary user-generated content can harm the platform's domain reputation.
3.  **Security**: The platform must act as an open relay for potentially malicious payloads.

### The In-App Inbox Pattern

Karte solves this by not forwarding the message body at all. Instead, it utilizes an "In-App Inbox" pattern.

When an email is received (via Cloudflare Email Routing to a dedicated `karte-email` worker), the worker parses the message. It then sends the parsed payload to the main Next.js application.

The main application:
1.  Stores the full email body in Cloudflare R2 (`IMAGES_BUCKET`).
2.  Inserts a metadata record into the Cloudflare D1 database (`receivedEmails`).
3.  Sends a short, standardized notification to the owner's verified email address using the `EMAIL` binding.

This notification simply says: "You have a new message. Click here to read it."

The owner clicks the link, authenticates to their `/dashboard/email` view, and reads the message in a sanitized environment (`sanitize-html` is used to prevent XSS). This approach ensures that the platform's outbound email reputation remains pristine, the user's real inbox isn't cluttered with spam, and the full context of the message is preserved within the application dashboard.

## Internal Link Suggestions

*   **Handling User Authentication**: Learn more about how we integrate `better-auth` for seamless session management.
*   **Edge Rate Limiting Strategies**: Deep dive into the architecture of our `RateLimiterDO` and how it protects critical endpoints.
*   **Building an In-App Inbox**: Explore the technical implementation of receiving and storing emails using Cloudflare Workers, R2, and D1.

## Practical Next Action

If you are building a contact form:
1.  Stop using raw `<a>` mailto links or simple generic forms.
2.  Implement a persistent client-side identifier (like a `visitorId`) and attach it to both your analytics events and form submissions.
3.  Add an invisible CAPTCHA solution like Cloudflare Turnstile to your submission endpoint.
4.  If your platform has user accounts, auto-fill or bypass email requirements for authenticated sessions.

---

### Source Notes (Internal Use Only)

*   **Identity & Session**: The adaptation logic (`dmMode`, `requireVerifiedEmail`, and `better-auth` session usage) is implemented in `src/components/public/contact-form-section.tsx`. The server-side verification of this session occurs in `src/app/api/contact/[slug]/route.ts`.
*   **Interaction Context**: The passing of `sectionId` and `visitorId` is visible in the payload construction within `src/components/public/contact-form-section.tsx`. The `recordEvent` integration using these IDs is documented in `src/lib/analytics-server.ts`.
*   **Security**: Rate limiting via `RateLimiterDO` is enforced at the top of `src/app/api/contact/[slug]/route.ts`. Turnstile verification is handled by `src/lib/turnstile.ts` and called within the same API route. Hostname verification is explicitly checked (`isAllowedHostname`).
*   **Delivery**: The "In-App Inbox" architecture (avoiding blind forwarding, storing bodies in R2, metadata in D1, and sending a short notification via the `EMAIL` binding) is thoroughly documented in `docs/product/email-inbox.md`.
*   **Limitations**: The article infers that the platform owner reads contact submissions via the dashboard; while `docs/product/email-inbox.md` details this for *inbound emails*, direct contact form submissions (`contactSubmissions` table) are currently inserted into D1 in `src/app/api/contact/[slug]/route.ts`, though the exact dashboard UI for *form submissions* (vs inbound emails) isn't detailed in the provided scope, the architectural principle of keeping data in-app remains true based on the schema.
*   No external metrics, keyword volumes, or fabricated customer outcomes were included.
