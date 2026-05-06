# Functional Documentation (Auth Platform)

This repository contains a working authentication + tenant/role/permission administration platform.

**Main modules**

- `authService/`: Spring Boot REST API for authentication, multi-tenancy, roles/permissions, sessions, audit logs, password reset, and SSO callback.
- `frontend/`: React + TypeScript UI that consumes `authService/`.
- `cloudPricer/`, `dashboard/`: Spring Boot app skeletons (no implemented controllers/routes found).

---

## 1) Key Concepts

### Tenant

A tenant is an isolated organization scope. Most resources are tenant-scoped.

### User

A user belongs to exactly one tenant. Users have a `status` (e.g., `ACTIVE`, `DISABLED`, `INVITED`, `DELETED`).

### Role

Roles are tenant-scoped. Users are assigned roles.

**Important rule (enforced by backend)**: a user effectively has **one role at a time**.

- When assigning a role via the API, any existing role assignment is removed first.

### Permission

Permissions are global definitions (e.g., `USER_MANAGE`, `ROLE_MANAGE`). Roles link to permissions.

### Session (Access + Refresh token)

The backend persists sessions in the database.

- Access token is provided via `Authorization: Bearer <token>`.
- Refresh token is used to rotate a new session via `/auth/refresh`.

### Audit log

Most admin operations write audit entries. Audit logs are tenant-scoped.

### 2FA (Email-based)

Two-factor authentication is email-code based:

- Login can require a 6-digit email code if 2FA is enabled for the user.
- Enabling 2FA is a separate flow (setup → verify → enabled).

### SSO (OAuth-like Authorization Code)

Backend supports:

- `GET /auth/sso/{provider}/redirect`
- `GET /auth/sso/{provider}/callback`

Provider configuration is read from Spring properties using the prefix:

- `auth.sso.<provider>.authorization-uri`
- `auth.sso.<provider>.token-uri`
- `auth.sso.<provider>.user-info-uri`
- `auth.sso.<provider>.client-id`
- `auth.sso.<provider>.client-secret`
- `auth.sso.<provider>.redirect-uri`
- `auth.sso.<provider>.scope` (optional, default `openid email profile`)

---

## 2) Default Seed Data (Dev Convenience)

On startup, `authService` seeds default tenants, permissions, roles, and users.

**Default password for seeded accounts**: `test`

**Seeded permissions**

- `USER_READ`
- `USER_MANAGE`
- `ROLE_MANAGE`
- `SESSION_MANAGE`
- `PERMISSION_MANAGE`
- `TENANT_MANAGE`
- `AUDIT_READ`

**Seeded tenants**

- `default-tenant`
- `sales-tenant`
- `finance-tenant`

**Seeded users (examples)**

- `superadmin@gmail.com` (role: `super-admin`)
- `admin@gmail.com` (role: `admin`)
- plus per-tenant accounts like `sales.admin@gmail.com`, `finance.admin@gmail.com`, etc.

---

## 3) Frontend (React) Functionalities

### 3.1 Routing & guards

Routes are split into public-only and protected:

**Public-only**

- `/login`
- `/forgetPassword`
- `/resetPassword/:token`
- `/two-fa`
- `/sso`
- `/sso/callback/:provider`

**Protected (requires access token)**

- `/profile`
- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/tenants`
- `/admin/sessions`
- `/admin/audit-logs`

### 3.2 Session storage (browser)

Frontend stores auth state as:

- `localStorage.accessToken`
- `localStorage.refreshToken`
- `localStorage.authUser`

For login-2FA pending state:

- `sessionStorage.pendingTwoFactorSession` (stores the email for the 2FA verification step)

### 3.3 API client behavior (automatic refresh)

Frontend uses a custom fetch wrapper in `frontend/src/services/axiosInstance.ts`:

- Adds `Authorization: Bearer <accessToken>` automatically when available.
- Adds `X-Client-Timezone` and `Accept-Language` headers.
- On HTTP `401`, it calls `/auth/refresh` (using refresh token), stores rotated tokens, and retries the original request once.
- If refresh fails, it clears session and navigates to `/login`.

Base URL selection:

- If `VITE_API_BASE_URL` is set, it’s used directly.
- Otherwise it composes `http://{VITE_API_HOST|localhost}:{VITE_API_PORT|7070}{VITE_API_PATH|/api/v1}`.

---

## 4) Frontend Screens (User Journeys)

### 4.1 Login

- User enters email + password.
- If backend responds with `twoFaRequired: true`, frontend redirects to `/two-fa` and asks for the email code.
- Otherwise, it stores tokens + user and opens protected pages.

### 4.2 Email 2FA verification (login)

- User enters 6-digit code.
- Frontend calls `/auth/2fa/email/verify` with `{ email, code }`.
- On success, it stores tokens and proceeds as authenticated.

### 4.3 Forgot/reset password

- `/forgetPassword` triggers `/auth/forgot-password`.
- Backend sends an email (and also returns a reset token in the response).
- `/resetPassword/:token` calls `/auth/reset-password`.

### 4.4 Profile

Profile page uses `/auth/me` and provides:

- Change password
- Update email
- Enable 2FA (setup → verify)
- Disable 2FA
- Logout

### 4.5 Admin → Users

Features:

- List users (with search + status filter)
- Create user (email + temporary password + status)
- Update user status (edit + save)
- Assign a role to a user (select role → set role)
- Remove a role from a user
- Delete user

### 4.6 Admin → Roles

Features:

- List roles (search + permission substring filter)
- Create role
- Edit role (name/description)
- Delete role
- Add/remove permissions on a role

### 4.7 Admin → Permissions

Features:

- List permissions (search + action/resource/category filters)
- Create permission (name + description)
- Edit permission (name + description)
- Delete permission

### 4.8 Admin → Tenants

Features:

- List tenants (search + status + plan filter)
- Create tenant
- Edit tenant (name, contact email, plan)
- Enable/Disable tenant (implemented as status updates)

UI notes:

- The "Tenant code" input is currently UI-only (not sent to the backend); the UI displays a generated code derived from the tenant name.
- The UI "Plan" is stored in the backend as `modeDeployment`.

Note: backend uses `TenantStatus.DELETED` when disabling.

### 4.9 Admin → Sessions

Features:

- List your own sessions
- Revoke a session (cannot revoke current session)

### 4.10 Admin → Audit logs

Features:

- List audit logs (date range, action, resource, userId filters)
- List distinct audit resources

---

## 5) SSO UI vs Backend Reality (Important)

The frontend SSO pages under `frontend/src/views/auth/sso/` are currently **demo/stub implementations**:

- They do not call `/auth/sso/{provider}/redirect` or `/auth/sso/{provider}/callback`.
- They simulate a callback and store dummy tokens.

The backend SSO endpoints are implemented and can be integrated by wiring the frontend to:

- call redirect endpoint to get a real authorization URL + state
- redirect user to the provider
- call callback endpoint with `code`/`state` after provider redirects back

---

## 6) Backend API Reference

See the full endpoint list and request/response schemas in:

- `authService/API_DOCUMENTATION.txt`
