/**
 * IntegrationsPage.jsx
 *
 * FIXES APPLIED:
 *  1. handleConnect: was using window.location.origin (frontend port) → now calls backend
 *     /authorize endpoint to get auth_url, then redirects browser to that URL.
 *  2. Zoho disconnect: changed from POST to DELETE (matches backend route).
 *  3. GitHub disconnect: changed from POST to DELETE (matches backend route).
 *  4. orgId: uses user.organization_id ?? user.startup?.id ?? user.id — never 'default_org'.
 *  5. Shows connected metrics from DB (via status response) on the card.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Circle,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Users,
  Code,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const INTEGRATIONS = [
  {
    id: 'zoho',
    name: 'Zoho Books',
    description: 'Financial data, invoices, expenses, and cash flow tracking',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    metrics: ['Cash Balance', 'Revenue', 'Burn Rate', 'Runway'],
    authType: 'oauth',
    category: 'Financial',
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Sales pipeline, contacts, companies, and deal tracking',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    metrics: ['Pipeline Value', 'Deal Stages', 'Contacts', 'Companies'],
    authType: 'oauth',
    category: 'Sales & CRM',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Payment transactions, subscriptions, and revenue metrics',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    metrics: ['MRR', 'ARR', 'Transactions', 'Churn'],
    authType: 'api_key',
    category: 'Payments',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code metrics, commits, pull requests, and contributor activity',
    icon: Code,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    metrics: ['Commits', 'PRs', 'Contributors', 'Velocity'],
    authType: 'oauth',
    category: 'Engineering',
  },
];

const IntegrationsPage = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState({});
  const [syncing, setSyncing] = useState({});
  const [showRazorpayDialog, setShowRazorpayDialog] = useState(false);
  const [razorpayCredentials, setRazorpayCredentials] = useState({ key_id: '', key_secret: '' });

  // FIX: Stable org ID — never fall back to 'default_org'. Use user.organization_id,
  // or the startup.id embedded in the user object (set by /api/auth/me for founders),
  // or finally user.id as a last resort. 'default_org' caused tokens to be stored
  // under a shared key and lost after re-login.
  const orgId = user?.organization_id ?? user?.startup?.id ?? user?.id;

  const fetchConnectionStatus = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const newConnections = {};

    await Promise.allSettled(
      INTEGRATIONS.map(async (integration) => {
        try {
          let response;
          switch (integration.id) {
            case 'zoho':
              response = await api.integrations.zoho.getStatus(orgId);
              break;
            case 'hubspot':
              response = await api.integrations.hubspot.getStatus(orgId);
              break;
            case 'razorpay':
              response = await api.integrations.razorpay.getStatus(orgId);
              break;
            case 'github':
              response = await api.integrations.github.getStatus(orgId);
              break;
            default:
              return;
          }
          newConnections[integration.id] = {
            status: response.data.connected ? 'connected' : 'disconnected',
            lastSync: response.data.last_updated || null,
            detail: response.data,
          };
        } catch {
          newConnections[integration.id] = { status: 'disconnected', lastSync: null };
        }
      })
    );

    setConnections(newConnections);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  // ─── OAuth connect ────────────────────────────────────────────────────────
  // FIX: Was building URL from window.location.origin (frontend = port 3000).
  //   Backend is on a different port / domain. We now call the backend
  //   /authorize endpoint which returns the real GitHub/Zoho redirect URL,
  //   then redirect the browser there.
  const handleConnect = async (integrationId) => {
    if (integrationId === 'razorpay') {
      setShowRazorpayDialog(true);
      return;
    }

    if (!orgId) {
      toast.error('Your account is missing an organization ID. Please complete onboarding first.');
      return;
    }

    setConnecting((prev) => ({ ...prev, [integrationId]: true }));
    try {
      // Call backend to get the OAuth authorization URL
      let response;
      switch (integrationId) {
        case 'zoho':
          response = await api.integrations.zoho.initiateAuth(orgId);
          break;
        case 'hubspot':
          response = await api.integrations.hubspot.initiateAuth(orgId);
          break;
        case 'github':
          response = await api.integrations.github.initiateAuth(orgId);
          break;
        default:
          return;
      }
      // The helper in api.js already redirects — this line is a safety fallback
      if (response?.data?.auth_url) {
        window.location.href = response.data.auth_url;
      }
    } catch (error) {
      toast.error(`Failed to start ${integrationId} connection: ${error.message}`);
      setConnecting((prev) => ({ ...prev, [integrationId]: false }));
    }
  };

  // ─── Razorpay API-key connect ─────────────────────────────────────────────
  const handleRazorpayConnect = async () => {
    if (!razorpayCredentials.key_id || !razorpayCredentials.key_secret) {
      toast.error('Please enter both Key ID and Key Secret');
      return;
    }
    try {
      await api.integrations.razorpay.configure(orgId, razorpayCredentials);
      toast.success('Razorpay connected successfully!');
      setShowRazorpayDialog(false);
      setRazorpayCredentials({ key_id: '', key_secret: '' });
      fetchConnectionStatus();
    } catch (error) {
      toast.error('Failed to configure Razorpay');
    }
  };

  // ─── Disconnect ───────────────────────────────────────────────────────────
  // FIX: Zoho + GitHub now use DELETE (was POST — backend routes are @router.delete)
  const handleDisconnect = async (integrationId) => {
    try {
      switch (integrationId) {
        case 'zoho':
          await api.integrations.zoho.disconnect(orgId);
          break;
        case 'hubspot':
          await api.integrations.hubspot.disconnect(orgId);
          break;
        case 'razorpay':
          await api.integrations.razorpay.disconnect(orgId);
          break;
        case 'github':
          await api.integrations.github.disconnect(orgId);
          break;
        default:
          return;
      }
      toast.success(`Disconnected ${integrationId}`);
      fetchConnectionStatus();
    } catch (error) {
      toast.error(`Failed to disconnect ${integrationId}`);
    }
  };

  // ─── Manual sync ─────────────────────────────────────────────────────────
  const handleSync = async (integrationId) => {
    setSyncing((prev) => ({ ...prev, [integrationId]: true }));
    try {
      if (integrationId === 'github') {
        await api.github.sync(orgId);
        toast.success('GitHub data synced');
      } else if (integrationId === 'zoho') {
        await api.financial.getMetrics(orgId); // triggers a fresh fetch
        toast.success('Zoho data synced');
      }
      fetchConnectionStatus();
    } catch (error) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing((prev) => ({ ...prev, [integrationId]: false }));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!orgId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account is not linked to an organization yet. Please complete onboarding first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your tools to automatically sync data and metrics to your dashboard.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking connection status…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATIONS.map((integration) => {
            const conn = connections[integration.id] || {};
            const isConnected = conn.status === 'connected';
            const isConnecting = !!connecting[integration.id];
            const isSyncing = !!syncing[integration.id];
            const Icon = integration.icon;

            return (
              <Card
                key={integration.id}
                className={`border ${isConnected ? 'border-green-200' : integration.borderColor}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${integration.bgColor}`}>
                        <Icon className={`h-5 w-5 ${integration.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {integration.category}
                        </CardDescription>
                      </div>
                    </div>

                    <Badge
                      variant={isConnected ? 'default' : 'secondary'}
                      className={isConnected ? 'bg-green-100 text-green-700 border-green-200' : ''}
                    >
                      {isConnected ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />Connected</>
                      ) : (
                        <><Circle className="h-3 w-3 mr-1" />Not connected</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {integration.description}
                  </p>

                  {/* Metrics pills */}
                  <div className="flex flex-wrap gap-1">
                    {integration.metrics.map((metric) => (
                      <span
                        key={metric}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>

                  {/* Last sync timestamp */}
                  {isConnected && conn.lastSync && (
                    <p className="text-xs text-gray-400">
                      Last synced: {new Date(conn.lastSync).toLocaleString()}
                    </p>
                  )}

                  {/* Connected account detail */}
                  {isConnected && conn.detail?.github_account?.username && (
                    <p className="text-xs text-gray-500">
                      Connected as <strong>@{conn.detail.github_account.username}</strong>
                    </p>
                  )}
                  {isConnected && conn.detail?.zoho_organization?.name && (
                    <p className="text-xs text-gray-500">
                      Organization: <strong>{conn.detail.zoho_organization.name}</strong>
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {isConnected ? (
                      <>
                        {(integration.id === 'github' || integration.id === 'zoho') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(integration.id)}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Sync
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(integration.id)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" />Connecting…</>
                        ) : (
                          <><ExternalLink className="h-3 w-3 mr-1" />Connect</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Razorpay API-key dialog */}
      <Dialog open={showRazorpayDialog} onOpenChange={setShowRazorpayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Razorpay</DialogTitle>
            <DialogDescription>
              Enter your Razorpay API credentials. You can find these in your Razorpay Dashboard
              under Settings → API Keys.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key_id">Key ID</Label>
              <Input
                id="key_id"
                placeholder="rzp_live_..."
                value={razorpayCredentials.key_id}
                onChange={(e) =>
                  setRazorpayCredentials((p) => ({ ...p, key_id: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key_secret">Key Secret</Label>
              <Input
                id="key_secret"
                type="password"
                placeholder="Your Razorpay secret"
                value={razorpayCredentials.key_secret}
                onChange={(e) =>
                  setRazorpayCredentials((p) => ({ ...p, key_secret: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRazorpayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRazorpayConnect}>Connect Razorpay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;