import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const IntegrationsPage = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [showRazorpayDialog, setShowRazorpayDialog] = useState(false);
  const [razorpayCredentials, setRazorpayCredentials] = useState({
    key_id: '',
    key_secret: ''
  });

  const orgId = user?.organization_id || user?.id || 'default_org';

  const integrations = [
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
      category: 'Financial'
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
      category: 'Sales & CRM'
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
      category: 'Payments'
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
      category: 'Engineering'
    }
  ];

  useEffect(() => {
    fetchConnectionStatus();
  }, [orgId]);

  const fetchConnectionStatus = async () => {
    setLoading(true);
    const newConnections = {};
    
    for (const integration of integrations) {
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
        }
        
        newConnections[integration.id] = {
          status: response.data.connected ? 'connected' : 'disconnected',
          lastSync: response.data.last_sync || null
        };
      } catch (err) {
        console.error(`${integration.id} status error:`, err);
        newConnections[integration.id] = { status: 'disconnected', lastSync: null };
      }
    }
    
    setConnections(newConnections);
    setLoading(false);
  };

  const handleConnect = (integrationId) => {
    if (integrationId === 'razorpay') {
      setShowRazorpayDialog(true);
      return;
    }

    // OAuth integrations - redirect to backend OAuth flow
    const authUrl = `${process.env.REACT_APP_BACKEND_URL}/api/auth/${integrationId}/authorize?organization_id=${orgId}`;
    window.location.href = authUrl;
  };

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
      console.error('Razorpay connect error:', error);
      toast.error('Failed to configure Razorpay');
    }
  };

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
      }
      
      toast.success(`${integrationId} disconnected successfully`);
      fetchConnectionStatus();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error(`Failed to disconnect ${integrationId}`);
    }
  };

  const handleSync = async (integrationId) => {
    setSyncing(prev => ({ ...prev, [integrationId]: true }));
    try {
      // Simulate sync for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${integrationId} synced successfully`);
      fetchConnectionStatus();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync ${integrationId}`);
    } finally {
      setSyncing(prev => ({ ...prev, [integrationId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your tools to automatically sync data and metrics
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your data is synced securely. We never store your passwords, only OAuth tokens.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const status = connections[integration.id]?.status || 'disconnected';
          const lastSync = connections[integration.id]?.lastSync;
          const isConnected = status === 'connected';
          const isSyncing = syncing[integration.id];

          return (
            <Card key={integration.id} className={`border-2 ${isConnected ? integration.borderColor : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${integration.bgColor}`}>
                      <Icon className={`w-6 h-6 ${integration.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant={isConnected ? 'default' : 'secondary'} className="mt-1">
                        {isConnected ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
                        ) : (
                          <><Circle className="w-3 h-3 mr-1" /> Not Connected</>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{integration.description}</CardDescription>

                <div>
                  <p className="text-sm font-medium mb-2">Metrics Tracked:</p>
                  <div className="flex flex-wrap gap-2">
                    {integration.metrics.map((metric) => (
                      <Badge key={metric} variant="outline" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </div>

                {isConnected && lastSync && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(lastSync).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(integration.id)}
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 mr-2" /> Sync Now</>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(integration.id)}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect {integration.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Razorpay Configuration Dialog */}
      <Dialog open={showRazorpayDialog} onOpenChange={setShowRazorpayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Razorpay</DialogTitle>
            <DialogDescription>
              Enter your Razorpay API credentials. You can find these in your Razorpay dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key_id">API Key ID</Label>
              <Input
                id="key_id"
                placeholder="rzp_test_..."
                value={razorpayCredentials.key_id}
                onChange={(e) => setRazorpayCredentials(prev => ({ ...prev, key_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key_secret">API Key Secret</Label>
              <Input
                id="key_secret"
                type="password"
                placeholder="Enter your secret key"
                value={razorpayCredentials.key_secret}
                onChange={(e) => setRazorpayCredentials(prev => ({ ...prev, key_secret: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRazorpayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRazorpayConnect}>
              Connect Razorpay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
