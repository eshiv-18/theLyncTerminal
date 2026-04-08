// Format currency
export const formatCurrency = (value, compact = false) => {
  if (value === null || value === undefined) return 'N/A';
  
  if (compact) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format number with commas
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

// Format compact number
export const formatCompactNumber = (value) => {
  if (value === null || value === undefined) return 'N/A';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

// Format percentage
export const formatPercentage = (value, decimals = 1, showSign = false) => {
  if (value === null || value === undefined) return 'N/A';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Format relative time
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateString);
};

// Get health status color
export const getHealthColor = (health) => {
  switch (health) {
    case 'good':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    case 'critical':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

// Get health status background color
export const getHealthBgColor = (health) => {
  switch (health) {
    case 'good':
      return 'bg-success/10 text-success border-success/20';
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'critical':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Get reporting status color
export const getReportingStatusColor = (status) => {
  switch (status) {
    case 'current':
      return 'bg-success/10 text-success border-success/20';
    case 'due':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'overdue':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Calculate trend
export const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Get trend from history
export const getTrendFromHistory = (history) => {
  if (!history || history.length < 2) return null;
  
  const latest = history[history.length - 1].value;
  const previous = history[history.length - 2].value;
  
  return calculateTrend(latest, previous);
};

// Calculate runway in months
export const calculateRunway = (cash, burn) => {
  if (!burn || burn === 0) return Infinity;
  return cash / burn;
};

// Format runway
export const formatRunway = (months) => {
  if (months === Infinity) return '∞';
  if (months >= 12) return `${(months / 12).toFixed(1)}y`;
  return `${months.toFixed(1)}m`;
};

// Sort data
export const sortData = (data, key, direction = 'asc') => {
  return [...data].sort((a, b) => {
    const aVal = getNestedValue(a, key);
    const bVal = getNestedValue(b, key);
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (typeof aVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
};

// Get nested value from object
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Filter data
export const filterData = (data, filters) => {
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value || value === 'all') return true;
      
      const itemValue = getNestedValue(item, key);
      
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      
      return itemValue === value;
    });
  });
};

// Search data
export const searchData = (data, query, fields) => {
  if (!query) return data;
  
  const lowerQuery = query.toLowerCase();
  
  return data.filter(item => {
    return fields.some(field => {
      const value = getNestedValue(item, field);
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery);
      }
      return false;
    });
  });
};

// Generate chart colors
export const getChartColor = (index) => {
  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))'
  ];
  return colors[index % colors.length];
};

// Debounce function
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};