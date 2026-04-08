import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Link as LinkIcon,
  AlertCircle,
  Send
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatCurrency, formatPercentage } from '@/lib/formatters';
import MetricCard from '@/components/MetricCard';
import { toast } from 'sonner';

const FounderWorkspace = () => {
  const { currentUser } = useAuth();
  const [reportNarrative, setReportNarrative] = useState('');
  const [asks, setAsks] = useState('');

  // Use the founder's startup if available
  const startup = currentUser?.startup || {
    name: 'Your Startup',
    metrics: {
      revenue: 125000,
      growthRate: 15,
      burn: 75000,
      cash: 1500000,
      runway: 20,
      headcount: 12
    },
    integrations: [
      { name: 'Zoho Books', connected: true, lastSync: new Date().toISOString(), status: 'active' },
      { name: 'HubSpot', connected: true, lastSync: new Date().toISOString(), status: 'active' }
    ]
  };

  const reportSections = [
    { name: 'Financial Metrics', status: 'complete', source: 'Zoho Books' },
    { name: 'GTM Metrics', status: 'complete', source: 'HubSpot' },
    { name: 'Product Metrics', status: 'pending', source: 'Manual' },
    { name: 'Team Updates', status: 'pending', source: 'Manual' },
    { name: 'Founder Commentary', status: reportNarrative ? 'complete' : 'pending', source: 'Manual' }
  ];

  const completedSections = reportSections.filter(s => s.status === 'complete').length;
  const completionPercentage = (completedSections / reportSections.length) * 100;

  const handleSubmitReport = () => {
    toast.success('Report submitted successfully!', {
      description: 'Your investors will be notified.'
    });
  };

  const handleConnectIntegration = (integration) => {
    toast.success(`${integration} connected!`, {
      description: 'Data will sync automatically.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Founder Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your investor reporting and data connections
        </p>
      </div>

      {/* Report Status Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Monthly Report - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Due in 5 days • {completedSections} of {reportSections.length} sections complete
              </p>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              In Progress
            </Badge>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {completionPercentage.toFixed(0)}% complete
          </p>
        </CardContent>
      </Card>

      {/* Auto-Generated Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Auto-Generated Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Monthly Revenue"
            value={startup.metrics.revenue}
            format="currency-compact"
            change={startup.metrics.growthRate}
            trend="positive"
            icon={DollarSign}
            subtitle="From Zoho Books"
          />
          <MetricCard
            title="Growth Rate"
            value={startup.metrics.growthRate}
            format="percentage"
            icon={TrendingUp}
            subtitle="Month over month"
          />
          <MetricCard
            title="Monthly Burn"
            value={startup.metrics.burn}
            format="currency-compact"
            icon={Clock}
            subtitle="From Zoho Books"
          />
          <MetricCard
            title="Team Size"
            value={startup.metrics.headcount}
            format="number"
            icon={Users}
            subtitle="Current headcount"
          />
        </div>
      </div>

      {/* Report Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportSections.map((section, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {section.status === 'complete' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">{section.name}</p>
                    <p className="text-sm text-muted-foreground">Source: {section.source}</p>
                  </div>
                </div>
                <Badge variant={section.status === 'complete' ? 'default' : 'outline'}>
                  {section.status === 'complete' ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Founder Commentary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Founder Commentary</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add context, wins, challenges, and key asks for your investors
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Executive Summary</label>
            <Textarea
              placeholder="Summarize the month's key achievements, challenges, and overall progress..."
              value={reportNarrative}
              onChange={(e) => setReportNarrative(e.target.value)}
              className="min-h-32"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Asks & Support Needed</label>
            <Textarea
              placeholder="What help do you need from your investors? (introductions, advice, capital, etc.)"
              value={asks}
              onChange={(e) => setAsks(e.target.value)}
              className="min-h-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Integrations</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your tools to automate data collection
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Zoho Books', 'HubSpot', 'Salesforce', 'Jira', 'GitHub', 'Stripe'].map((integration, idx) => {
              const connected = startup.integrations?.some(i => i.name === integration);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={
                      connected 
                        ? 'h-2 w-2 rounded-full bg-success' 
                        : 'h-2 w-2 rounded-full bg-muted-foreground'
                    } />
                    <div>
                      <p className="font-medium">{integration}</p>
                      <p className="text-xs text-muted-foreground">
                        {connected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={connected ? 'outline' : 'default'} 
                    size="sm"
                    onClick={() => !connected && handleConnectIntegration(integration)}
                  >
                    {connected ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <><LinkIcon className="h-4 w-4 mr-2" /> Connect</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline">Save Draft</Button>
        <Button onClick={handleSubmitReport}>
          <Send className="h-4 w-4 mr-2" />
          Submit Report
        </Button>
      </div>
    </div>
  );
};

export default FounderWorkspace;