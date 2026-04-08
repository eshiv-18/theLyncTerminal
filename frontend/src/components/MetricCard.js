import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber, formatPercentage, formatCompactNumber } from '@/lib/formatters';

export const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'percentage',
  format = 'number',
  icon: Icon,
  trend,
  subtitle,
  className 
}) => {
  const getTrendIcon = () => {
    if (!change && change !== 0) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!change && change !== 0) return 'text-muted-foreground';
    // For metrics where increase is good (revenue, growth)
    if (trend === 'positive') {
      return change > 0 ? 'text-success' : change < 0 ? 'text-destructive' : 'text-muted-foreground';
    }
    // For metrics where decrease is good (burn, churn)
    if (trend === 'negative') {
      return change < 0 ? 'text-success' : change > 0 ? 'text-destructive' : 'text-muted-foreground';
    }
    return 'text-muted-foreground';
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'currency-compact':
        return formatCurrency(val, true);
      case 'percentage':
        return formatPercentage(val);
      case 'compact':
        return formatCompactNumber(val);
      case 'number':
      default:
        return formatNumber(val);
    }
  };

  const formatChange = (val) => {
    if (val === null || val === undefined) return '';
    const sign = val > 0 ? '+' : '';
    if (changeType === 'percentage') {
      return `${sign}${val.toFixed(1)}%`;
    }
    return `${sign}${formatCompactNumber(val)}`;
  };

  return (
    <Card className={cn('transition-smooth hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-semibold tabular-nums">{formatValue(value)}</h3>
              {change !== undefined && change !== null && (
                <div className={cn('flex items-center gap-1 text-sm font-medium', getTrendColor())}>
                  {getTrendIcon()}
                  <span>{formatChange(change)}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;