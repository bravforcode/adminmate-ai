# ADR 003: Auth Proxy Pattern (httpOnly Cookie + In-Memory Token)

## Status

**Accepted**

Date: 2024-01-20

## Context

AdminMate AI needs secure session management for a single-page application (SPA) backed by Supabase. The key challenges:

- JWT tokens must not be exposed to XSS attacks
- Tokens should not persist in localStorage (vulnerable to XSS)
- The app needs to work with Supabase's auth system seamlessly
- Sessions must survive page reloads without re-authentication

We considered several token storage strategies: localStorage, sessionStorage, in-memory, httpOnly cookies, and hybrid approaches.

## Decision

We implement an **auth proxy pattern** combining:

1. **httpOnly cookies** — Supabase session tokens are stored in httpOnly, Secure, SameSite=Strict cookies set by the backend/Supabase auth. These are not accessible to JavaScript, preventing XSS token theft.

2. **In-memory token store** — A lightweight Zustand auth store holds the current user's session state (user metadata, roles, org ID) in JavaScript memory only. This is never persisted to disk.

3. **Session refresh on reload** — On app initialization, `authStore.initSession()` calls `supabase.auth.getSession()` to restore the session from the httpOnly cookie. No token is read from localStorage.

The auth flow:
```
Login → Supabase returns tokens → httpOnly cookie set automatically
Page reload → getSession() reads cookie → in-memory store hydrated
API calls → Cookie sent automatically via SameSite policy
Logout → Cookie cleared → in-memory store reset
```

## Consequences

### Positive

- **XSS protection** — Tokens in httpOnly cookies are invisible to JavaScript, blocking token exfiltration via XSS
- **No localStorage exposure** — Eliminates the most common SPA token storage vulnerability
- **Automatic cookie handling** — Browser sends cookies on same-origin requests without manual header management
- **Session persistence** — Sessions survive page reloads without exposing tokens to the DOM
- **Supabase compatibility** — Works natively with Supabase's auth token refresh mechanism

### Negative

- **CSRF consideration** — httpOnly cookies are automatically sent, requiring SameSite=Strict or CSRF tokens for protection
- **Subdomain limitations** — Cookie scope is limited to the exact domain (no cross-subdomain sharing without additional setup)
- **Cookie size limits** — Large JWT payloads may approach cookie size limits (though typical Supabase tokens are well within limits)

### Risks

- Misconfigured SameSite or Secure flags could weaken security
- Cookie-based sessions may not work in some corporate proxy environments
- Development environments must use HTTPS for Secure flag compliance

## Alternatives Considered

1. **localStorage** — Rejected because: accessible to any JavaScript on the page, making tokens vulnerable to XSS exfiltration. This is the most common SPA security anti-pattern.
2. **sessionStorage** — Rejected because: same XSS vulnerability as localStorage, just scoped to the tab.
3. **Pure in-memory (no cookie)** — Rejected because: sessions are lost on every page reload, creating poor UX and requiring constant re-authentication.

## References

- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [MDN: httpOnly cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#cookie_attributes)
