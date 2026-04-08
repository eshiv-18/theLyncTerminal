import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { activityFeed, ALERT_CATEGORIES } from '@/data/mockData';
import ActivityFeedItem from '@/components/ActivityFeedItem';
import { Activity, TrendingUp, AlertTriangle, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';

const LiveFeedPage = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState(activityFeed);
  const [activeFilter, setActiveFilter] = useState('all');
  
  const todayActivity = activities.filter(a => {
    const activityDate = new Date(a.timestamp);
    const today = new Date();
    return activityDate.toDateString() === today.toDateString();
  });

  const thisWeekActivity = activities.filter(a => {
    const activityDate = new Date(a.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return activityDate > weekAgo;
  });

  const criticalActivities = activities.filter(a => a.severity === 'critical');
  const warningActivities = activities.filter(a => a.severity === 'warning');
  const unacknowledged = activities.filter(a => !a.acknowledged);

  const handleAcknowledge = (activityId) => {
    setActivities(prev => 
      prev.map(a => a.id === activityId ? { ...a, acknowledged: true } : a)
    );
    toast.success('Activity acknowledged');
  };

  const handleNavigate = (startupId) => {
    if (startupId) {
      navigate(`/startup/${startupId}`);
    }
  };

  const filteredActivities = () => {
    switch (activeFilter) {
      case 'critical':
        return criticalActivities;
      case 'warning':
        return warningActivities;
      case 'unacknowledged':
        return unacknowledged;
      case 'alerts':
        return activities.filter(a => 
          Object.values(ALERT_CATEGORIES).includes(a.category)
        );
      default:
        return activities;
    }
  };

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
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
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
                <p className="text-sm text-muted-foreground">Unacknowledged</p>
                <p className="text-3xl font-semibold tabular-nums">{unacknowledged.length}</p>
                <p className="text-xs text-muted-foreground mt-1">pending review</p>
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
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({criticalActivities.length})</TabsTrigger>
              <TabsTrigger value="warning">Warning ({warningActivities.length})</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="unacknowledged">Unack. ({unacknowledged.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeFilter}>
              <ScrollArea className="h-[700px] pr-4">
                <div className="space-y-3">
                  {filteredActivities().length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No activities</h3>
                      <p className="text-sm text-muted-foreground">
                        No {activeFilter !== 'all' && activeFilter} activities to show
                      </p>
                    </div>
                  ) : (
                    filteredActivities().map(activity => (
                      <ActivityFeedItem 
                        key={activity.id} 
                        activity={activity}
                        onClick={() => handleNavigate(activity.startupId)}
                        onAcknowledge={handleAcknowledge}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alert Categories Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(ALERT_CATEGORIES).map(([key, value]) => (
              <Badge key={key} variant="outline" className="justify-center py-2">
                {key.replace(/_/g, ' ').toLowerCase()}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            The alert engine monitors these categories and generates actionable signals when thresholds are crossed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveFeedPage;
