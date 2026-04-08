import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, AlertTriangle, Info, Bell, Check } from 'lucide-react';
import { mockStartups } from '@/data/mockData';
import { formatRelativeTime } from '@/lib/formatters';
import AlertCard from '@/components/AlertCard';
import { toast } from 'sonner';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  // Collect all alerts from startups
  const allAlerts = useMemo(() => {
    const alerts = [];
    mockStartups.forEach(startup => {
      startup.alerts.forEach(alert => {
        alerts.push({
          ...alert,
          startupName: startup.name,
          startupId: startup.id,
          startupLogo: startup.logo
        });
      });
    });
    return alerts
      .filter(a => !dismissedAlerts.includes(a.id))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [dismissedAlerts]);

  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = allAlerts.filter(a => a.severity === 'warning');
  const infoAlerts = allAlerts.filter(a => a.severity === 'info');

  const displayAlerts = useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return criticalAlerts;
      case 'warning':
        return warningAlerts;
      case 'info':
        return infoAlerts;
      default:
        return allAlerts;
    }
  }, [activeTab, allAlerts, criticalAlerts, warningAlerts, infoAlerts]);

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => [...prev, alertId]);
    toast.success('Alert dismissed');
  };

  const handleDismissAll = () => {
    const allAlertIds = displayAlerts.map(a => a.id);
    setDismissedAlerts(prev => [...prev, ...allAlertIds]);
    toast.success(`${displayAlerts.length} alerts dismissed`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Alerts & Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor critical issues and important updates across your portfolio
          </p>
        </div>
        {displayAlerts.length > 0 && (
          <Button onClick={handleDismissAll} variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Dismiss All
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setActiveTab('all')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-3xl font-semibold tabular-nums">{allAlerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setActiveTab('critical')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-semibold text-destructive tabular-nums">{criticalAlerts.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setActiveTab('warning')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-3xl font-semibold text-warning tabular-nums">{warningAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setActiveTab('info')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Info</p>
                <p className="text-3xl font-semibold text-primary tabular-nums">{infoAlerts.length}</p>
              </div>
              <Info className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({allAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="critical">
                Critical ({criticalAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="warning">
                Warning ({warningAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="info">
                Info ({infoAlerts.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {displayAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts</h3>
              <p className="text-sm text-muted-foreground">
                You're all caught up! No {activeTab !== 'all' ? activeTab : ''} alerts to review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayAlerts.map(alert => (
                <div key={alert.id}>
                  <div 
                    className="flex items-center gap-2 mb-2 cursor-pointer hover:underline"
                    onClick={() => navigate(`/startup/${alert.startupId}`)}
                  >
                    <img 
                      src={alert.startupLogo} 
                      alt={alert.startupName} 
                      className="h-6 w-6 rounded"
                    />
                    <span className="text-sm font-medium">{alert.startupName}</span>
                  </div>
                  <AlertCard alert={alert} onDismiss={handleDismiss} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPage;