import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  XCircle
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

const StartupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const startup = mockStartups.find(s => s.id === id);

  if (!startup) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Startup not found</h2>
          <Button onClick={() => navigate('/portfolio')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolio
          </Button>
        </div>
      </div>
    );
  }

  // Prepare combined financial data
  const financialData = startup.metrics.revenueHistory.map((item, idx) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
    revenue: item.value,
    burn: startup.metrics.burnHistory[idx]?.value || 0,
    cash: startup.metrics.cashHistory[idx]?.value || 0
  }));

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
              src={startup.logo} 
              alt={startup.name} 
              className="h-16 w-16 rounded-xl border"
            />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold">{startup.name}</h1>
                <HealthBadge health={startup.health} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{startup.sector}</span>
                <span>•</span>
                <span>{startup.stage}</span>
                <span>•</span>
                <span>{startup.businessModel}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {startup.founders.map((founder, idx) => (
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
          <p className="font-medium">{formatRelativeTime(startup.reporting.lastReport)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Data freshness: {startup.dataFreshness}%
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={startup.metrics.revenue}
          format="currency-compact"
          change={startup.metrics.growthRate}
          trend="positive"
          icon={DollarSign}
        />
        <MetricCard
          title="Growth Rate"
          value={startup.metrics.growthRate}
          format="percentage"
          icon={TrendingUp}
        />
        <MetricCard
          title="Monthly Burn"
          value={startup.metrics.burn}
          format="currency-compact"
          icon={Activity}
        />
        <MetricCard
          title="Runway"
          value={startup.metrics.runway.toFixed(1)}
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
                    {startup.metrics.headcount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cash Balance</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(startup.metrics.cash, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Net Burn</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(startup.metrics.netBurn, true)}
                  </span>
                </div>
                {startup.businessModel === 'SaaS' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ARR</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatCurrency(startup.metrics.arr, true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">NRR</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatPercentage(startup.metrics.nrr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Churn Rate</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatPercentage(startup.metrics.churnRate)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {startup.alerts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {startup.alerts.map(alert => (
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
                {startup.integrations.map((integration, idx) => (
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
          {startup.businessModel === 'SaaS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="ARR"
                value={startup.metrics.arr}
                format="currency-compact"
              />
              <MetricCard
                title="Net Revenue Retention"
                value={startup.metrics.nrr}
                format="percentage"
              />
              <MetricCard
                title="Churn Rate"
                value={startup.metrics.churnRate}
                format="percentage"
              />
              <MetricCard
                title="CAC"
                value={startup.metrics.cac}
                format="currency-compact"
              />
              <MetricCard
                title="LTV"
                value={startup.metrics.ltv}
                format="currency-compact"
              />
              <MetricCard
                title="Gross Margin"
                value={startup.metrics.grossMargin}
                format="percentage"
              />
            </div>
          )}
          {startup.businessModel === 'Marketplace' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="GMV"
                value={startup.metrics.gmv}
                format="currency-compact"
              />
              <MetricCard
                title="Take Rate"
                value={startup.metrics.takeRate}
                format="percentage"
              />
              <MetricCard
                title="Active Buyers"
                value={startup.metrics.buyers}
                format="compact"
              />
              <MetricCard
                title="Active Sellers"
                value={startup.metrics.sellers}
                format="compact"
              />
            </div>
          )}
          {startup.businessModel === 'Consumer' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="MAU"
                value={startup.metrics.mau}
                format="compact"
              />
              <MetricCard
                title="DAU"
                value={startup.metrics.dau}
                format="compact"
              />
              <MetricCard
                title="Activation Rate"
                value={startup.metrics.activationRate}
                format="percentage"
              />
              <MetricCard
                title="D30 Retention"
                value={startup.metrics.retentionD30}
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
                {startup.recentActivity.map(activity => (
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
                      {formatDate(startup.reporting.lastReport)}
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
                    <Badge className="mt-1" variant={startup.reporting.status === 'current' ? 'default' : 'destructive'}>
                      {startup.reporting.status}
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
                      {startup.reporting.completeness}%
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
                    <p className="text-sm text-muted-foreground">Submitted {formatRelativeTime(startup.reporting.lastReport)}</p>
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