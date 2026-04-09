# Zoho Books Integration Setup Guide

This guide will help you obtain the necessary API credentials to integrate Zoho Books with the Startup Progress Intelligence Platform.

## Prerequisites

- A Zoho Books account (free trial or paid subscription)
- Admin access to your Zoho Books organization

---

## Step 1: Access Zoho API Console

1. Navigate to the **Zoho API Console**: [https://api-console.zoho.com/](https://api-console.zoho.com/)
2. Log in with your Zoho account credentials
3. If this is your first time, you'll see the API Console dashboard

---

## Step 2: Register Your Application

1. Click the **"Add Client"** button in the top-right corner
2. Select **"Server-based Applications"** as the client type
   - This is important because the backend server will handle the OAuth flow

3. Fill in the application details:
   - **Client Name**: `Startup Progress Intel` (or any name you prefer)
   - **Homepage URL**: `http://localhost:3000` (for development) or your production URL
   - **Authorized Redirect URI**: `http://localhost:8001/api/auth/zoho/callback`
     - ⚠️ **IMPORTANT**: This MUST match exactly (including trailing slash or lack thereof)
     - For production, use your actual backend URL: `https://your-domain.com/api/auth/zoho/callback`

4. Click **"Create"**

---

## Step 3: Obtain Your Credentials

After creating the client, you'll see your application listed. Click on it to view details:

1. **Client ID**: A long alphanumeric string (e.g., `1000.ABC123XYZ789`)
   - Copy this value

2. **Client Secret**: A secret string shown only once
   - Click **"Show"** to reveal it
   - Copy this value immediately
   - ⚠️ **IMPORTANT**: Store this securely - it won't be shown again!

---

## Step 4: Configure Your Backend

1. Open `/app/backend/.env` file

2. Add the credentials you copied:
   ```env
   ZOHO_CLIENT_ID=your_client_id_here
   ZOHO_CLIENT_SECRET=your_client_secret_here
   ZOHO_REDIRECT_URI=http://localhost:8001/api/auth/zoho/callback
   ZOHO_API_DOMAIN=https://www.zohoapis.com
   ```

3. **For different Zoho data centers**, change the `ZOHO_API_DOMAIN`:
   - US: `https://www.zohoapis.com`
   - EU: `https://www.zohoapis.eu`
   - India: `https://www.zohoapis.in`
   - Australia: `https://www.zohoapis.com.au`
   - Japan: `https://www.zohoapis.jp`
   - Canada: `https://www.zohoapis.ca`

4. Save the file

---

## Step 5: Restart Backend Server

After updating the `.env` file, restart the backend:

```bash
sudo supervisorctl restart backend
```

---

## Step 6: Test the Integration

### Test OAuth Flow

1. **Initiate OAuth**:
   ```bash
   curl "http://localhost:8001/api/auth/zoho/authorize?organization_id=default_org"
   ```
   
   Response will include an `auth_url`:
   ```json
   {
     "auth_url": "https://accounts.zoho.com/oauth/v2/auth?...",
     "message": "Redirect user to this URL to authorize Zoho Books access"
   }
   ```

2. **Authorize Access**:
   - Copy the `auth_url` and paste it in your browser
   - Log in to Zoho Books (if not already logged in)
   - Click **"Accept"** to authorize the application
   - You'll be redirected back to your callback URL
   - The response will confirm successful connection

3. **Check Connection Status**:
   ```bash
   curl "http://localhost:8001/api/auth/zoho/status?organization_id=default_org"
   ```
   
   Expected response:
   ```json
   {
     "connected": true,
     "zoho_organization": {
       "id": "60000000123",
       "name": "Your Company Name",
       "email": "admin@yourcompany.com"
     },
     "last_updated": "2024-04-15T10:30:00"
   }
   ```

4. **Fetch Financial Metrics**:
   ```bash
   curl "http://localhost:8001/api/financial/metrics?organization_id=default_org"
   ```
   
   Expected response with financial data:
   ```json
   {
     "organization_id": "default_org",
     "zoho_organization_id": "60000000123",
     "cash_balance": 150000.00,
     "accounts_receivable": 25000.00,
     "accounts_payable": 12000.00,
     "total_revenue_month": 45000.00,
     "total_expenses_month": 28000.00,
     "burn_rate_monthly": 28000.00,
     "net_burn_rate_monthly": -17000.00,
     "runway_months": null,
     ...
   }
   ```

---

## Available API Endpoints

Once connected, you can use these endpoints:

### Authentication
- `GET /api/auth/zoho/authorize?organization_id={org_id}` - Initiate OAuth
- `GET /api/auth/zoho/callback` - OAuth callback (handled automatically)
- `GET /api/auth/zoho/status?organization_id={org_id}` - Check connection status
- `DELETE /api/auth/zoho/disconnect?organization_id={org_id}` - Disconnect

### Financial Data
- `GET /api/financial/metrics?organization_id={org_id}` - Get aggregated financial metrics
- `GET /api/financial/invoices?organization_id={org_id}` - Get invoices
- `GET /api/financial/expenses?organization_id={org_id}` - Get expenses
- `GET /api/financial/accounts?organization_id={org_id}` - Get chart of accounts
- `GET /api/financial/bills?organization_id={org_id}` - Get bills

Add `&refresh=true` to `/metrics` endpoint to force fresh data fetch.

---

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Solution**: Ensure the redirect URI in Zoho API Console EXACTLY matches the one in your `.env` file:
- Check for trailing slashes
- Verify http vs https
- Confirm the port number

### Issue: "Invalid client"

**Solution**: Double-check your Client ID and Client Secret in the `.env` file.

### Issue: "No organizations found"

**Solution**: Ensure your Zoho account has at least one Zoho Books organization set up.

### Issue: "Token expired" errors

**Solution**: The token manager automatically refreshes tokens. If you see this error persistently:
1. Check backend logs: `tail -100 /var/log/supervisor/backend.err.log`
2. Verify your Client Secret is correct
3. Try disconnecting and reconnecting

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Rotate credentials** periodically
3. **Use HTTPS** in production
4. **Restrict OAuth scopes** to only what's needed
5. **Monitor API usage** to detect anomalies

---

## Next Steps

After setting up Zoho Books integration:

1. Connect to the frontend UI (coming soon)
2. Set up automated data sync schedules
3. Configure alerts for key metrics
4. Integrate additional data sources (Stripe, HubSpot, etc.)

---

## Support

If you encounter issues:
- Check backend logs: `/var/log/supervisor/backend.err.log`
- Verify MongoDB is running: `mongo --eval "db.adminCommand('ping')"`
- Test API endpoints with curl commands above
- Review Zoho API documentation: [https://www.zoho.com/books/api/v3/](https://www.zoho.com/books/api/v3/)
