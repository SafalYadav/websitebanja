# WebsiteBanja AI — Production Hardening & Deployment Guide (Phase 9)

> [!IMPORTANT]
> **DOCUMENTATION ONLY**: These configuration specifications and deployment requirements are documented for production rollout. **Do NOT apply changes to live production databases or rotate production secrets during local auditing.**

---

## 1. Environment Variables & Secret Configuration

The following environment variables must be securely populated in the production environment (e.g. Azure App Service / Azure Container Apps Application Settings or Key Vault):

### Authentication & Database
| Variable | Purpose | Classification | Production Recommendation |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Azure PostgreSQL Flexible Server connection string with SSL | Secret | `postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Enforces verified TLS certificates for database connections | Config | Set to `"true"` in production |
| `DATABASE_MAX_CONNECTIONS` | Pool size cap for native PostgreSQL pool | Config | Set to `20` (or tune according to vCore count) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL for browser authentication | Public | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key (browser safe) | Public | Standard Anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only) | Secret | Never expose to browser or commit to repository |

### Platform Administration
| Variable | Purpose | Classification | Production Recommendation |
| :--- | :--- | :--- | :--- |
| `ADMIN_EMAILS` | Comma-separated list of bootstrap super-administrator emails | Config | Lowercase canonical emails (e.g. `founder@websitebanja.com`) |
| `ADMIN_USER_IDS` | Comma-separated list of bootstrap super-administrator UUIDs | Config | Canonical Supabase Auth user IDs |
| `CRON_SECRET` | Secret token guarding `/api/billing/check-expiries` | Secret | High-entropy random 64-character token |

### AI Providers & Model Routers
| Variable | Purpose | Classification | Production Recommendation |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Primary API key for Mitra conversational agent and TTS | Secret | Restrict key to Generative Language API in GCP console |
| `OPENROUTER_API_KEY` | Fallback API key for Mitra and Boss Agent (Llama 3.3) | Secret | Set monthly spending cap in OpenRouter dashboard |
| `GROQ_API_KEY` | High-speed optional fallback for agent reasoning | Secret | Optional fallback |
| `OPENAI_API_KEY` | Dedicated exclusively to website generation pipeline | Secret | Never reference in agent systems or authorization |

### Storage & Billing
| Variable | Purpose | Classification | Production Recommendation |
| :--- | :--- | :--- | :--- |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string | Secret | Store in Azure Key Vault / App Configuration |
| `RAZORPAY_KEY_ID` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key ID | Public | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay webhook & payment HMAC-SHA256 signature secret | Secret | Never expose to client |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint for distributed rate limiting | Config | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST access token | Secret | Secure Redis token |

---

## 2. Azure PostgreSQL Flexible Server Hardening

1. **Enforce SSL/TLS**:
   - Parameter `require_secure_transport`: `ON`.
   - Minimum TLS version: `TLSv1.2` or `TLSv1.3`.
2. **Network Security & Private Endpoints**:
   - Deny public network access once VNet integration or Private Endpoint to Container Apps is established.
   - Restrict firewall rules strictly to outbound IP addresses of Azure Container Apps.
3. **Connection Pooling & PgBouncer**:
   - Enable built-in PgBouncer on Azure Flexible Server for high connection reuse.
   - Direct connection port `5432` for administrative DDL migrations.
   - Pooled connection port `6432` for application API queries.

---

## 3. Azure Blob Storage Security Controls

1. **Access Tier & Private Containers**:
   - Container `project-workspaces`: Set public access level to **Private (no anonymous access)**. All access mediated by server-side `serverReadAiWorkspace` and `serverWriteAiWorkspace`.
   - Container `project-assets`: Set to **Blob (anonymous read access for blobs only)** to serve optimized public images.
2. **Secure Transfer & Minimum TLS**:
   - Enforce "Secure transfer required" (HTTPS only).
   - Minimum TLS version: `1.2`.
3. **Soft Delete & Versioning**:
   - Enable 7-day soft delete on blobs to protect against accidental user deletion or malicious purge.

---

## 4. Supabase Auth & RLS Policy Migration

1. **Row Level Security (RLS)**:
   - Ensure RLS is enabled across all production tables (`ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`).
   - Run `azure-migration/01_azure_schema_baseline.sql` and `azure-migration/07_admin_access_control_audit.sql` to maintain table grants and user isolation.
2. **Session Lifetimes & Refresh Token Rotation**:
   - JWT expiry: 3600 seconds (1 hour).
   - Refresh token rotation: Enabled with reuse interval of 10 seconds.
3. **OAuth Redirect Whitelisting**:
   - Restrict Supabase Auth Redirect URLs strictly to:
     - `https://websitebanja.com/auth/callback`
     - `https://websitebanja.com/dashboard`
   - Remove wildcard (`*`) redirect URLs.

