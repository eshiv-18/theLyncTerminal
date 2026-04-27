import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Bell, 
  FileText, 
  Moon,
  Sun,
  Menu,
  X,
  Activity,
  UserCog,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import UserMenu from '@/components/UserMenu';
import { Badge } from '@/components/ui/badge';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // Track scroll for navbar effect
  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isFounder = user?.role === 'founder';
  const isAdmin = user?.role === 'admin';

  const criticalAlertCount = 0;
  const investorNav = [
    { name: 'Portfolio', path: '/portfolio', icon: LayoutDashboard },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: criticalAlertCount },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Live Feed', path: '/feed', icon: Activity },
  ];

  const adminNav = [
    { name: 'Portfolio', path: '/portfolio', icon: LayoutDashboard },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: criticalAlertCount },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Live Feed', path: '/feed', icon: Activity },
    { name: 'Admin', path: '/admin', icon: UserCog },
  ];

  const founderNav = [
    { name: 'Workspace', path: '/founder', icon: FileText },
  ];

  const navigation = isFounder ? founderNav : (isAdmin ? adminNav : investorNav);
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation — sticky with scroll effect */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? 'glass-nav shadow-sm' 
          : 'bg-card/80 backdrop-blur-sm border-b border-transparent'
      }`}>
        <div className="flex h-14 items-center px-4 md:px-6">
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
              className="flex items-center gap-2.5 cursor-pointer group" 
              onClick={() => navigate(isFounder ? '/founder' : '/portfolio')}
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0055BE] to-[#003D8F] flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-[#0055BE]/20 transition-all duration-200">
                <Terminal className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-[15px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">The Lync Terminal</h1>
                <p className="text-[10px] text-[#0055BE]/60 dark:text-blue-400/60 mt-0.5 font-medium tracking-wide">PORTFOLIO INTELLIGENCE</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navigation.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.path)}
                className={`relative text-[13px] ${isActive(item.path) ? '' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <item.icon className="h-4 w-4 mr-1.5" />
                {item.name}
                {item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-1.5 px-1.5 py-0 h-5 min-w-5 flex items-center justify-center text-xs"
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
              className="rounded-full h-8 w-8"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <UserMenu />
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <div className="md:hidden border-t bg-card animate-in slide-in-from-top-2 duration-200">
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
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} The Lync Terminal. Portfolio Intelligence Platform for VCs and Founders.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Logged in as: {user?.name}</span>
              <span>•</span>
              <span className="capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;