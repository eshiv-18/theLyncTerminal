import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  AlertTriangle, 
  Link as LinkIcon, 
  Trophy, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Clock,
  TrendingDown,
  GitBranch,
  UserMinus,
  Link2Off
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';

export const ActivityFeedItem = ({ activity, onClick, onAcknowledge, className }) => {
  const getIcon = () => {
    const iconMap = {
      FileText,
      AlertTriangle,
      LinkIcon,
      Trophy,
      TrendingUp,
      AlertCircle,
      Clock,
      TrendingDown,
      GitBranch,
      UserMinus,
      LinkOff: Link2Off,
      default: Calendar
    };
    const Icon = iconMap[activity.icon] || iconMap.default;
    return <Icon className="h-4 w-4" />;
  };

  const getSeverityColor = () => {
    const colorMap = {
      critical: 'bg-destructive/10 text-destructive border-destructive/30',
      warning: 'bg-warning/10 text-warning border-warning/30',
      success: 'bg-success/10 text-success border-success/30',
      info: 'bg-primary/10 text-primary border-primary/30',
      default: 'bg-muted text-muted-foreground'
    };
    return colorMap[activity.severity] || colorMap.default;
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-colors',
        activity.acknowledged ? 'opacity-60' : 'hover:bg-muted/50',
        getSeverityColor(),
        className
      )}
    >
      <div className={cn('p-2 rounded-lg shrink-0 bg-card', activity.color)}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {activity.startupLogo && (
                <img 
                  src={activity.startupLogo} 
                  alt={activity.startup}
                  className="h-5 w-5 rounded"
                />
              )}
              <p 
                className="font-medium text-sm cursor-pointer hover:underline" 
                onClick={onClick}
              >
                {activity.startup}
              </p>
            </div>
            <p className="font-semibold text-foreground">{activity.title}</p>
            {activity.summary && (
              <p className="text-sm text-muted-foreground mt-1">{activity.summary}</p>
            )}
          </div>
          {activity.severity && (
            <Badge variant="outline" className="text-xs capitalize shrink-0">
              {activity.severity}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {activity.sourceSystem && <span>{activity.sourceSystem}</span>}
            {activity.affectedMetric && (
              <>
                <span>•</span>
                <span className="capitalize">{activity.affectedMetric}</span>
              </>
            )}
            <span>•</span>
            <span>{formatRelativeTime(activity.timestamp)}</span>
          </div>
        </div>
        
        {activity.suggestedAction && !activity.acknowledged && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs font-medium text-muted-foreground">Suggested:</span>
            <span className="text-xs text-foreground">{activity.suggestedAction}</span>
            {onAcknowledge && (
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto h-7 text-xs"
                onClick={() => onAcknowledge(activity.id)}
              >
                Acknowledge
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeedItem;
