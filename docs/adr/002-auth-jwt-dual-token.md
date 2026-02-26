# ADR-002: JWT Dual Token Authentication

## Status
Accepted

## Context
The API needs stateless authentication suitable for a headless CMS consumed by various clients (SPA, mobile, SSR).

## Decision
Use JWT with a dual token strategy:
- **Access token**: Short-lived (15 minutes), sent in `Authorization: Bearer` header
- **Refresh token**: Long-lived (7 days), sent in POST body to `/api/auth/refresh`

## Consequences
### Positive
- Stateless — no session store needed
- Short access token limits exposure window
- Refresh flow enables long sessions without storing sensitive tokens client-side
- Roles embedded in JWT payload for fast authorization checks

### Negative
- Tokens cannot be revoked before expiry (acceptable for Phase 1)
- Refresh tokens need secure storage on the client

## Future Improvements
- Token blacklist (Redis) for immediate revocation
- Rotate refresh tokens on each use
- HttpOnly cookies for web clients