---

## 5. Security Headers & Content Security Policy (CSP)

Configured in `next.config.ts`:
- **Content-Security-Policy**:
  - Restricts `default-src 'self'`.
  - Scripts restricted to trusted domains (Razorpay, Google AdSense, Supabase).
  - WebSockets restricted to `wss://generativelanguage.googleapis.com` for Gemini Live.
- **X-Frame-Options**: `SAMEORIGIN` (prevents clickjacking attacks).
- **X-Content-Type-Options**: `nosniff` (prevents MIME type sniffing).
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload` (enforces HTTPS for 2 years).
- **Permissions-Policy**: `camera=(), microphone=(self), geolocation=()`.
- **poweredByHeader**: `false` (suppresses `X-Powered-By: Next.js`).

---

## 6. Rate Limiting & Abuse Defenses

1. **Distributed Rate Limiting (Upstash Redis)**:
   - Free Tier Website Generation: 3 requests / 7 days per User ID and IP.
   - Pro Tier Website Generation: 50 requests / 7 days per User ID.
   - Conversational Mitra Agent (`/api/agent/talk`): 60 requests / minute.
   - Voice Synthesis (`/api/agent/voice`): 30 requests / minute, max 1,500 chars per request.
   - Live Token Negotiation (`/api/agent/live-token`): 10 requests / minute.
   - Admin Diagnostics (`/api/admin/agents/diagnostics`): 30 requests / minute.
   - Public Lead Submission (`/api/public/submit-lead`): 10 requests / 15 minutes per IP.
2. **Fallback In-Memory Limiter**:
   - Resilient in-memory sliding window fallback active if Redis connection is unavailable.

---

## 7. Webhook & Payment Verification (Razorpay)

1. **HMAC-SHA256 Signature Verification**:
   - All payment verifications (`/api/billing/verify-payment`) use `crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)`.
   - Compares signatures using `crypto.timingSafeEqual` to eliminate timing attack vectors.
2. **Scheduled Billing Sweeps (`/api/billing/check-expiries`)**:
   - Guarded by `CRON_SECRET`. In production, requests fail closed if `CRON_SECRET` is unset or unauthorized.
   - Secret must be transmitted via `Authorization: Bearer <token>` or `x-cron-secret` header. Query parameter token passing is disabled in production.

---

## 8. Incident Response & Secret Rotation Playbook

1. **Suspected Key Compromise**:
   - Generate new API key in provider dashboard (OpenAI, Google Cloud, Groq, OpenRouter, Razorpay).
   - Update Azure Application Settings.
   - Restart Azure Container App / App Service container.
   - Revoke old key after confirming zero error rate.
2. **Unauthorized Access Incident**:
   - Check `audit_logs` via Admin Intelligence Center (`/api/admin/audit-logs`).
   - If an admin account is compromised, remove email from `ADMIN_EMAILS` and call `revokeAdminRole(compromisedUserId, systemBootstrapId)`.
   - Invalidate all active sessions in Supabase Auth console.
