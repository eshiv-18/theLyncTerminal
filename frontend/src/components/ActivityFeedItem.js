import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertTriangle, Link as LinkIcon, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';

export const ActivityFeedItem = ({ activity, onClick, className }) => {
  const getIcon = () => {
    const iconMap = {
      report_submitted: FileText,
      alert_triggered: AlertTriangle,
      integration_connected: LinkIcon,
      milestone_achieved: Trophy,
      metric_updated: TrendingUp,
      default: Calendar
    };
    const Icon = iconMap[activity.type] || iconMap.default;
    return <Icon className="h-4 w-4" />;
  };

  const getIconColor = () => {
    const colorMap = {
      report_submitted: 'bg-primary/10 text-primary',
      alert_triggered: 'bg-warning/10 text-warning',
      integration_connected: 'bg-success/10 text-success',
      milestone_achieved: 'bg-success/10 text-success',
      metric_updated: 'bg-primary/10 text-primary',
      default: 'bg-muted text-muted-foreground'
    };
    return colorMap[activity.type] || colorMap.default;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
    >
      <div className={cn('p-2 rounded-lg shrink-0', getIconColor())}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{activity.startup}</p>
        <p className="text-xs text-muted-foreground">
          {activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(activity.timestamp)}</p>
      </div>
    </div>
  );
};

export default ActivityFeedItem;