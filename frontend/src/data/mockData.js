// Mock data for VC Portfolio Monitoring Platform

// Business models
export const BUSINESS_MODELS = ['SaaS', 'Marketplace', 'Consumer', 'Deeptech', 'Hardware'];

// Stages
export const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'];

// Sectors
export const SECTORS = ['FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML', 'IoT', 'Logistics', 'SaaS'];

// Health status
export const HEALTH_STATUS = {
  GOOD: 'good',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

// Generate startup names
const STARTUP_PREFIXES = ['Neo', 'Quantum', 'Vertex', 'Apex', 'Zenith', 'Pulse', 'Nova', 'Surge', 'Nexus', 'Omni', 'Flux', 'Helix', 'Vortex', 'Prism', 'Echo', 'Aether', 'Cipher', 'Spark', 'Beacon', 'Forge', 'Atlas', 'Titan', 'Vector', 'Zenith', 'Orbit', 'Swift', 'Stellar', 'Lunar', 'Solar', 'Cosmic', 'Astral', 'Radiant', 'Vibrant', 'Dynamic', 'Kinetic', 'Atomic', 'Quantum', 'Digital', 'Cloud', 'Data', 'Tech', 'Smart', 'Auto', 'Fast', 'Quick', 'Rapid', 'Instant', 'Real'];
const STARTUP_SUFFIXES = ['Pay', 'Tech', 'Labs', 'AI', 'ify', 'Hub', 'Flow', 'Ops', 'Stack', 'Cloud', 'Sync', 'Link', 'Wave', 'Connect', 'Pro', 'Care', 'Med', 'Rx', 'Ed', 'Learn', 'Ship', 'Track', 'Smart', 'Scan', 'App', 'Net', 'Sphere', 'Grid', 'Stream', 'Pulse', 'Core', 'Base', 'Flex', 'Scale', 'Grow', 'Build', 'Ship', 'Launch', 'Deploy', 'Host', 'Serve', 'Store', 'Vault', 'Guard', 'Shield', 'Secure', 'Trust', 'Verify'];

function generateStartupName() {
  const prefix = STARTUP_PREFIXES[Math.floor(Math.random() * STARTUP_PREFIXES.length)];
  const suffix = STARTUP_SUFFIXES[Math.floor(Math.random() * STARTUP_SUFFIXES.length)];
  return `${prefix}${suffix}`;
}

// Generate historical metrics
function generateMetricHistory(baseValue, volatility = 0.15, trend = 0.05, months = 12) {
  const history = [];
  let currentValue = baseValue * (1 - volatility);
  
  for (let i = 0; i < months; i++) {
    const randomChange = (Math.random() - 0.4) * volatility;
    currentValue = currentValue * (1 + trend + randomChange);
    const date = new Date();
    date.setMonth(date.getMonth() - (months - i - 1));
    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, Math.round(currentValue))
    });
  }
  
  return history;
}

