# Decisions

Durable technical decisions. A replaced decision is marked as such and kept.

## 2026-11-06: OIDC with openid-client and a signed cookie

Sign-in uses `openid-client` 6 (authorization code, PKCE S256, `state` and `nonce` checked) in Next.js route handlers, without Auth.js. After the callback the app keeps its own session: a JWT signed with HS256 (`jose`, `SESSION_SECRET`) in the `palawi_notes_session` cookie (`path=/notes`, `HttpOnly`, `Secure`, `SameSite=Lax`, 30 days). The PKCE verifier, `state`, `nonce` and return path travel in a second signed cookie limited to `/notes/api/auth` for 10 minutes. The token endpoint receives the configured redirect URI, never the internal request URL.

The proxy only checks the cookie signature; every page and route handler loads the account from the database before touching data.

Tests use `oauth2-mock-server`, which checks the PKCE verifier and copies the nonce into the ID token.

## 2026-11-06: workspace imports without file extensions

Packages export their TypeScript sources and import each other without extensions (`moduleResolution: Bundler`). Turbopack resolves workspace packages like `node_modules` and does not map `.js` imports to `.ts` files, so the earlier `.js` convention broke the web build. `tsx`, Vitest and Next.js all resolve extensionless imports.

## 2026-11-06: CSRF protection

State-changing requests must carry an `Origin` header equal to `PUBLIC_URL` (or `Sec-Fetch-Site: same-origin` when the browser sends no `Origin`), on top of `SameSite=Lax` cookies. The check runs in the proxy for every route.
