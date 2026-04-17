import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ScatterChart,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell, 
} from 'recharts';
import api from '../services/api';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercentage, 
  formatRunway,
  getHealthBgColor,
  searchData,
  filterData,
  sortData,
  getChartColor
} from '@/lib/formatters';
import MetricCard from '@/components/MetricCard';
import HealthBadge from '@/components/HealthBadge';
import Sparkline from '@/components/Sparkline';


const PortfolioDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [sortBy, setSortBy] = useState({ key: 'name', direction: 'asc' });
  
  // API data state
  const [portfolioOverview, setPortfolioOverview] = useState(null);
  const [startupsList, setStartupsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('api'); // 'api' or 'mock'

  // Fetch data from API
  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        
        // Fetch overview
        const overviewRes = await api.portfolio.getOverview();
        setPortfolioOverview(overviewRes.data);
        
        // Fetch startups
        const startupsRes = await api.portfolio.getStartups();
        
        // Transform API data to match mock data structure
        const transformedStartups = startupsRes.data.map(s => ({
          id: s.id,
          name: s.name,
          logo: s.logo_url,
          sector: 'SaaS', // Default sector (not in API model yet)
          stage: s.stage,
          health: s.health_status,
          healthScore: s.health_score,
          fundingAmount: s.funding_amount,
          valuation: s.valuation,
          metrics: {
            mrr: s.metrics.mrr,
            arr: s.metrics.arr,
            revenue: s.metrics.revenue,
            growthRate: s.metrics.growth_rate,
            runway: s.metrics.runway_months,
            netBurn: s.metrics.burn_rate,
            cashBalance: s.metrics.cash_balance,
            teamSize: s.metrics.headcount,
            customers: s.metrics.customer_count
          },
          integrations: s.integrations,
          lastUpdate: s.updated_at,
          alerts: [] // Will fetch separately
        }));
        
        setStartupsList(transformedStartups);
        setDataSource('api');
        
      // After line 128 - Better empty state handling
} catch (error) {
  console.error('Failed to fetch portfolio data:', error);
  
  // Show helpful error message
  if (error.response?.status === 401) {
    toast.error('Session expired. Please login again.');
    navigate('/login');
  } else {
    toast.error('Unable to load portfolio data. Please try again.');
  }
  
  // Set empty state
  setStartupsList([]);
  setPortfolioOverview({
    total_startups: 0,
    total_deployed: 0,
    total_valuation: 0,
    active_startups: 0,
    healthy_count: 0,
    warning_count: 0,
    critical_count: 0,
    total_alerts: 0,
    critical_alerts: 0,
    pending_reports: 0,
    overdue_reports: 0,
    top_performers: [],
    recent_activity: []
  });
  setDataSource('empty');
} finally {
  setLoading(false);
}
    };

    fetchPortfolioData();
  }, []);

  // Only use real data — no mock fallback
  const activeStartups = startupsList;

  // Filter and search startups
  const filteredStartups = useMemo(() => {
    let result = [...activeStartups];
    
    // Apply search
    if (searchQuery) {
      result = searchData(result, searchQuery, ['name', 'sector', 'stage']);
    }
    
    // Apply filters
    const filters = {};
    if (stageFilter !== 'all') filters.stage = stageFilter;
    if (sectorFilter !== 'all') filters.sector = sectorFilter;
    if (healthFilter !== 'all') filters.health = healthFilter;
    
    result = filterData(result, filters);
    
    // Apply sorting
    result = sortData(result, sortBy.key, sortBy.direction);
    
    return result;
  }, [activeStartups, searchQuery, stageFilter, sectorFilter, healthFilter, sortBy]);

  // Portfolio health trend data (last 12 months) — only computed if we have real startups
  const healthTrendData = useMemo(() => {
    if (activeStartups.length === 0) return [];
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const avgHealth = activeStartups.reduce((sum, s) => sum + (s.healthScore || 50), 0) / activeStartups.length;
      months.push({
        month: monthName,
        score: Math.round(avgHealth),
      });
    }
    return months;
  }, [activeStartups]);

  // Growth vs Burn scatter data
  const growthBurnData = useMemo(() => {
    return activeStartups.map(s => ({
      name: s.name,
      growth: s.metrics.growthRate,
      burnMultiple: s.metrics.netBurn / (s.metrics.revenue || 1),
      health: s.health,
      id: s.id
    }));
  }, [activeStartups]);

  // Runway distribution
  const runwayDistribution = useMemo(() => {
    const buckets = {
      '<6m': 0,
      '6-12m': 0,
      '12-18m': 0,
      '18-24m': 0,
      '>24m': 0
    };
    
    activeStartups.forEach(s => {
      const runway = s.metrics.runway;
      if (runway < 6) buckets['<6m']++;
      else if (runway < 12) buckets['6-12m']++;
      else if (runway < 18) buckets['12-18m']++;
      else if (runway < 24) buckets['18-24m']++;
      else buckets['>24m']++;
    });
    
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [activeStartups]);

  const handleSort = (key) => {
    setSortBy(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Calculate actual portfolio metrics from real data
  const actualMetrics = useMemo(() => {
    if (portfolioOverview) {
      return {
        totalStartups: portfolioOverview.total_startups,
        totalInvested: portfolioOverview.total_deployed,
        totalValuation: portfolioOverview.total_valuation,
        medianRunway: activeStartups.length > 0
          ? Math.round(activeStartups.reduce((s, x) => s + (x.metrics?.runway || 0), 0) / activeStartups.length)
          : 0,
        reportingCompletion: portfolioOverview.total_startups - portfolioOverview.pending_reports,
        criticalAlerts: portfolioOverview.critical_alerts,
        totalAlerts: portfolioOverview.total_alerts,
        healthDistribution: {
          good: portfolioOverview.healthy_count,
          warning: portfolioOverview.warning_count,
          critical: portfolioOverview.critical_count
        }
      };
    }
    // Empty state when no data
    return {
      totalStartups: 0,
      totalInvested: 0,
      totalValuation: 0,
      medianRunway: 0,
      reportingCompletion: 0,
      criticalAlerts: 0,
      totalAlerts: 0,
      healthDistribution: { good: 0, warning: 0, critical: 0 }
    };
  }, [portfolioOverview, activeStartups]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  const uniqueStages = [...new Set(activeStartups.map(s => s.stage).filter(Boolean))];

  return (
    <div className="space-y-6">
      {activeStartups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Portfolio Companies Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Get started by adding your first portfolio company or completing your onboarding.
            </p>
            <Button onClick={() => navigate('/admin-onboarding')}>
              Add Portfolio Companies
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Portfolio Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor startup progress and portfolio health in real-time
            {dataSource === 'api' && <Badge variant="outline" className="ml-2 text-xs">Live Data</Badge>}
            {loading && <span className="ml-2 text-xs">(Loading...)</span>}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Startups"
          value={filteredStartups.length}
          subtitle={`of ${actualMetrics.totalStartups} total`}
          icon={Users}
          format="number"
        />
        <MetricCard
          title="Median Runway"
          value={actualMetrics.medianRunway.toFixed(1)}
          subtitle="months"
          icon={Clock}
          format="number"
        />
        <MetricCard
          title="Reporting Complete"
          value={actualMetrics.reportingCompletion}
          subtitle="this cycle"
          icon={CheckCircle2}
          format="number"
          change={5}
          trend="positive"
        />
        <MetricCard
          title="Critical Alerts"
          value={actualMetrics.criticalAlerts}
          subtitle={`${actualMetrics.totalAlerts} total alerts`}
          icon={AlertCircle}
          format="number"
        />
      </div>

      {/* Health Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                <p className="text-3xl font-semibold text-success tabular-nums">
                  {actualMetrics.healthDistribution.good}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {actualMetrics.totalStartups > 0
                    ? `${Math.round((actualMetrics.healthDistribution.good / actualMetrics.totalStartups) * 100)}% of portfolio`
                    : 'No startups yet'}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                <p className="text-3xl font-semibold text-warning tabular-nums">
                  {actualMetrics.healthDistribution.warning}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((actualMetrics.healthDistribution.warning / actualMetrics.totalStartups) * 100)}% of portfolio
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-3xl font-semibold text-destructive tabular-nums">
                  {actualMetrics.healthDistribution.critical}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((actualMetrics.healthDistribution.critical / actualMetrics.totalStartups) * 100)}% of portfolio
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Health Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Health Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={healthTrendData}>
                
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
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
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke={getChartColor(0)} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Health Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Runway Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runway Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={runwayDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="range" 
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
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {runwayDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? 'hsl(var(--destructive))' : 
                            index === 1 ? 'hsl(var(--warning))' : 
                            getChartColor(1)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-base">Portfolio Startups</CardTitle>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search startups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {uniqueStages.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="good">Healthy</SelectItem>
                  <SelectItem value="warning">At Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead 
                    className="cursor-pointer hover:text-foreground font-semibold"
                    onClick={() => handleSort('name')}
                  >
                    Startup {sortBy.key === 'name' && (sortBy.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="font-semibold">Stage</TableHead>
                  <TableHead className="font-semibold">Health</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground text-right font-semibold"
                    onClick={() => handleSort('metrics.revenue')}
                  >
                    Revenue {sortBy.key === 'metrics.revenue' && (sortBy.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground text-right font-semibold"
                    onClick={() => handleSort('metrics.growthRate')}
                  >
                    Growth {sortBy.key === 'metrics.growthRate' && (sortBy.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right font-semibold">Burn</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground text-right font-semibold"
                    onClick={() => handleSort('metrics.runway')}
                  >
                    Runway {sortBy.key === 'metrics.runway' && (sortBy.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-center font-semibold">Trend</TableHead>
                  <TableHead className="text-center font-semibold">Alerts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStartups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-12 w-12 opacity-30" />
                        <p className="font-medium">No portfolio companies yet</p>
                        <p className="text-sm">Add companies during onboarding or import them from the admin panel.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStartups.map((startup) => (
                    <TableRow 
                      key={startup.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/startup/${startup.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {startup.logo ? (
                            <img 
                              src={startup.logo} 
                              alt={startup.name} 
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">{startup.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{startup.name}</div>
                            <div className="text-xs text-muted-foreground">{startup.sector}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{startup.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <HealthBadge health={startup.health} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(startup.metrics.revenue, true)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={startup.metrics.growthRate > 0 ? 'text-success' : 'text-destructive'}>
                          {formatPercentage(startup.metrics.growthRate, 1, true)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(startup.metrics.netBurn, true)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={
                          startup.metrics.runway < 6 ? 'text-destructive' :
                          startup.metrics.runway < 12 ? 'text-warning' :
                          'text-success'
                        }>
                          {formatRunway(startup.metrics.runway)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="h-10 w-20">
                          <Sparkline data={startup.metrics.revenueHistory} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {startup.alerts?.length > 0 && (
                          <Badge 
                            variant="outline" 
                            className={
                              startup.alerts.some(a => a.severity === 'critical') 
                                ? 'border-destructive text-destructive' 
                                : 'border-warning text-warning'
                            }
                          >
                            {startup.alerts.length}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </>
    )}
  </div>
);
};

export default PortfolioDashboard;