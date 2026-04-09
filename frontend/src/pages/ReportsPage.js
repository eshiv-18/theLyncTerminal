import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/formatters';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { toast } from 'sonner';
import api from '../services/api';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch reports from backend
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.reports.getReports({ limit: 100 });
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    let result = [...reports];
    
    if (searchQuery) {
      result = result.filter(r => 
        r.startup_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    
    if (periodFilter !== 'all') {
      result = result.filter(r => r.period?.includes(periodFilter));
    }
    
    return result;
  }, [reports, searchQuery, periodFilter, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = reports.length;
    const drafts = reports.filter(r => r.status === 'draft').length;
    const submitted = reports.filter(r => r.status === 'submitted').length;
    const approved = reports.filter(r => r.status === 'approved').length;
    
    return {
      total,
      drafts,
      submitted,
      approved
    };
  }, [reports]);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'draft':
        return 'outline';
      case 'submitted':
        return 'default';
      case 'approved':
        return 'success';
      default:
        return 'outline';
    }
  };

  const getTrendIcon = (growth) => {
    if (growth > 5) return <TrendingUp className="h-4 w-4 text-success" />;
    if (growth < -5) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Reports Archive</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historical reports and submission tracking
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-3xl font-semibold tabular-nums">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-3xl font-semibold tabular-nums">{stats.drafts}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-3xl font-semibold tabular-nums text-primary">{stats.submitted}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-semibold tabular-nums text-success">{stats.approved}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-base">All Reports ({filteredReports.length})</CardTitle>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by startup..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                <p className="text-sm text-muted-foreground">
                  {reports.length === 0 
                    ? "No reports have been created yet" 
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              filteredReports.map(report => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/report/${report.id}`)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{report.startup_name || 'Unknown Startup'}</p>
                        <Badge variant="outline" className="text-xs">
                          {report.report_type || 'Monthly'}
                        </Badge>
                        <Badge 
                          variant={getStatusVariant(report.status)}
                          className="text-xs"
                        >
                          {report.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{report.period || 'N/A'}</span>
                        {report.submitted_at && (
                          <>
                            <span>•</span>
                            <span>Submitted {formatDate(report.submitted_at)}</span>
                          </>
                        )}
                        {report.created_at && !report.submitted_at && (
                          <>
                            <span>•</span>
                            <span>Created {formatDate(report.created_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mr-4">
                    {report.summary_metrics && (
                      <>
                        {report.summary_metrics.revenue !== undefined && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-sm font-semibold tabular-nums">
                              {formatCurrency(report.summary_metrics.revenue, true)}
                            </p>
                          </div>
                        )}
                        
                        {report.summary_metrics.revenue_growth !== undefined && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Growth</p>
                            <div className="flex items-center justify-end gap-1">
                              {getTrendIcon(report.summary_metrics.revenue_growth)}
                              <p className="text-sm font-semibold tabular-nums">
                                {formatPercentage(report.summary_metrics.revenue_growth, 1, true)}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {report.summary_metrics.runway_months !== undefined && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Runway</p>
                            <p className="text-sm font-semibold tabular-nums">
                              {report.summary_metrics.runway_months.toFixed(1)}m
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
