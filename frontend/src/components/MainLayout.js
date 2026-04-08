import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Bell, 
  FileText, 
  Settings,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import UserMenu from '@/components/UserMenu';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { mockStartups } from '@/data/mockData';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isInvestor, isFounder } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Count critical alerts
  const criticalAlertCount = React.useMemo(() => {
    return mockStartups.reduce((sum, s) => 
      sum + s.alerts.filter(a => a.severity === 'critical').length, 0
    );
  }, []);

  const investorNav = [
    { name: 'Portfolio', path: '/portfolio', icon: LayoutDashboard },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: criticalAlertCount },
  ];

  const founderNav = [
    { name: 'Workspace', path: '/founder', icon: FileText },
  ];

  const navigation = isFounder ? founderNav : investorNav;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center px-4 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => navigate(isFounder ? '/founder' : '/portfolio')}
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold leading-none">Startup Intel</h1>
                <p className="text-xs text-muted-foreground">Portfolio Monitoring</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navigation.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? 'default' : 'ghost'}
                onClick={() => navigate(item.path)}
                className="relative"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
                {item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 px-1.5 py-0 h-5 min-w-5 flex items-center justify-center text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <UserMenu />
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <div className="md:hidden border-t bg-card">
            <nav className="flex flex-col p-4 space-y-1">
              {navigation.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className="justify-start relative"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                  {item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto px-1.5 py-0 h-5 min-w-5 flex items-center justify-center text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Startup Intel. Built for StartupTN Portfolio Monitoring.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Logged in as: {currentUser?.name}</span>
              <span>•</span>
              <span className="capitalize">{currentUser?.role}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;