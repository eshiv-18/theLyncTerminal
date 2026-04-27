/**
 * IntegrationsPage.jsx — Premium redesign
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2, Circle, RefreshCw, AlertCircle, DollarSign, Users, Code,
  FileText, ExternalLink, Loader2, Zap, Shield, ArrowRight, Plug2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const INTEGRATIONS = [
  {
    id: 'zoho', name: 'Zoho Books',
    description: 'Financial data, invoices, expenses, and cash flow tracking',
    icon: FileText,
    img: '/images/finance.png',
    gradient: 'from-[#0055BE] to-[#003D8F]',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    accentText: 'text-[#0055BE] dark:text-blue-400',
    borderActive: 'border-[#0055BE]/30 dark:border-blue-800',
    metrics: ['Cash Balance', 'Revenue', 'Burn Rate', 'Runway'],
    authType: 'oauth', category: 'Financial',
  },
  {
    id: 'hubspot', name: 'HubSpot CRM',
    description: 'Sales pipeline, contacts, companies, and deal tracking',
    icon: Users,
    img: '/images/sales.png',
    gradient: 'from-[#0055BE] to-[#3B82F6]',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    accentText: 'text-[#0055BE] dark:text-blue-400',
    borderActive: 'border-[#0055BE]/30 dark:border-blue-800',
    metrics: ['Pipeline Value', 'Deal Stages', 'Contacts', 'Companies'],
    authType: 'oauth', category: 'Sales & CRM',
  },
  {
    id: 'razorpay', name: 'Razorpay',
    description: 'Payment transactions, subscriptions, and revenue metrics',
    icon: DollarSign,
    img: '/images/revenue.png',
    gradient: 'from-[#003D8F] to-[#0055BE]',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    accentText: 'text-[#0055BE] dark:text-blue-400',
    borderActive: 'border-[#0055BE]/30 dark:border-blue-800',
    metrics: ['MRR', 'ARR', 'Transactions', 'Churn'],
    authType: 'api_key', category: 'Payments',
  },
  {
    id: 'github', name: 'GitHub',
    description: 'Code metrics, commits, pull requests, and contributor activity',
    icon: Code,
    img: '/images/development.png',
    gradient: 'from-[#0055BE] to-[#002D62]',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    accentText: 'text-[#0055BE] dark:text-blue-400',
    borderActive: 'border-[#0055BE]/30 dark:border-blue-800',
    metrics: ['Commits', 'PRs', 'Contributors', 'Velocity'],
    authType: 'oauth', category: 'Engineering',
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
            case 'zoho': response = await api.integrations.zoho.getStatus(orgId); break;
            case 'hubspot': response = await api.integrations.hubspot.getStatus(orgId); break;
            case 'razorpay': response = await api.integrations.razorpay.getStatus(orgId); break;
            case 'github': response = await api.integrations.github.getStatus(orgId); break;
            default: return;
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

  useEffect(() => { fetchConnectionStatus(); }, [fetchConnectionStatus]);

  const handleConnect = async (integrationId) => {
    if (integrationId === 'razorpay') { setShowRazorpayDialog(true); return; }
    if (!orgId) { toast.error('Missing organization ID. Complete onboarding first.'); return; }
    setConnecting((prev) => ({ ...prev, [integrationId]: true }));
    try {
      let response;
      switch (integrationId) {
        case 'zoho': response = await api.integrations.zoho.initiateAuth(orgId); break;
        case 'hubspot': response = await api.integrations.hubspot.initiateAuth(orgId); break;
        case 'github': response = await api.integrations.github.initiateAuth(orgId); break;
        default: return;
      }
      if (response?.data?.auth_url) window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(`Failed to start ${integrationId} connection: ${error.message}`);
      setConnecting((prev) => ({ ...prev, [integrationId]: false }));
    }
  };

  const handleRazorpayConnect = async () => {
    if (!razorpayCredentials.key_id || !razorpayCredentials.key_secret) {
      toast.error('Please enter both Key ID and Key Secret'); return;
    }
    try {
      await api.integrations.razorpay.configure(orgId, razorpayCredentials);
      toast.success('Razorpay connected successfully!');
      setShowRazorpayDialog(false);
      setRazorpayCredentials({ key_id: '', key_secret: '' });
      fetchConnectionStatus();
    } catch { toast.error('Failed to configure Razorpay'); }
  };

  const handleDisconnect = async (integrationId) => {
    try {
      switch (integrationId) {
        case 'zoho': await api.integrations.zoho.disconnect(orgId); break;
        case 'hubspot': await api.integrations.hubspot.disconnect(orgId); break;
        case 'razorpay': await api.integrations.razorpay.disconnect(orgId); break;
        case 'github': await api.integrations.github.disconnect(orgId); break;
        default: return;
      }
      toast.success(`Disconnected ${integrationId}`);
      fetchConnectionStatus();
    } catch { toast.error(`Failed to disconnect ${integrationId}`); }
  };

  const handleSync = async (integrationId) => {
    setSyncing((prev) => ({ ...prev, [integrationId]: true }));
    try {
      if (integrationId === 'github') { await api.github.sync(orgId); toast.success('GitHub data synced'); }
      else if (integrationId === 'zoho') { await api.financial.getMetrics(orgId); toast.success('Zoho data synced'); }
      fetchConnectionStatus();
    } catch (error) { toast.error(`Sync failed: ${error.message}`); }
    finally { setSyncing((prev) => ({ ...prev, [integrationId]: false })); }
  };

  if (!orgId) return (
    <div className="p-8">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0"/>
        <p className="text-sm text-amber-700 dark:text-amber-300">Your account is not linked to an organization. Please complete onboarding first.</p>
      </div>
    </div>
  );

  const connectedCount = Object.values(connections).filter(c => c.status === 'connected').length;

  return (
    <div className="py-8 px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0055BE] to-[#003D8F] flex items-center justify-center shadow-lg shadow-[#0055BE]/20">
              <Plug2 className="h-5 w-5 text-white"/>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Integrations</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Connect your tools to automatically sync data and metrics.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className={`h-2 w-2 rounded-full ${connectedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{connectedCount}/{INTEGRATIONS.length} active</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchConnectionStatus} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`}/>
            Refresh
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {!loading && connectedCount > 0 && (
        <div className="mb-6 p-4 rounded-xl glass-accent">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#0055BE] dark:text-blue-400"/>
            <p className="text-sm font-medium text-[#0055BE] dark:text-blue-300">
              {connectedCount} integration{connectedCount > 1 ? 's' : ''} actively syncing data to your dashboard
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#0055BE]"/>
          <span className="text-sm text-slate-500">Checking connection status…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {INTEGRATIONS.map((integration) => {
            const conn = connections[integration.id] || {};
            const isConnected = conn.status === 'connected';
            const isConnecting = !!connecting[integration.id];
            const isSyncing = !!syncing[integration.id];
            const Icon = integration.icon;

            return (
              <div key={integration.id}
                className={`group relative glass-card rounded-2xl transition-all duration-300 overflow-hidden ${
                  isConnected ? `${integration.borderActive}` : ''
                }`}>

                {/* Top gradient accent bar */}
                <div className={`h-1 bg-gradient-to-r ${integration.gradient} ${isConnected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} transition-opacity`}/>

                <div className="p-6">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-white/60 dark:bg-slate-800/60 shadow-sm border border-white/40 dark:border-slate-700/40">
                        <img src={integration.img} alt={integration.name} className="w-9 h-9 object-contain"/>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{integration.name}</h3>
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{integration.category}</p>
                      </div>
                    </div>
                    <Badge variant="secondary"
                      className={isConnected
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}>
                      {isConnected
                        ? <><CheckCircle2 className="h-3 w-3 mr-1"/>Connected</>
                        : <><Circle className="h-3 w-3 mr-1"/>Inactive</>}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{integration.description}</p>

                  {/* Metrics pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {integration.metrics.map((metric) => (
                      <span key={metric}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          isConnected
                            ? `${integration.lightBg} ${integration.accentText}`
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                        }`}>
                        {metric}
                      </span>
                    ))}
                  </div>

                  {/* Connected details */}
                  {isConnected && (
                    <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      {conn.detail?.github_account?.username && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Code className="h-3 w-3 text-slate-400"/>Connected as <strong className="font-semibold">@{conn.detail.github_account.username}</strong>
                        </p>
                      )}
                      {conn.detail?.zoho_organization?.name && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-slate-400"/>Organization: <strong className="font-semibold">{conn.detail.zoho_organization.name}</strong>
                        </p>
                      )}
                      {conn.lastSync && (
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3"/>Last synced: {new Date(conn.lastSync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {isConnected ? (
                      <>
                        {(integration.id === 'github' || integration.id === 'zoho') && (
                          <Button size="sm" variant="outline" onClick={() => handleSync(integration.id)} disabled={isSyncing}
                            className="rounded-lg">
                            {isSyncing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5"/> : <RefreshCw className="h-3 w-3 mr-1.5"/>}
                            Sync Now
                          </Button>
                        )}
                        <Button size="sm" variant="outline"
                          className="rounded-lg text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={() => handleDisconnect(integration.id)}>
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => handleConnect(integration.id)} disabled={isConnecting}
                        className={`rounded-lg bg-gradient-to-r ${integration.gradient} hover:opacity-90 text-white shadow-sm border-0`}>
                        {isConnecting
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5"/>Connecting…</>
                          : <><Zap className="h-3 w-3 mr-1.5"/>Connect</>}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Razorpay API-key dialog */}
      <Dialog open={showRazorpayDialog} onOpenChange={setShowRazorpayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Razorpay</DialogTitle>
            <DialogDescription>
              Enter your Razorpay API credentials. You can find these in your Razorpay Dashboard under Settings → API Keys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key_id">Key ID</Label>
              <Input id="key_id" placeholder="rzp_live_..." value={razorpayCredentials.key_id}
                onChange={(e) => setRazorpayCredentials((p) => ({ ...p, key_id: e.target.value }))}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key_secret">Key Secret</Label>
              <Input id="key_secret" type="password" placeholder="Your Razorpay secret" value={razorpayCredentials.key_secret}
                onChange={(e) => setRazorpayCredentials((p) => ({ ...p, key_secret: e.target.value }))}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRazorpayDialog(false)}>Cancel</Button>
            <Button onClick={handleRazorpayConnect} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">Connect Razorpay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;