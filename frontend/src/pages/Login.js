import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/portfolio';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const quickLogin = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="w-10 h-10" />
            <h1 className="text-3xl font-bold">Startup Intel</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Portfolio Intelligence Platform
          </h2>
          <p className="text-xl text-blue-100 mb-12">
            Real-time insights for investors and founders
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <TrendingUp className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-2">Live Metrics</h3>
            <p className="text-sm text-blue-100">Automated financial tracking</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <Users className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-2">Portfolio View</h3>
            <p className="text-sm text-blue-100">Unified dashboard for VCs</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <Activity className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-2">Smart Alerts</h3>
            <p className="text-sm text-blue-100">Critical issue detection</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <BarChart3 className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-2">Auto Reports</h3>
            <p className="text-sm text-blue-100">Generated from live data</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="text-sm text-center text-slate-600 mb-3">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up
                </Link>
              </div>
            </div>

            {/* Quick Login for Development */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-slate-500 mb-3 text-center">Development Quick Login:</p>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => quickLogin('admin@startupintel.com', 'admin123')}
                >
                  <span className="font-semibold mr-2">Admin:</span> admin@startupintel.com
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => quickLogin('sarah.chen@vc.com', 'investor123')}
                >
                  <span className="font-semibold mr-2">Investor:</span> sarah.chen@vc.com
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => quickLogin('alex.thompson@startup.com', 'founder123')}
                >
                  <span className="font-semibold mr-2">Founder:</span> alex.thompson@startup.com
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
