import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getHealthBgColor } from '@/lib/formatters';

export const HealthBadge = ({ health, className }) => {
  const labels = {
    good: 'Healthy',
    warning: 'At Risk',
    critical: 'Critical'
  };

  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium border', getHealthBgColor(health), className)}
    >
      {labels[health] || health}
    </Badge>
  );
};

export default HealthBadge;