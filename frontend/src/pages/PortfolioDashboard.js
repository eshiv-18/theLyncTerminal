import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  AlertTriangle
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
  Cell
} from 'recharts';
import { mockStartups, portfolioMetrics, STAGES, SECTORS } from '@/data/mockData';
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

  // Filter and search startups
  const filteredStartups = useMemo(() => {
    let result = [...mockStartups];
    
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
  }, [searchQuery, stageFilter, sectorFilter, healthFilter, sortBy]);

  // Portfolio health trend data (last 12 months)
  const healthTrendData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Simulate portfolio health score
      const baseScore = 72;
      const variance = Math.sin(i / 2) * 8;
      const score = baseScore + variance;
      
      months.push({
        month: monthName,
        score: Math.round(score),
        good: Math.round(portfolioMetrics.healthDistribution.good * (0.9 + Math.random() * 0.2)),
        warning: Math.round(portfolioMetrics.healthDistribution.warning * (0.8 + Math.random() * 0.4)),
        critical: Math.round(portfolioMetrics.healthDistribution.critical * (0.7 + Math.random() * 0.6))
      });
    }
    return months;
  }, []);

  // Growth vs Burn scatter data
  const growthBurnData = useMemo(() => {
    return mockStartups.map(s => ({
      name: s.name,
      growth: s.metrics.growthRate,
      burnMultiple: s.metrics.netBurn / (s.metrics.revenue || 1),
      health: s.health,
      id: s.id
    }));
  }, []);

  // Runway distribution
  const runwayDistribution = useMemo(() => {
    const buckets = {
      '<6m': 0,
      '6-12m': 0,
      '12-18m': 0,
      '18-24m': 0,
      '>24m': 0
    };
    
    mockStartups.forEach(s => {
      const runway = s.metrics.runway;
      if (runway < 6) buckets['<6m']++;
      else if (runway < 12) buckets['6-12m']++;
      else if (runway < 18) buckets['12-18m']++;
      else if (runway < 24) buckets['18-24m']++;
      else buckets['>24m']++;
    });
    
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, []);

  const handleSort = (key) => {
    setSortBy(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Portfolio Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor startup progress and portfolio health in real-time
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Startups"
          value={filteredStartups.length}
          subtitle={`of ${portfolioMetrics.totalStartups} total`}
          icon={Users}
          format="number"
        />
        <MetricCard
          title="Median Runway"
          value={portfolioMetrics.medianRunway.toFixed(1)}
          subtitle="months"
          icon={Clock}
          format="number"
        />
        <MetricCard
          title="Reporting Complete"
          value={portfolioMetrics.reportingCompletion}
          subtitle="this cycle"
          icon={CheckCircle2}
          format="number"
          change={5}
          trend="positive"
        />
        <MetricCard
          title="Critical Alerts"
          value={portfolioMetrics.criticalAlerts}
          subtitle={`${portfolioMetrics.totalAlerts} total alerts`}
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
                  {portfolioMetrics.healthDistribution.good}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((portfolioMetrics.healthDistribution.good / portfolioMetrics.totalStartups) * 100)}% of portfolio
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
                  {portfolioMetrics.healthDistribution.warning}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((portfolioMetrics.healthDistribution.warning / portfolioMetrics.totalStartups) * 100)}% of portfolio
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
                  {portfolioMetrics.healthDistribution.critical}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((portfolioMetrics.healthDistribution.critical / portfolioMetrics.totalStartups) * 100)}% of portfolio
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
                  {STAGES.map(stage => (
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
                {filteredStartups.map((startup) => (
                  <TableRow 
                    key={startup.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/startup/${startup.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img 
                          src={startup.logo} 
                          alt={startup.name} 
                          className="h-8 w-8 rounded-lg"
                        />
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
                      {formatCurrency(startup.metrics.burn, true)}
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
                      {startup.alerts.length > 0 && (
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDashboard;