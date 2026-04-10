# Quick OAuth URLs Reference Card

## 🔗 URLs for OAuth App Configuration

Replace `your-app-name.emergentagent.com` with your actual domain.

---

### GitHub OAuth App
```
Homepage URL:         https://your-app-name.emergentagent.com
Callback URL:         https://your-app-name.emergentagent.com/api/auth/github/callback
```

### Zoho Books OAuth App
```
Homepage URL:         https://your-app-name.emergentagent.com
Redirect URI:         https://your-app-name.emergentagent.com/api/auth/zoho/callback
```

### HubSpot OAuth App
```
Public App URL:       https://your-app-name.emergentagent.com
Redirect URL:         https://your-app-name.emergentagent.com/api/auth/hubspot/callback
```

### Jira OAuth 2.0 (3LO)
```
Website:              https://your-app-name.emergentagent.com
Callback URL:         https://your-app-name.emergentagent.com/api/auth/jira/callback
Privacy Policy:       https://your-app-name.emergentagent.com/privacy
Terms of Use:         https://your-app-name.emergentagent.com/terms
```

---

## 📄 Legal Pages (Required for OAuth Verification)

```
Privacy Policy:       https://your-app-name.emergentagent.com/privacy
Terms of Service:     https://your-app-name.emergentagent.com/terms
```

---

## 🏠 Platform URLs

```
Home Page:            https://your-app-name.emergentagent.com
Login Page:           https://your-app-name.emergentagent.com/login
```

---

## ⚙️ Backend Environment Variables

Add to `backend/.env`:

```bash
APP_URL=https://your-app-name.emergentagent.com

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret

HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret

JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret
```

---

**📖 For detailed setup instructions, see `/app/OAUTH_SETUP_GUIDE.md`**
