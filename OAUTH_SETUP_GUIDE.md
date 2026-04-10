# OAuth Integration Setup Guide

## Overview
This document provides all the URLs and information needed to configure OAuth applications for third-party integrations with the Startup Progress Intelligence Platform.

---

## 🌐 Platform URLs

### Production Environment
Replace `your-app-name` with your actual deployed app name on Emergent or your custom domain.

- **Home Page URL**: `https://your-app-name.emergentagent.com`
- **Privacy Policy**: `https://your-app-name.emergentagent.com/privacy`
- **Terms of Service**: `https://your-app-name.emergentagent.com/terms`

### Local Development
- **Home Page URL**: `http://localhost:3000`
- **Privacy Policy**: `http://localhost:3000/privacy`
- **Terms of Service**: `http://localhost:3000/terms`

---

## 🔐 OAuth Redirect URLs by Integration

Replace `your-app-name.emergentagent.com` with your actual domain in production.

### 1. GitHub OAuth App

**Application Settings:**
- **Application Name**: Startup Progress Intelligence Platform
- **Homepage URL**: `https://your-app-name.emergentagent.com`
- **Application Description**: Portfolio monitoring and automated reporting platform for startups and investors
- **Authorization Callback URL**: `https://your-app-name.emergentagent.com/api/auth/github/callback`

**Where to Configure:**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details above
4. Copy Client ID and Client Secret
5. Add to backend/.env:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

**Local Development:**
- Homepage URL: `http://localhost:8001`
- Callback URL: `http://localhost:8001/api/auth/github/callback`

---

### 2. Zoho Books OAuth App

**Application Settings:**
- **Client Name**: Startup Progress Intelligence Platform
- **Homepage URL**: `https://your-app-name.emergentagent.com`
- **Authorized Redirect URI**: `https://your-app-name.emergentagent.com/api/auth/zoho/callback`

**Where to Configure:**
1. Go to Zoho API Console (https://api-console.zoho.com/)
2. Click "Add Client" → "Server-based Applications"
3. Fill in:
   - Client Name: Startup Progress Intelligence Platform
   - Homepage URL: `https://your-app-name.emergentagent.com`
   - Authorized Redirect URIs: `https://your-app-name.emergentagent.com/api/auth/zoho/callback`
4. Copy Client ID and Client Secret
5. Add to backend/.env:
   ```
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ```

**Scopes Required:**
- `ZohoBooks.fullaccess.all`
- `ZohoBooks.accountants.READ`
- `ZohoBooks.invoices.READ`
- `ZohoBooks.bills.READ`

**Local Development:**
- Homepage URL: `http://localhost:8001`
- Redirect URI: `http://localhost:8001/api/auth/zoho/callback`

---

### 3. HubSpot OAuth App

**Application Settings:**
- **App Name**: Startup Progress Intelligence Platform
- **Public App URL**: `https://your-app-name.emergentagent.com`
- **Redirect URL**: `https://your-app-name.emergentagent.com/api/auth/hubspot/callback`

**Where to Configure:**
1. Go to HubSpot Developers (https://developers.hubspot.com/)
2. Create a new app
3. Navigate to Auth tab
4. Add redirect URL: `https://your-app-name.emergentagent.com/api/auth/hubspot/callback`
5. Copy App ID and Client Secret
6. Add to backend/.env:
   ```
   HUBSPOT_CLIENT_ID=your_app_id
   HUBSPOT_CLIENT_SECRET=your_client_secret
   ```

**Scopes Required:**
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.companies.read`
- `crm.objects.companies.write`
- `crm.objects.deals.read`

**Local Development:**
- Public App URL: `http://localhost:8001`
- Redirect URL: `http://localhost:8001/api/auth/hubspot/callback`

---

### 4. Jira Cloud OAuth 2.0 (3LO)

**Note**: Jira requires OAuth 2.0 (3LO) for cloud integrations via Atlassian.

**Application Settings:**
- **App Name**: Startup Progress Intelligence Platform
- **Website**: `https://your-app-name.emergentagent.com`
- **Privacy Policy**: `https://your-app-name.emergentagent.com/privacy`
- **Terms of Use**: `https://your-app-name.emergentagent.com/terms`
- **Callback URL**: `https://your-app-name.emergentagent.com/api/auth/jira/callback`

**Where to Configure:**
1. Go to Atlassian Developer Console (https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth 2.0 integration
3. Under "Authorization" → "OAuth 2.0 (3LO)"
4. Add callback URL: `https://your-app-name.emergentagent.com/api/auth/jira/callback`
5. Copy Client ID and Secret
6. Add to backend/.env:
   ```
   JIRA_CLIENT_ID=your_client_id
   JIRA_CLIENT_SECRET=your_client_secret
   ```

**Scopes Required:**
- `read:jira-work`
- `read:jira-user`
- `offline_access` (for refresh tokens)

**Local Development:**
- Website: `http://localhost:8001`
- Callback URL: `http://localhost:8001/api/auth/jira/callback`

---

## 🔑 API Keys (Non-OAuth Integrations)

### Razorpay
**Where to Configure:**
1. Go to Razorpay Dashboard → Settings → API Keys
2. Generate Test/Live keys
3. Add to backend/.env:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=your_secret
   ```

**No OAuth Required** - Uses API key authentication configured in the platform UI.

---

## 📝 Additional Legal Pages

### Privacy Policy
**URL**: `https://your-app-name.emergentagent.com/privacy`
- Accessible without login
- Covers data collection, usage, sharing, and user rights
- Required for OAuth app verification

### Terms of Service
**URL**: `https://your-app-name.emergentagent.com/terms`
- Accessible without login
- Covers acceptable use, liability, and user agreements
- Required for OAuth app verification

---

## 🚀 Environment Variable Summary

Add these to **backend/.env** in production:

```bash
# Base URLs
APP_URL=https://your-app-name.emergentagent.com
FRONTEND_URL=https://your-app-name.emergentagent.com

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Zoho Books OAuth
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret

# HubSpot OAuth
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret

# Jira OAuth (if using)
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret

# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## ✅ OAuth Callback Flow

1. User clicks "Connect" on integration
2. Frontend redirects to: `https://your-app.emergentagent.com/api/auth/{provider}/authorize?organization_id={org_id}`
3. Backend redirects to provider's OAuth page
4. User authorizes the app
5. Provider redirects to: `https://your-app.emergentagent.com/api/auth/{provider}/callback?code=xxx`
6. Backend exchanges code for access token
7. Backend stores token in database
8. Backend redirects user back to integrations page with success/error message

---

## 🧪 Testing OAuth Flows Locally

1. Create separate OAuth apps for development with localhost URLs
2. Use ngrok or similar to expose localhost to the internet for testing webhooks
3. Set `APP_URL=https://your-ngrok-url.ngrok.io` in backend/.env
4. Update OAuth app redirect URLs to use ngrok URL

**Example ngrok setup:**
```bash
ngrok http 8001
# Use the https URL provided by ngrok as APP_URL
```

---

## 📞 Support

For questions about OAuth configuration:
- Check provider documentation links above
- Ensure redirect URLs exactly match (including trailing slashes)
- Verify scopes are correctly requested
- Check backend logs for OAuth flow errors

---

**Last Updated**: January 2026
