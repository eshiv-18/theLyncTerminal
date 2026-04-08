import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';

export const AlertCard = ({ alert, onDismiss, className }) => {
  const getIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getColors = () => {
    switch (alert.severity) {
      case 'critical':
        return 'border-destructive/50 bg-destructive/5 text-destructive';
      case 'warning':
        return 'border-warning/50 bg-warning/5 text-warning';
      case 'info':
      default:
        return 'border-primary/50 bg-primary/5 text-primary';
    }
  };

  return (
    <Card className={cn('border-l-4', getColors(), className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
              <Badge variant="outline" className="text-xs">
                {alert.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {alert.source} • {formatRelativeTime(alert.timestamp)}
              </span>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertCard;