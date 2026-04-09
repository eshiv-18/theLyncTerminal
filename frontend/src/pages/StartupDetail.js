import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  ExternalLink,
  FileText,
  Activity,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { mockStartups } from '@/data/mockData';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercentage, 
  formatDate,
  formatRelativeTime,
  formatRunway,
  getChartColor
} from '@/lib/formatters';
import MetricCard from '@/components/MetricCard';
import HealthBadge from '@/components/HealthBadge';
import AlertCard from '@/components/AlertCard';
import ActivityFeedItem from '@/components/ActivityFeedItem';
import api from '../services/api';
import { toast } from 'sonner';

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStartupDetails();
  }, [id]);

  const fetchStartupDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.startups.getById(id);
      
      // Transform API data to match component structure
      const apiStartup = response.data;
      const transformedStartup = {
        id: apiStartup.id,
        name: apiStartup.name,
        logo: apiStartup.logo_url,
        description: apiStartup.description,
        website: apiStartup.website,
        sector: 'SaaS', // Default
        stage: apiStartup.stage,
        health: apiStartup.health_status,
        healthScore: apiStartup.health_score,
        fundingAmount: apiStartup.funding_amount,
        valuation: apiStartup.valuation,
        founderName: apiStartup.founder_name,
        metrics: {
          mrr: apiStartup.metrics.mrr,
          arr: apiStartup.metrics.arr,
          revenue: apiStartup.metrics.revenue,
          growthRate: apiStartup.metrics.growth_rate,
          runway: apiStartup.metrics.runway_months,
          netBurn: apiStartup.metrics.burn_rate,
          cashBalance: apiStartup.metrics.cash_balance,
          teamSize: apiStartup.metrics.headcount,
          customers: apiStartup.metrics.customer_count,
          // Mock historical data for now (would come from API)
          revenueHistory: [],
          burnHistory: [],
          cashHistory: []
        },
        integrations: apiStartup.integrations.map(i => ({
          name: i.name,
          status: i.connected ? 'connected' : 'disconnected',
          lastSync: i.last_sync
        })),
        alerts: [], // Would fetch separately
        activities: [], // Would fetch separately
        lastUpdate: apiStartup.updated_at
      };
      
      setStartup(transformedStartup);
    } catch (err) {
      console.error('Failed to fetch startup details:', err);
      setError(err.response?.data?.detail || 'Failed to load startup details');
      
      // Fallback to mock data
      const mockStartup = mockStartups.find(s => s.id === id);
      if (mockStartup) {
        setStartup(mockStartup);
        toast.warning('Showing demo data - API unavailable');
      } else {
        toast.error('Startup not found');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const startupToUse = startup;

  if (!startupToUse) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h2 className="text-2xl font-semibold">Startup not found</h2>
          <p className="text-muted-foreground">The startup you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/portfolio')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolio
          </Button>
        </div>
      </div>
    );
  }

  // Prepare combined financial data
  const financialData = startupToUse.metrics.revenueHistory?.length > 0
    ? startupToUse.metrics.revenueHistory.map((item, idx) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        revenue: item.value,
        burn: startupToUse.metrics.burnHistory[idx]?.value || 0,
        cash: startupToUse.metrics.cashHistory[idx]?.value || 0
      }))
    : []; // Empty if no historical data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button 
            onClick={() => navigate('/portfolio')} 
            variant="outline" 
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-start gap-4">
            <img 
              src={startupToUse.logo} 
              alt={startupToUse.name} 
              className="h-16 w-16 rounded-xl border"
            />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold">{startupToUse.name}</h1>
                <HealthBadge health={startupToUse.health} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{startupToUse.sector}</span>
                <span>•</span>
                <span>{startupToUse.stage}</span>
                <span>•</span>
                <span>{startupToUse.businessModel}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {startupToUse.founders.map((founder, idx) => (
                  <Badge key={idx} variant="outline">
                    {founder.name} - {founder.role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Last updated</p>
          <p className="font-medium">{formatRelativeTime(startupToUse.reporting.lastReport)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Data freshness: {startupToUse.dataFreshness}%
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={startupToUse.metrics.revenue}
          format="currency-compact"
          change={startupToUse.metrics.growthRate}
          trend="positive"
          icon={DollarSign}
        />
        <MetricCard
          title="Growth Rate"
          value={startupToUse.metrics.growthRate}
          format="percentage"
          icon={TrendingUp}
        />
        <MetricCard
          title="Monthly Burn"
          value={startupToUse.metrics.burn}
          format="currency-compact"
          icon={Activity}
        />
        <MetricCard
          title="Runway"
          value={startupToUse.metrics.runway.toFixed(1)}
          subtitle="months"
          format="number"
          icon={Clock}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => formatCurrency(value, true)}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={getChartColor(0)} 
                      strokeWidth={2}
                      name="Revenue"
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="burn" 
                      stroke={getChartColor(2)} 
                      strokeWidth={2}
                      name="Burn"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Headcount</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {startupToUse.metrics.headcount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cash Balance</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(startupToUse.metrics.cash, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Net Burn</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(startupToUse.metrics.netBurn, true)}
                  </span>
                </div>
                {startupToUse.businessModel === 'SaaS' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ARR</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatCurrency(startupToUse.metrics.arr, true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">NRR</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatPercentage(startupToUse.metrics.nrr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Churn Rate</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatPercentage(startupToUse.metrics.churnRate)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {startupToUse.alerts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {startupToUse.alerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {startupToUse.integrations.map((integration, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className={
                      integration.status === 'active' 
                        ? 'h-2 w-2 rounded-full bg-success' 
                        : 'h-2 w-2 rounded-full bg-destructive'
                    } />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(integration.lastSync)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cash Runway Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => formatCurrency(value, true)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="cash" 
                    stroke={getChartColor(1)} 
                    fill={getChartColor(1)}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Cash Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => formatCurrency(value, true)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={getChartColor(0)} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Burn Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => formatCurrency(value, true)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="burn" 
                      stroke={getChartColor(2)} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          {startupToUse.businessModel === 'SaaS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="ARR"
                value={startupToUse.metrics.arr}
                format="currency-compact"
              />
              <MetricCard
                title="Net Revenue Retention"
                value={startupToUse.metrics.nrr}
                format="percentage"
              />
              <MetricCard
                title="Churn Rate"
                value={startupToUse.metrics.churnRate}
                format="percentage"
              />
              <MetricCard
                title="CAC"
                value={startupToUse.metrics.cac}
                format="currency-compact"
              />
              <MetricCard
                title="LTV"
                value={startupToUse.metrics.ltv}
                format="currency-compact"
              />
              <MetricCard
                title="Gross Margin"
                value={startupToUse.metrics.grossMargin}
                format="percentage"
              />
            </div>
          )}
          {startupToUse.businessModel === 'Marketplace' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="GMV"
                value={startupToUse.metrics.gmv}
                format="currency-compact"
              />
              <MetricCard
                title="Take Rate"
                value={startupToUse.metrics.takeRate}
                format="percentage"
              />
              <MetricCard
                title="Active Buyers"
                value={startupToUse.metrics.buyers}
                format="compact"
              />
              <MetricCard
                title="Active Sellers"
                value={startupToUse.metrics.sellers}
                format="compact"
              />
            </div>
          )}
          {startupToUse.businessModel === 'Consumer' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="MAU"
                value={startupToUse.metrics.mau}
                format="compact"
              />
              <MetricCard
                title="DAU"
                value={startupToUse.metrics.dau}
                format="compact"
              />
              <MetricCard
                title="Activation Rate"
                value={startupToUse.metrics.activationRate}
                format="percentage"
              />
              <MetricCard
                title="D30 Retention"
                value={startupToUse.metrics.retentionD30}
                format="percentage"
              />
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {startupToUse.recentActivity.map(activity => (
                  <ActivityFeedItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporting Tab */}
        <TabsContent value="reporting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Report</p>
                    <p className="text-lg font-semibold">
                      {formatDate(startupToUse.reporting.lastReport)}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="mt-1" variant={startupToUse.reporting.status === 'current' ? 'default' : 'destructive'}>
                      {startupToUse.reporting.status}
                    </Badge>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completeness</p>
                    <p className="text-lg font-semibold">
                      {startupToUse.reporting.completeness}%
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Monthly Report - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    <p className="text-sm text-muted-foreground">Submitted {formatRelativeTime(startupToUse.reporting.lastReport)}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StartupDetail;