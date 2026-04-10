# OAuth Redirect Architecture Explanation

## Current Implementation

### IntegrationsPage.jsx (Line 144)
```javascript
const authUrl = `${window.location.origin}/api/auth/${integrationId}/authorize?organization_id=${orgId}`;
```

## Why This Is CORRECT for Kubernetes Ingress

### Kubernetes/Nginx Ingress Routing Rules:
1. **Frontend routes** (no `/api` prefix) → Port 3000
2. **Backend routes** (with `/api` prefix) → Port 8001

### How OAuth Flow Works:

**Development (localhost):**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3000/api/*` → Proxied to port 8001
- OAuth URL: `http://localhost:3000/api/auth/github/authorize` ✅ CORRECT

**Production (Emergent):**
- Frontend: `https://your-app.emergentagent.com`
- Backend API: `https://your-app.emergentagent.com/api/*` → Proxied to port 8001
- OAuth URL: `https://your-app.emergentagent.com/api/auth/github/authorize` ✅ CORRECT

### OAuth Callback Flow:
1. User clicks "Connect GitHub"
2. Frontend redirects to: `${window.location.origin}/api/auth/github/authorize?org_id=123`
3. Kubernetes ingress routes `/api/auth/*` to backend (port 8001)
4. Backend redirects user to GitHub OAuth page
5. User authorizes
6. GitHub redirects to: `https://your-app.emergentagent.com/api/auth/github/callback?code=xxx`
7. Kubernetes ingress routes callback to backend
8. Backend exchanges code for token
9. Backend redirects user back to frontend `/integrations?success=true`

## Why Using `process.env.REACT_APP_BACKEND_URL` Would Be WRONG

If we used:
```javascript
const authUrl = `${process.env.REACT_APP_BACKEND_URL}/api/auth/${integrationId}/authorize`;
```

**Problem in Production:**
- `REACT_APP_BACKEND_URL` = `https://your-app.emergentagent.com`
- OAuth URL would be: `https://your-app.emergentagent.com/api/auth/github/authorize`
- This would work, BUT creates unnecessary coupling to env variable

**Problem in Development:**
- If `REACT_APP_BACKEND_URL` points to `http://localhost:8001` (backend port)
- OAuth callback would fail because the redirect must go through the ingress/proxy

## Conclusion

✅ **Current implementation using `window.location.origin` is CORRECT**

This approach:
- Works in both development and production
- Respects Kubernetes ingress routing
- Doesn't require additional environment variables
- Automatically adapts to the deployed domain
- Follows the same pattern as other full-stack apps on Emergent

## Alternative Approach (If Needed)

If backends were on completely separate domains (not the case here), we would use:
```javascript
const authUrl = `${process.env.REACT_APP_BACKEND_URL}/api/auth/${integrationId}/authorize`;
```

But this is NOT needed for Kubernetes ingress setups where frontend and backend share the same domain with path-based routing.
