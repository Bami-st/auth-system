# Authentication System Documentation

## 1. Architecture Summary
This project implements a complete, self-contained authentication system built with **Next.js 16** (App Router). The backend leverages **Prisma ORM** connecting to a **PostgreSQL** database to securely store user credentials, sessions, and tokens. 

Key architectural components include:
- **Server Components & API Routes:** Handlers for authentication operations (signup, signin, verify, reset password).
- **Zod:** Provides robust runtime validation schemas shared between the client forms and API endpoints.
- **Argon2:** A memory-hard, side-channel resistant password hashing algorithm utilized for securing credentials.
- **Vanilla CSS Modules:** Implements a modern glassmorphism design system without external frameworks like TailwindCSS.

## 2. Session Management Approach
The system uses an **Opaque Session ID** approach over JWTs. 
- **Creation:** Upon successful authentication, a cryptographically secure, random 256-bit string is generated.
- **Storage:** This string is stored in a `Session` table in the database with an `expiresAt` timestamp and linked to the `User`.
- **Transmission:** The session ID is sent to the client via an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- **Validation:** Protected routes (like the Dashboard) read the cookie and query the database. If the session exists and `expiresAt` is in the future, the user is authenticated. This approach allows for immediate session invalidation (sign-out) and guarantees accurate expiration enforcement at the database level.

## 3. Rationale for Password Hashing Parameters
The system uses **argon2id**, which is the recommended variant of Argon2 providing both GPU-resistance (memory-hard) and side-channel resistance.

**Parameters Used:**
- `memoryCost`: 65536 KB (64 MB)
- `timeCost`: 3 iterations
- `parallelism`: 1 thread

**Why not cost factor 4?**
A cost factor of 4 (e.g., 4 KB of memory) is vastly insufficient for modern hardware. It reduces the memory hardness of the algorithm, making the hashing process nearly instantaneous. This allows an attacker utilizing GPUs or ASICs to perform high-speed brute-force or dictionary attacks against leaked hashes. By enforcing a 64 MB memory cost, each hash attempt requires significant RAM bandwidth, bottlenecking the attacker's computational throughput.

## 4. CSRF and XSS Protections
- **XSS (Cross-Site Scripting):** 
  - Session identifiers are stored in `httpOnly` cookies, making them entirely inaccessible to JavaScript running in the browser. Even if an XSS vulnerability exists, the attacker cannot steal the session cookie.
  - React (Next.js) natively sanitizes output, mitigating DOM-based injection attacks.
- **CSRF (Cross-Site Request Forgery):** 
  - The Next.js App Router API endpoints inherently enforce Host and Origin checks on POST requests, blocking cross-origin submissions.
  - Cookies are marked with `SameSite=Lax` (and `SameSite=Strict` is achievable), which prevents the browser from sending the session cookie along with cross-origin POST requests initiated by malicious third-party sites.

## 5. Evidence: Rate Limiter
The system employs a database-backed sliding window rate limiter tracking requests by IP address.
Below is the output of testing the `/api/auth/forgot-password` endpoint which is limited to 3 requests per 15 minutes.

```text
--- Testing Rate Limiting (Forgot Password) ---
Request 1: 200 {"message":"If that email address is in our database, we will send you an email to reset your password."}
Request 2: 200 {"message":"If that email address is in our database, we will send you an email to reset your password."}
Request 3: 200 {"message":"If that email address is in our database, we will send you an email to reset your password."}
Request 4: 429 {"error":"Too many requests. Please try again later."}
```
*As demonstrated, the 4th consecutive request is actively blocked by the server with a HTTP 429 response.*

## 6. Evidence: Idempotent Signups
The signup endpoint utilizes `prisma.user.upsert` to guarantee idempotency. If a user double-submits the form or an attacker attempts to hijack a registration flow, the system returns a successful response without modifying the existing password hash or returning a 409 error that would leak account existence.

```text
--- Testing Idempotency ---
Signup 1: 201 {"message":"Account created successfully. Please verify your email."}
Signup 2: 201 {"message":"Account created successfully. Please verify your email."}
```
*As demonstrated, duplicate submissions for the same email gracefully return 201 Created without erroring or crashing.*

## 7. Evidence: Tokens Expire
Tokens (verification codes and password reset links) are verified strictly against the database utilizing an `expiresAt` column. A token is functionally dead the moment the current server time surpasses `expiresAt`, regardless of client state.

**Database Schema Enforcement (`schema.prisma`):**
```prisma
model ResetToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
}
```

**Validation Logic (`src/lib/auth/reset-token.ts`):**
```typescript
const resetToken = await prisma.resetToken.findUnique({ where: { tokenHash } });
if (!resetToken || resetToken.expiresAt < new Date()) {
  return null; // Token rejected if expired
}
```

## 8. Setup Instructions

1. **Install dependencies:**
   Ensure you are using Node.js 20+, then run:
   ```bash
   npm install
   ```
2. **Configure Environment:**
   Create a `.env` file in the root directory mirroring `.env.example`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_slice?schema=public"
   ```
3. **Synchronize Database:**
   Push the Prisma schema to PostgreSQL:
   ```bash
   npx prisma db push
   ```
4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:3000`.*
