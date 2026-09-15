# Authentication System Documentation

## 1. What This Is
This project is a standalone, self-contained authentication system built with Next.js (App Router), Prisma ORM, and a PostgreSQL database. It provides a complete user authentication flow including secure signup, login, email verification, and password reset functionalities without relying on third-party authentication services. The design uses Vanilla CSS Modules for styling, delivering a modern glassmorphism aesthetic.

## 2. How To Run It
1. **Install dependencies:**
   Ensure Node.js 20+ is installed, then run:
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
   The application will be available at `http://localhost:3000`.

## 3. The Flow, Step By Step
- **Sign Up:** The user submits their name, email, and password. The system hashes the password, creates a user record, and generates a verification code. This code is hashed and stored, while the raw code is emailed to the user.
- **Email Verification:** The user enters the code they received. The system verifies it against the hashed version in the database and marks the email as verified.
- **Sign In:** The user submits their email and password. The system compares the password against the stored hash. If successful, an opaque session ID is generated, stored in the database, and sent to the client as an `httpOnly` cookie.
- **Protected Access:** When accessing protected routes (like the Dashboard), the system reads the session cookie and validates it against the database to ensure it hasn't expired.
- **Password Reset:** If a user forgets their password, they can request a reset link. The system generates a token, hashes it for storage, and emails the link. Clicking the link allows the user to set a new password, which invalidates the token.

## 4. The Data Model
The database is managed via Prisma and consists of five core models:
- **User:** Stores the user's `name`, `email`, `passwordHash`, and `emailVerifiedAt` timestamp.
- **Session:** Links to a User and stores a unique session `id` and an `expiresAt` timestamp.
- **VerificationCode:** Links to a User and stores a `codeHash`, expiration, and consumption timestamps for email verification.
- **PasswordResetToken:** Links to a User and stores a `tokenHash`, expiration, and usage timestamps for password recovery.
- **RateLimitEntry:** Tracks API request counts by `identifier` (e.g., IP address) and `route` over a specific time window.

## 5. The Concepts
- **Opaque Sessions:** Instead of using JWTs, the system uses random, opaque session IDs stored in the database. This allows for immediate session invalidation when a user signs out.
- **Argon2id Hashing:** Passwords are hashed using Argon2id with a 64 MB memory cost, providing strong resistance against GPU-based brute-force and side-channel attacks.
- **Security-First Cookies:** Session cookies are marked as `httpOnly` and `SameSite=Lax`, protecting them from Cross-Site Scripting (XSS) and mitigating Cross-Site Request Forgery (CSRF).
- **Idempotency:** The signup endpoint gracefully handles duplicate submissions using Prisma's `upsert`, preventing errors while not leaking whether an email is already registered.
- **Rate Limiting:** A database-backed sliding window rate limiter protects sensitive endpoints (like password reset) from automated brute-force attempts.

## 6. What Went Wrong
During implementation, several technical hurdles required post-development scripting to fix:
- **Zod Validation:** There was a mismatch in handling Zod's error object structure (`validationResult.error.errors` vs `validationResult.error.issues`), breaking error reporting across multiple API routes and pages.
- **Argon2 Configuration:** Type compatibility issues with `argon2.Options` and missed asynchronous `await` calls caused the hashing process to fail initially.
These issues were resolved by writing utility scripts (`fix.js` and `fix2.js`) to globally patch the affected files and ensure correct behavior.

## 7. What This Slice Does Not Handle
- **Social Logins (OAuth):** There is no integration with identity providers like Google, GitHub, or Apple.
- **Multi-Factor Authentication (MFA/2FA):** The system relies solely on passwords and email verification.
- **Role-Based Access Control (RBAC):** All users have the same permission level; there are no admin or superuser roles.
- **Session Management UI:** Users cannot view or revoke active sessions on other devices from a settings page.
- **Account Deletion:** There is no user-facing flow to permanently delete an account and its associated data.

## 8. If I Built This Again
- **Adopt an Auth Library:** I would strongly consider using a battle-tested library like NextAuth.js (Auth.js) or a managed service like Supabase or Clerk. Building custom session, token, and hashing logic is highly educational but introduces significant maintenance overhead and potential security risks.
- **Extract Background Jobs:** Sending emails directly in the API route blocks the response and can fail silently. I would move email dispatching to a background queue or serverless function.
- **Caching Strategy:** Looking up the session in the PostgreSQL database on every protected route request could become a performance bottleneck at scale. I would introduce Redis for faster session validation.
