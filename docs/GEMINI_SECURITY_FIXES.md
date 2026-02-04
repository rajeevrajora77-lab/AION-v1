# Security fixes (Gemini review notes)

**Date**: February 4, 2026  
**Branch**: `hardening/phase-3-ts-layered`  
**Priority**: High

---

## Critical issues addressed

### 1) Removed hardcoded JWT secret fallback

**Issue**: JWT verification used a fallback like `'dev-secret-key'`.  
**Risk**: Token forgery via predictable/known secret.  
**Impact**: Authentication bypass.

**Pattern**:
```ts
// BEFORE (vulnerable)
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');

// AFTER (secure)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const decoded = jwt.verify(token, JWT_SECRET); // no fallback
```

**Files changed** (paths reflect Phase 3 migration):
- `backend/src/api/middleware/auth.ts` - Remove all fallback secrets
- `backend/src/app.ts` - Validate required env at startup (via env loader)

---

### 2) Fixed NoSQL injection risk on ID parameters

**Issue**: User-supplied IDs could reach MongoDB queries without validation.  
**Risk**: Query manipulation / unauthorized data access.  
**Impact**: Data exposure.

**Pattern**:
```ts
function isValidObjectId(id: unknown): id is string {
  if (!id || typeof id !== 'string') return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === id;
}

function sanitizeUserId(userId: unknown): string {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  return userId;
}

// Usage before DB queries
const sanitizedUserId = sanitizeUserId((decoded as any).id);
const user = await User.findById(sanitizedUserId);
```

**Files changed** (paths reflect Phase 3 migration):
- `backend/src/api/middleware/auth.ts` - Add ObjectId validation
- `backend/src/api/routes/chat.ts` - Already had validation (verified)

---

### 3) Secured the shadow proxy endpoint

**Issue**: `/__aion_shadow/api` was reachable without authentication.  
**Risk**: Direct access to Python backend, API abuse/cost overruns.  
**Impact**: Data exposure, billing risk.

**Pattern**:
```ts
// BEFORE (vulnerable)
app.use('/__aion_shadow/api', createProxyMiddleware({ /* ... */ }));

// AFTER (secure)
app.use('/__aion_shadow/api', protect, createProxyMiddleware({ /* ... */ }));
```

**Files changed** (paths reflect Phase 3 migration):
- `backend/src/app.ts` - Add `protect` middleware to shadow proxy

---

### 4) Sanitized production error responses

**Issue**: Error responses could expose stack traces / internal details in production.  
**Risk**: Information leakage.  
**Impact**: Easier exploitation and faster attacker iteration.

**Pattern**:
```ts
if (IS_PRODUCTION) {
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: 'An error occurred processing your request',
  });
}
```

**Files changed** (paths reflect Phase 3 migration):
- `backend/src/app.ts` - Production-safe global error handling
- Shadow proxy error handling - Hide internal errors

---

### 5) Enforced required environment variables at startup

**Issue**: Server could start with missing critical env vars (notably `JWT_SECRET`).  
**Risk**: Security gaps and runtime failures.  
**Impact**: Broken auth, undefined behavior.

**Pattern**:
```ts
const requiredEnvVars = ['OPENAI_API_KEY', 'FRONTEND_URL', 'JWT_SECRET'];

if (missingEnvVars.length > 0) {
  console.error('Missing required env vars:', missingEnvVars);
  process.exit(1);
}
```

**Files changed** (paths reflect Phase 3 migration):
- `backend/src/app.ts` - Validate required variables at startup (via env loader)
- `backend/src/api/middleware/auth.ts` - Throw error if missing

---

## Files changed

```
backend/src/api/middleware/auth.ts     | JWT hardening + ObjectId validation
backend/src/app.ts                    | Shadow proxy auth + production-safe error handling
docs/GEMINI_SECURITY_FIXES.md         | Updated to match Phase 3 TS paths
```

---

## Deployment requirements

### Environment variables

Set these before deploying (service should fail-fast if they are missing):

```bash
JWT_SECRET=<generate-64-byte-hex-string>
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=<your-api-key>
FRONTEND_URL=https://<your-frontend-domain>

# Generate JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Breaking changes

1. JWT_SECRET is required.
2. Shadow proxy requires authentication, send `Authorization: Bearer <token>`.
3. Production error messages are generic; internal details are logged server-side.

---

## Testing checklist

### Before merge

- [ ] JWT_SECRET generated (64+ characters)
- [ ] MONGODB_URI configured
- [ ] All required env vars set in target environment
- [ ] No hardcoded secrets remain

### After merge

- [ ] Server starts successfully
- [ ] Authentication endpoints work
- [ ] Shadow proxy rejects requests without auth
- [ ] Production errors do not leak internals