// Generate single startup data
function generateStartup(id) {
  const name = generateStartupName();
  const businessModel = BUSINESS_MODELS[Math.floor(Math.random() * BUSINESS_MODELS.length)];
  const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
  const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
  
  // Financial metrics based on stage
  const stageMultipliers = {
    'Pre-Seed': { revenue: 5000, burn: 15000, cash: 100000 },
    'Seed': { revenue: 30000, burn: 50000, cash: 500000 },
    'Series A': { revenue: 150000, burn: 120000, cash: 3000000 },
    'Series B': { revenue: 500000, burn: 300000, cash: 10000000 },
    'Series C+': { revenue: 2000000, burn: 800000, cash: 30000000 }
  };
  
  const multipliers = stageMultipliers[stage];
  const revenue = Math.round(multipliers.revenue * (0.5 + Math.random() * 1.5));
  const burn = Math.round(multipliers.burn * (0.5 + Math.random() * 1.5));
  const cash = Math.round(multipliers.cash * (0.5 + Math.random() * 1.5));
  const runway = cash / burn;
  const growthRate = (Math.random() * 40) - 5; // -5% to 35%
  
  // Calculate health score
  let healthScore = 70;
  if (runway < 6) healthScore -= 30;
  else if (runway < 9) healthScore -= 15;
  if (growthRate < 5) healthScore -= 20;
  else if (growthRate > 20) healthScore += 15;
  if (burn > revenue * 3) healthScore -= 10;
  
  const health = healthScore >= 70 ? HEALTH_STATUS.GOOD : 
                 healthScore >= 45 ? HEALTH_STATUS.WARNING : 
                 HEALTH_STATUS.CRITICAL;
  
  // Integration sources
  const connectedSources = Math.floor(Math.random() * 5) + 1;
  const sources = [];
  const allSources = ['Zoho Books', 'HubSpot', 'Salesforce', 'Jira', 'GitHub', 'Stripe', 'QuickBooks'];
  for (let i = 0; i < connectedSources && i < allSources.length; i++) {
    sources.push({
      name: allSources[i],
      connected: true,
      lastSync: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),
      status: Math.random() > 0.9 ? 'error' : 'active'
    });
  }
  
  // Generate alerts
  const alerts = [];
  if (runway < 6) {
    alerts.push({
      id: `alert-${id}-1`,
      severity: 'critical',
      title: 'Low runway alert',
      message: `Runway below 6 months (${runway.toFixed(1)}m)`,
      timestamp: new Date().toISOString(),
      source: 'Financial Monitor'
    });
  }
  if (Math.random() > 0.7) {
    alerts.push({
      id: `alert-${id}-2`,
      severity: Math.random() > 0.5 ? 'warning' : 'info',
      title: Math.random() > 0.5 ? 'Burn rate increased' : 'Report due soon',
      message: Math.random() > 0.5 ? 'Monthly burn increased by 15%' : 'Monthly report due in 3 days',
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      source: Math.random() > 0.5 ? 'Financial Monitor' : 'Reporting System'
    });
  }
  
  // Last report date
  const daysSinceReport = Math.floor(Math.random() * 45);
  const lastReportDate = new Date();
  lastReportDate.setDate(lastReportDate.getDate() - daysSinceReport);
  
  const reportingStatus = daysSinceReport <= 30 ? 'current' : 
                          daysSinceReport <= 40 ? 'due' : 'overdue';
  
  // Headcount
  const headcount = Math.floor(Math.random() * 100) + 5;
  
  return {
    id: `startup-${id}`,
    name,
    businessModel,
    stage,
    sector,
    health,
    healthScore,
    logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=120`,
    
    // Founders
    founders: [
      { name: `${['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan'][Math.floor(Math.random() * 5)]} ${['Smith', 'Johnson', 'Patel', 'Lee', 'Garcia'][Math.floor(Math.random() * 5)]}`, role: 'CEO' },
      { name: `${['Chris', 'Jamie', 'Riley', 'Casey', 'Drew'][Math.floor(Math.random() * 5)]} ${['Brown', 'Davis', 'Wilson', 'Kumar', 'Chen'][Math.floor(Math.random() * 5)]}`, role: 'CTO' }
    ],
    
    // Financial metrics
    metrics: {
      revenue,
      mrr: businessModel === 'SaaS' ? Math.round(revenue * 0.9) : null,
      arr: businessModel === 'SaaS' ? Math.round(revenue * 12 * 0.9) : null,
      burn,
      netBurn: burn - (revenue * 0.3),
      cash,
      runway,
      growthRate,
      headcount,
      
      // Revenue history
      revenueHistory: generateMetricHistory(revenue, 0.2, 0.08, 12),
      burnHistory: generateMetricHistory(burn, 0.15, 0.05, 12),
      cashHistory: generateMetricHistory(cash, 0.1, -0.02, 12),
      
      // Business model specific
      ...(businessModel === 'SaaS' && {
        nrr: 95 + Math.random() * 20,
        churnRate: Math.random() * 5,
        cac: Math.round(revenue * 0.3),
        ltv: Math.round(revenue * 3),
        grossMargin: 70 + Math.random() * 20
      }),
      ...(businessModel === 'Marketplace' && {
        gmv: revenue * 10,
        takeRate: 10 + Math.random() * 15,
        buyers: Math.floor(Math.random() * 50000) + 1000,
        sellers: Math.floor(Math.random() * 5000) + 100
      }),
      ...(businessModel === 'Consumer' && {
        mau: Math.floor(Math.random() * 500000) + 10000,
        dau: Math.floor(Math.random() * 200000) + 5000,
        activationRate: 30 + Math.random() * 40,
        retentionD30: 20 + Math.random() * 50
      })
    },
    
    // Reporting
    reporting: {
      lastReport: lastReportDate.toISOString(),
      status: reportingStatus,
      completeness: Math.floor(Math.random() * 30) + 70,
      nextDue: new Date(Date.now() + (30 - daysSinceReport) * 24 * 60 * 60 * 1000).toISOString()
    },
    
    // Integrations
    integrations: sources,
    dataFreshness: Math.floor(Math.random() * 30) + 70,
    
    // Alerts
    alerts,
    
    // Recent activity
    recentActivity: [
      {
        id: `activity-${id}-1`,
        type: 'metric_update',
        title: 'Revenue updated',
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        source: 'Zoho Books'
      },
      {
        id: `activity-${id}-2`,
        type: 'report_submitted',
        title: 'Monthly report submitted',
        timestamp: lastReportDate.toISOString(),
        source: 'Reporting System'
      }
    ],
    
    // Investor notes
    notes: [
      {
        id: `note-${id}-1`,
        author: 'Partner Name',
        content: 'Strong team execution. Product market fit improving.',
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };
}

// Generate portfolio of 45 startups
export const mockStartups = Array.from({ length: 45 }, (_, i) => generateStartup(i + 1));

// Portfolio summary metrics
export const portfolioMetrics = {
  totalStartups: mockStartups.length,
  healthDistribution: {
    good: mockStartups.filter(s => s.health === HEALTH_STATUS.GOOD).length,
    warning: mockStartups.filter(s => s.health === HEALTH_STATUS.WARNING).length,
    critical: mockStartups.filter(s => s.health === HEALTH_STATUS.CRITICAL).length
  },
  medianRunway: mockStartups.reduce((sum, s) => sum + s.metrics.runway, 0) / mockStartups.length,
  reportingCompletion: Math.round(mockStartups.filter(s => s.reporting.status === 'current').length / mockStartups.length * 100),
  dataFreshness: Math.round(mockStartups.reduce((sum, s) => sum + s.dataFreshness, 0) / mockStartups.length),
  criticalAlerts: mockStartups.reduce((sum, s) => sum + s.alerts.filter(a => a.severity === 'critical').length, 0),
  totalAlerts: mockStartups.reduce((sum, s) => sum + s.alerts.length, 0)
};

// User roles for mock authentication
export const ROLES = {
  INVESTOR: 'investor',
  FOUNDER: 'founder',
  ADMIN: 'admin'
};

// Mock users
export const mockUsers = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah@vcfirm.com',
    role: ROLES.INVESTOR,
    title: 'Partner',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=6366f1&color=fff'
  },
  {
    id: 'user-2',
    name: 'Michael Rodriguez',
    email: 'michael@vcfirm.com',
    role: ROLES.INVESTOR,
    title: 'Associate',
    avatar: 'https://ui-avatars.com/api/?name=Michael+Rodriguez&background=6366f1&color=fff'
  },
  {
    id: 'user-3',
    name: 'Alex Thompson',
    email: 'alex@startup.com',
    role: ROLES.FOUNDER,
    title: 'CEO',
    startup: mockStartups[0],
    avatar: 'https://ui-avatars.com/api/?name=Alex+Thompson&background=16a34a&color=fff'
  },
  {
    id: 'user-4',
    name: 'Admin User',
    email: 'admin@startuptn.com',
    role: ROLES.ADMIN,
    title: 'Portfolio Manager',
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=ea580c&color=fff'
  }
];

// Activity feed
export function generateActivityFeed() {
  const activities = [];
  const types = [
    { type: 'report_submitted', icon: 'FileText', color: 'text-primary' },
    { type: 'alert_triggered', icon: 'AlertTriangle', color: 'text-warning' },
    { type: 'integration_connected', icon: 'Link', color: 'text-success' },
    { type: 'milestone_achieved', icon: 'Trophy', color: 'text-success' },
    { type: 'metric_updated', icon: 'TrendingUp', color: 'text-primary' }
  ];
  
  mockStartups.slice(0, 15).forEach((startup, idx) => {
    const activity = types[Math.floor(Math.random() * types.length)];
    activities.push({
      id: `feed-${idx}`,
      startup: startup.name,
      startupId: startup.id,
      type: activity.type,
      icon: activity.icon,
      color: activity.color,
      message: `${startup.name} - ${activity.type.replace('_', ' ')}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  });
  
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export const activityFeed = generateActivityFeed();