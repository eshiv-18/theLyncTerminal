import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, TrendingUp, AlertTriangle, FileText, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/formatters';
import api from '../services/api';

const LiveFeedPage = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch activities from backend
  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await api.feed.getActivities({ page: 1, page_size: 100 });
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast.error('Failed to load activity feed');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const todayActivity = activities.filter(a => {
    const activityDate = new Date(a.created_at);
    const today = new Date();
    return activityDate.toDateString() === today.toDateString();
  });

  const thisWeekActivity = activities.filter(a => {
    const activityDate = new Date(a.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return activityDate > weekAgo;
  });

  // Filter by type
  const criticalActivities = activities.filter(a => 
    a.type === 'alert' || a.type === 'critical_alert'
  );
  
  const reportActivities = activities.filter(a => 
    a.type === 'report_submitted' || a.type === 'report_approved'
  );

  const integrationActivities = activities.filter(a =>
    a.type === 'integration_connected' || a.type === 'integration_synced'
  );

  const filteredActivities = () => {
    switch (activeFilter) {
      case 'critical':
        return criticalActivities;
      case 'reports':
        return reportActivities;
      case 'integrations':
        return integrationActivities;
      default:
        return activities;
    }
  };

  const handleNavigate = (startupId) => {
    if (startupId) {
      navigate(`/startup/${startupId}`);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'alert':
      case 'critical_alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'report_submitted':
      case 'report_approved':
        return <FileText className="h-4 w-4" />;
      case 'integration_connected':
      case 'integration_synced':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'alert':
        return 'text-warning';
      case 'critical_alert':
        return 'text-destructive';
      case 'report_submitted':
        return 'text-primary';
      case 'report_approved':
        return 'text-success';
      case 'integration_connected':
      case 'integration_synced':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Live Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time activity stream and operational signals across your portfolio
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-3xl font-semibold tabular-nums">{todayActivity.length}</p>
                <p className="text-xs text-muted-foreground mt-1">events</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-3xl font-semibold tabular-nums">{thisWeekActivity.length}</p>
                <p className="text-xs text-muted-foreground mt-1">events</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-semibold tabular-nums text-destructive">
                  {criticalActivities.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">need attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reports</p>
                <p className="text-3xl font-semibold tabular-nums">{reportActivities.length}</p>
                <p className="text-xs text-muted-foreground mt-1">submitted</p>
              </div>
              <FileText className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Stream</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Filter className="h-3 w-3" />
              {filteredActivities().length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFilter} onValueChange={setActiveFilter}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({criticalActivities.length})</TabsTrigger>
              <TabsTrigger value="reports">Reports ({reportActivities.length})</TabsTrigger>
              <TabsTrigger value="integrations">Integrations ({integrationActivities.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeFilter}>
              <ScrollArea className="h-[700px] pr-4">
                <div className="space-y-3">
                  {filteredActivities().length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No activities</h3>
                      <p className="text-sm text-muted-foreground">
                        {activities.length === 0 
                          ? "No real activity has been recorded for this portfolio yet"
                          : `No ${activeFilter !== 'all' ? activeFilter : ''} activities to show`}
                      </p>
                    </div>
                  ) : (
                    filteredActivities().map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleNavigate(activity.startup_id)}
                      >
                        <div className={`mt-1 p-2 rounded-full bg-muted ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.title}</p>
                              {activity.startup_name && (
                                <p className="text-xs text-muted-foreground">
                                  {activity.startup_name}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {activity.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {activity.description}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{activity.actor || 'System'}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(activity.created_at)}</span>
                            {activity.actor_role && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.actor_role}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feed shows activity returned by the backend for startups in your workspace only.
            If nothing appears here, there is currently no recorded portfolio activity rather than a mocked fallback.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveFeedPage;
