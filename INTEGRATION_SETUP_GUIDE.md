# Complete Integration Setup Guide
## HubSpot, Razorpay & GitHub API Credentials

This guide will walk you through obtaining API credentials for all three integrations needed for the Startup Progress Intelligence Platform.

---

## 📋 Table of Contents
1. [HubSpot CRM Setup](#1-hubspot-crm-setup)
2. [Razorpay Payment Gateway Setup](#2-razorpay-payment-gateway-setup)
3. [GitHub API Setup](#3-github-api-setup)
4. [Environment Configuration](#4-environment-configuration)

---

## 1. HubSpot CRM Setup

### Prerequisites
- HubSpot account (free or paid)
- Admin access to your HubSpot portal

### Step-by-Step Instructions

#### A. Create a HubSpot Developer Account
1. Navigate to [HubSpot Developer Console](https://app.hubspot.com/developer)
2. Click **"Create App"** in the top-right corner
3. Fill in the app details:
   - **App Name**: `Startup Progress Monitor` (or your preferred name)
   - **App Description**: Brief description of your integration
   - **Logo**: Optional, can be added later

#### B. Configure OAuth Settings
1. In your app settings, navigate to the **"Auth"** tab
2. Configure the following:
   - **Redirect URL**: `http://localhost:8001/api/auth/hubspot/callback`
     - For production: `https://yourdomain.com/api/auth/hubspot/callback`
   - ⚠️ **IMPORTANT**: The redirect URL must match EXACTLY (including trailing slashes)

3. **Select Scopes** - Add these required scopes:
   ```
   crm.objects.contacts.read
   crm.objects.contacts.write
   crm.objects.companies.read
   crm.objects.companies.write
   crm.objects.deals.read
   crm.objects.deals.write
   crm.lists.read
   crm.schemas.contacts.read
   crm.objects.custom_objects.read
   ```

#### C. Obtain Your Credentials
1. After creating the app, you'll see:
   - **Client ID**: Copy this value (starts with a long alphanumeric string)
   - **Client Secret**: Click "Show" and copy immediately (shown only once!)
   
2. Store these securely - you won't be able to see the Client Secret again

#### D. Configure Webhook (Optional, for real-time updates)
1. Go to **"Webhooks"** tab in your app
2. Add your webhook endpoint: `https://yourdomain.com/api/webhooks/hubspot`
3. Subscribe to events:
   - `contact.creation`
   - `contact.propertyChange`
   - `deal.creation`
   - `deal.propertyChange`
   - `company.creation`
   - `company.propertyChange`

### Testing HubSpot Integration
```bash
# Test OAuth flow
curl "http://localhost:8001/api/auth/hubspot/authorize?tenant_id=test_org"

# The response will include an auth_url - open it in your browser
```

---

## 2. Razorpay Payment Gateway Setup

### Prerequisites
- Business/Individual based in India
- Valid business documents (for live mode)
- Bank account for settlements

### Step-by-Step Instructions

#### A. Create Razorpay Account
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/signup)
2. Sign up with:
   - Email address
   - Mobile number
   - Business details

3. **Verify your account**:
   - Email verification
   - Mobile OTP verification
   - Complete KYC (for live mode)

#### B. Get API Credentials

**For Test Mode (Development):**
1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Settings** → **API Keys**
3. Switch to **Test Mode** (toggle in top-left)
4. Click **"Generate Test Key"**
5. You'll receive:
   - **Key ID**: `rzp_test_xxxxxxxxxxxxx`
   - **Key Secret**: Click "Show" to reveal, then copy

**For Live Mode (Production):**
1. Complete KYC verification in dashboard
2. Submit business documents
3. After approval, switch to **Live Mode**
4. Generate Live API Keys
5. You'll receive:
   - **Key ID**: `rzp_live_xxxxxxxxxxxxx`
   - **Key Secret**: Store securely in environment variables

#### C. Configure Webhook
1. Go to **Settings** → **Webhooks**
2. Enter your webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events to subscribe:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `subscription.charged`
   - `subscription.cancelled`

4. Copy the **Webhook Secret** (for signature verification)

#### D. Setup Linked Accounts (For Split Payments - Optional)
1. Go to **Route** → **Linked Accounts**
2. Create linked accounts for each beneficiary
3. Note down the `account_id` for each linked account

### Testing Razorpay Integration
```bash
# Test creating an order
curl -X POST "http://localhost:8001/api/payments/create-order" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "INR"}'

# Use test card: 4111 1111 1111 1111
# CVV: Any 3 digits
# Expiry: Any future date
```

---

## 3. GitHub API Setup

### Prerequisites
- GitHub account
- Organization access (if integrating org-level metrics)

### Step-by-Step Instructions

#### A. Create OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in the details:
   - **Application Name**: `Startup Progress Monitor`
   - **Homepage URL**: `http://localhost:3000` (development) or your domain
   - **Application Description**: Brief description
   - **Authorization Callback URL**: `http://localhost:8001/api/auth/github/callback`
     - For production: `https://yourdomain.com/api/auth/github/callback`

4. Click **"Register Application"**

#### B. Obtain Credentials
1. After registration, you'll see:
   - **Client ID**: Copy this value
   - **Client Secret**: Click **"Generate a new client secret"**
   - Copy the Client Secret immediately (shown only once!)

#### C. Configure Permissions
The app will request these scopes during OAuth:
- `repo` - Access to repositories
- `read:org` - Read organization data
- `read:user` - Read user profile
- `read:discussion` - Read discussions

### Testing GitHub Integration
```bash
# Test OAuth flow
curl "http://localhost:8001/api/auth/github/login?tenant_id=test_org"

# The response will redirect you to GitHub for authorization
```

---

## 4. Environment Configuration

### Create Backend `.env` File

Create `/app/backend/.env` with the following:

```env
# HubSpot Configuration
HUBSPOT_CLIENT_ID=your_hubspot_client_id_here
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret_here
HUBSPOT_REDIRECT_URI=http://localhost:8001/api/auth/hubspot/callback

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# GitHub Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:8001/api/auth/github/callback

# Zoho Books (Already configured)
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REDIRECT_URI=http://localhost:8001/api/auth/zoho/callback

# MongoDB (Already configured)
MONGO_URL=mongodb://localhost:27017
DB_NAME=startup_intel

# Application
SECRET_KEY=generate-a-secure-random-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Create Frontend `.env` File

Create `/app/frontend/.env` with:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_HUBSPOT_CLIENT_ID=your_hubspot_client_id_here
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id_here
```

### Generate Secure Keys

For `SECRET_KEY`, use Python to generate a cryptographically secure key:

```python
import secrets
print(secrets.token_urlsafe(32))
```

---

## 🔒 Security Best Practices

### 1. Never Commit Credentials
Add to `.gitignore`:
```
.env
.env.local
.env.production
*.key
*.pem
```

### 2. Use Different Credentials Per Environment
- **Development**: Test mode keys with limited permissions
- **Staging**: Separate test accounts
- **Production**: Live keys with full security enabled

### 3. Rotate Keys Regularly
- Rotate API keys every 90 days
- Rotate webhook secrets every 6 months
- Immediately rotate if compromised

### 4. Limit Scope Permissions
- Only request the minimum scopes needed
- Review and remove unused permissions
- Document why each scope is required

### 5. Enable 2FA
- Enable two-factor authentication on all service accounts
- Use authenticator apps (not SMS)

---

## 🧪 Testing Checklist

### HubSpot
- [ ] OAuth flow completes successfully
- [ ] Can fetch contacts from HubSpot
- [ ] Can fetch deals and pipeline data
- [ ] Webhook receives events correctly

### Razorpay
- [ ] Can create payment orders
- [ ] Test card payments work
- [ ] Webhook signature verification passes
- [ ] Can fetch transaction history

### GitHub
- [ ] OAuth flow completes successfully
- [ ] Can fetch repositories
- [ ] Can fetch commits and PRs
- [ ] Can access organization data

---

## 🆘 Troubleshooting

### Common Issues

**HubSpot: "Redirect URI Mismatch"**
- Ensure the redirect URI in your app matches exactly (including http/https and trailing slash)
- Check if you're using localhost vs 127.0.0.1

**Razorpay: "Invalid Signature"**
- Verify webhook secret is correctly configured
- Check that you're using the raw request body for signature verification
- Ensure webhook URL is publicly accessible (use ngrok for local testing)

**GitHub: "Bad credentials"**
- Verify Client ID and Secret are correct
- Check if the OAuth app is active
- Ensure you're using the correct API version headers

**General: "CORS Error"**
- Add your frontend URL to CORS allowed origins in backend
- Check that credentials are included in requests
- Verify preflight requests are handled

---

## 📞 Support Resources

- **HubSpot**: https://developers.hubspot.com/docs
- **Razorpay**: https://razorpay.com/docs/
- **GitHub**: https://docs.github.com/en/developers

---

## ✅ Next Steps

After obtaining all credentials:

1. **Update Environment Files**: Add all credentials to `.env` files
2. **Restart Backend**: `sudo supervisorctl restart backend`
3. **Test OAuth Flows**: Visit each integration's authorization endpoint
4. **Verify Data Sync**: Ensure data is being fetched and stored correctly
5. **Enable Webhooks**: Configure webhook endpoints for real-time updates

---

**Ready to integrate?** Once you've completed this setup, all three integrations will be ready to connect!
