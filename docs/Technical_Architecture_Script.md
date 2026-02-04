# LexiPro Technical Architecture Talking Script
Use this as your screen-share narrative so LexisNexis (or any acquirer) understands the architecture, the deterministic guarantees, and why this is **not** a normal CRUD app.

## Frontend (React + Shadow DOM / <lexipro-app>)
- **What you say:** “The entire experience is React-driven but rendered through an embeddable `<lexipro-app>` component that ships in Shadow DOM. That ensures CSS isolation, zero bleeding into host pages, and predictable styling when we inject LexiPro into Lexis+ or litigation portals.
- **Why each piece exists:** React gives us a composable UI, the Shadow DOM guarantees containment of CSS/JS so our claim-highlighting never collides with customer portals, and the PDF viewer + anchor teleport UI gives attorneys an instant way to jump to physically grounded evidence without manual searching.
- **Hook:** Emphasize that the UI is what the user interacts with during demos, but it never overrides partner styling and always shows deterministic teleport anchors so “teleport to the source” is obvious.

## Backend (Node / Express + Prisma + PostgreSQL + Zod)
- **What you say:** “We built LexiPro on a hardened Node/Express API with Prisma for structured queries to PostgreSQL. Every incoming payload is validated with strict Zod schemas, so we fail fast before anything hits the ORM.
- **Why each piece exists:** Express keeps the path simple for RESTful integration, Prisma abstracts complex joins over anchor/data models, PostgreSQL stores the source docs and hash chains, and Zod is our first line of defense against malformed requests that would otherwise risk credibility.
- **Hook:** Call out that validation, type safety, and the deterministic data model are what let us promise zero hallucinations from the backend before the AI ever writes a response.

## Forensic Core (anchor tables + ledger)
- **What you say:** “This is the heart of the deterministic guarantee. Every document interaction records anchor coordinates (page_number + bbox) alongside the claim. We hash that bundle into the immutable integrity ledger and constantly re-verify the hash on read.
- **Why each piece exists:** The anchor table gives us physical grounding; the ledger gives us tamper-evidence; the continuous re-hash catches drift; automatic revocation on mismatch prevents corrupted proof from propagating.
- **Hook:** Promise that any hallucination would be immediately blocked because the hash check fails and the system revokes the evidence. Show that these checks are in-band with every response so the AI can’t slip past the guardrails.

## Security Model (multi-tenant, zero-trust, IDOR proof)
- **What you say:** “Every workspace lives in a tenant namespace. Routes are zero-trust enforced and every access is scoped so you can’t read another tenant’s record, even with a crafted URL.
- **Why each piece exists:** Multi-tenant isolation keeps help desks from touching other clients, zero-trust prevents lateral movement inside the API, and the IDOR-safe access controls guard against tampering with workspace IDs.
- **Hook:** Mention that this is production-grade security that a legal buyer expects, not the lightweight access controls of a prototype.

## Why this is not a normal SaaS CRUD app
- LexiPro orchestrates deterministic evidence, not just CRUD data. We enforce zero-temperature, PRP-001 guardrails, anchor teleportation, chain-of-custody hashing, and audit logging on every interaction.
- Normal SaaS apps let the backend generate creative responses—LexiPro gives deterministic responses backed by physical evidence. That requires the layered core described above and makes LexiPro more of a forensic OS than a CRUD stack.
- When you describe it, contrast LexiPro with generic SaaS: “Most SaaS answers the question ‘Did the database persist the row?’ LexiPro answers ‘Can I prove on the stand that this claim maps back to this exact coordinate in the original evidence file with cryptographic integrity?’ ”

Use this script while you screen-share the architecture diagram. If you want to interleave live demos, mention the corresponding layers the UI/API is hitting so the judges can map the claim to the implementation.
