/**
 * FounderHome.js — Founder Dashboard
 * Shows live metrics from all 4 integrations:
 *  - Zoho Books  → Cash, Burn, Revenue, Runway
 *  - GitHub      → Commits, PRs, Contributors, Repos
 *  - HubSpot     → Contacts, Deals, Pipeline, Win Rate
 *  - Razorpay    → MRR, ARR, Payments, Churn
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  GitBranch, GitPullRequest, Users, Code2,
  DollarSign, TrendingDown, Clock, AlertCircle,
  RefreshCw, ExternalLink, Loader2, CheckCircle2,
  Activity, BarChart3, Zap, ShoppingCart, UserCheck,
  Briefcase, TrendingUp, CreditCard,
} from 'lucide-react';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = {
  currency: (n, symbol = '₹') =>
    n == null ? '—' : `${symbol}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`,
  number:   (n) => n == null ? '—' : new Intl.NumberFormat().format(n),
  months:   (n) => n == null ? '—' : `${parseFloat(n).toFixed(1)} mo`,
  percent:  (n) => n == null ? '—' : `${parseFloat(n).toFixed(1)}%`,
};

// ─── Reusable components ──────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, accent = 'blue', loading }) {
  const accents = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`p-1.5 rounded-lg ${accents[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />
      ) : (
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, badge, connected, onRefresh, refreshing, onConnect, integration }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        {badge && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {connected ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Live
          </span>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            Not connected
          </span>
        )}
      </div>
      {connected ? (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      ) : (
        <button onClick={onConnect} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <ExternalLink className="h-3 w-3" />
          Connect {integration}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FounderHome() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const orgId = user?.organization_id ?? user?.startup?.id ?? user?.id;

  // Connection states
  const [connected, setConnected] = useState({
    github: false, zoho: false, hubspot: false, razorpay: false,
  });

  // Metric data
  const [githubMetrics,   setGithubMetrics]   = useState(null);
  const [zohoMetrics,     setZohoMetrics]      = useState(null);
  const [hubspotMetrics,  setHubspotMetrics]   = useState(null);
  const [razorpayMetrics, setRazorpayMetrics]  = useState(null);

  // Loading states
  const [statusLoading,   setStatusLoading]    = useState(true);
  const [loading,         setLoading]          = useState({ github: false, zoho: false, hubspot: false, razorpay: false });
  const [refreshing,      setRefreshing]       = useState({ github: false, zoho: false, hubspot: false, razorpay: false });
  const [errors,          setErrors]           = useState({ github: null, zoho: null, hubspot: null, razorpay: null });

  const setLoad  = (key, val) => setLoading(p => ({ ...p, [key]: val }));
  const setRefr  = (key, val) => setRefreshing(p => ({ ...p, [key]: val }));
  const setErr   = (key, val) => setErrors(p => ({ ...p, [key]: val }));
  const goConnect = () => navigate('/integrations');

  // ── 1. Check connection status ─────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    if (!orgId) return;
    setStatusLoading(true);
    const [gh, zo, hs, rp] = await Promise.allSettled([
      api.integrations.github.getStatus(orgId),
      api.integrations.zoho.getStatus(orgId),
      api.integrations.hubspot.getStatus(orgId),
      api.integrations.razorpay.getStatus(orgId),
    ]);
    setConnected({
      github:   gh.status === 'fulfilled' && gh.value.data.connected,
      zoho:     zo.status === 'fulfilled' && zo.value.data.connected,
      hubspot:  hs.status === 'fulfilled' && hs.value.data.connected,
      razorpay: rp.status === 'fulfilled' && rp.value.data.connected,
    });
    setStatusLoading(false);
  }, [orgId]);

  // ── 2. Fetch helpers ───────────────────────────────────────────────────────
  const fetchGithub = useCallback(async (isRefresh = false) => {
    if (!orgId || !connected.github) return;
    isRefresh ? setRefr('github', true) : setLoad('github', true);
    setErr('github', null);
    try {
      const res = await api.integrations.github.getMetrics(orgId);
      setGithubMetrics(res.data);
    } catch (e) { setErr('github', e.message || 'Failed to load GitHub metrics'); }
    finally { isRefresh ? setRefr('github', false) : setLoad('github', false); }
  }, [orgId, connected.github]);

  const fetchZoho = useCallback(async (isRefresh = false) => {
    if (!orgId || !connected.zoho) return;
    isRefresh ? setRefr('zoho', true) : setLoad('zoho', true);
    setErr('zoho', null);
    try {
      const res = await api.integrations.zoho.getMetrics(orgId);
      setZohoMetrics(res.data);
    } catch (e) { setErr('zoho', e.message || 'Failed to load financial metrics'); }
    finally { isRefresh ? setRefr('zoho', false) : setLoad('zoho', false); }
  }, [orgId, connected.zoho]);

  const fetchHubspot = useCallback(async (isRefresh = false) => {
    if (!orgId || !connected.hubspot) return;
    isRefresh ? setRefr('hubspot', true) : setLoad('hubspot', true);
    setErr('hubspot', null);
    try {
      const res = await api.integrations.hubspot.getMetrics(orgId);
      setHubspotMetrics(res.data);
    } catch (e) { setErr('hubspot', e.message || 'Failed to load HubSpot metrics'); }
    finally { isRefresh ? setRefr('hubspot', false) : setLoad('hubspot', false); }
  }, [orgId, connected.hubspot]);

  const fetchRazorpay = useCallback(async (isRefresh = false) => {
    if (!orgId || !connected.razorpay) return;
    isRefresh ? setRefr('razorpay', true) : setLoad('razorpay', true);
    setErr('razorpay', null);
    try {
      const res = await api.integrations.razorpay.getMetrics(orgId);
      setRazorpayMetrics(res.data);
    } catch (e) { setErr('razorpay', e.message || 'Failed to load Razorpay metrics'); }
    finally { isRefresh ? setRefr('razorpay', false) : setLoad('razorpay', false); }
  }, [orgId, connected.razorpay]);

  useEffect(() => { checkStatus(); }, [checkStatus]);
  useEffect(() => { if (connected.github)   fetchGithub();   }, [connected.github,   fetchGithub]);
  useEffect(() => { if (connected.zoho)     fetchZoho();     }, [connected.zoho,     fetchZoho]);
  useEffect(() => { if (connected.hubspot)  fetchHubspot();  }, [connected.hubspot,  fetchHubspot]);
  useEffect(() => { if (connected.razorpay) fetchRazorpay(); }, [connected.razorpay, fetchRazorpay]);

  if (!orgId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-700">
            Your account is not linked to an organization. Please complete onboarding.
          </p>
        </div>
      </div>
    );
  }

  const g  = githubMetrics   || {};
  const f  = zohoMetrics     || {};
  const h  = hubspotMetrics  || {};
  const rp = razorpayMetrics || {};

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user?.name ? `${user.name}'s Dashboard` : 'Founder Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {connectedCount === 0
              ? 'No integrations connected yet'
              : `${connectedCount} integration${connectedCount > 1 ? 's' : ''} live`}
          </p>
        </div>
        {statusLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking…
          </div>
        )}
      </div>

      {/* Connect nudge */}
      {!statusLoading && connectedCount === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-start gap-4">
          <Zap className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-800 dark:text-blue-200">No integrations connected yet</p>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-0.5">
              Connect GitHub, Zoho Books, HubSpot, and Razorpay to see live metrics.
            </p>
          </div>
          <button
            onClick={goConnect}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            Connect now
          </button>
        </div>
      )}

      {/* ── Zoho / Financial ────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Financial"
          badge="Zoho Books"
          connected={connected.zoho}
          onRefresh={() => fetchZoho(true)}
          refreshing={refreshing.zoho}
          onConnect={goConnect}
          integration="Zoho Books"
        />
        {errors.zoho && <ErrorBanner message={errors.zoho} />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={DollarSign}   label="Cash Balance"     value={connected.zoho ? fmt.currency(f.cash_balance) : '—'}          sub="Current bank balance"    accent="green"  loading={loading.zoho} />
          <MetricCard icon={TrendingDown} label="Monthly Burn"     value={connected.zoho ? fmt.currency(f.burn_rate_monthly) : '—'}       sub="Net burn rate"           accent="red"    loading={loading.zoho} />
          <MetricCard icon={BarChart3}    label="Monthly Revenue"  value={connected.zoho ? fmt.currency(f.total_revenue_month) : '—'}     sub="This month"              accent="blue"   loading={loading.zoho} />
          <MetricCard icon={Clock}        label="Runway"           value={connected.zoho ? fmt.months(f.runway_months) : '—'}             sub="At current burn"
            accent={!f.runway_months ? 'blue' : f.runway_months < 3 ? 'red' : f.runway_months < 6 ? 'orange' : 'green'}
            loading={loading.zoho}
          />
        </div>
      </section>

      {/* ── Razorpay / Payments ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Payments"
          badge="Razorpay"
          connected={connected.razorpay}
          onRefresh={() => fetchRazorpay(true)}
          refreshing={refreshing.razorpay}
          onConnect={goConnect}
          integration="Razorpay"
        />
        {errors.razorpay && <ErrorBanner message={errors.razorpay} />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={TrendingUp}   label="MRR"                value={connected.razorpay ? fmt.currency(rp.mrr) : '—'}                    sub="Monthly Recurring Revenue" accent="green"  loading={loading.razorpay} />
          <MetricCard icon={BarChart3}    label="ARR"                value={connected.razorpay ? fmt.currency(rp.arr) : '—'}                    sub="Annual Recurring Revenue"  accent="blue"   loading={loading.razorpay} />
          <MetricCard icon={CreditCard}   label="Payments (MTD)"    value={connected.razorpay ? fmt.currency(rp.revenue_mtd) : '—'}            sub="Month to date"             accent="purple" loading={loading.razorpay} />
          <MetricCard icon={Activity}     label="Active Subs"        value={connected.razorpay ? fmt.number(rp.active_subscriptions) : '—'}     sub={connected.razorpay ? `${fmt.percent(rp.churn_rate)} churn` : undefined} accent="orange" loading={loading.razorpay} />
        </div>
        {connected.razorpay && !loading.razorpay && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <MetricCard icon={ShoppingCart} label="Total Payments"     value={fmt.number(rp.total_payments)}      sub={`${fmt.number(rp.successful_payments)} successful`} accent="blue"   loading={false} />
            <MetricCard icon={Users}        label="Total Customers"    value={fmt.number(rp.total_customers)}     sub={`${fmt.number(rp.new_customers_this_month)} new this month`} accent="green"  loading={false} />
            <MetricCard icon={TrendingDown} label="Churned MRR"        value={fmt.currency(rp.churned_mrr)}      sub="This month"                                         accent="red"    loading={false} />
          </div>
        )}
      </section>

      {/* ── HubSpot / CRM ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="CRM & Sales"
          badge="HubSpot"
          connected={connected.hubspot}
          onRefresh={() => fetchHubspot(true)}
          refreshing={refreshing.hubspot}
          onConnect={goConnect}
          integration="HubSpot"
        />
        {errors.hubspot && <ErrorBanner message={errors.hubspot} />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={UserCheck}  label="Total Contacts"     value={connected.hubspot ? fmt.number(h.total_contacts) : '—'}            sub={connected.hubspot ? `${fmt.number(h.new_contacts_this_month)} new this month` : undefined} accent="blue"   loading={loading.hubspot} />
          <MetricCard icon={Briefcase}  label="Pipeline Value"     value={connected.hubspot ? fmt.currency(h.pipeline_value, '$') : '—'}     sub="Open deals"                                                                                    accent="purple" loading={loading.hubspot} />
          <MetricCard icon={DollarSign} label="Closed Won"         value={connected.hubspot ? fmt.currency(h.closed_won_revenue, '$') : '—'} sub={connected.hubspot ? `${fmt.number(h.closed_won_deals)} deals` : undefined}                  accent="green"  loading={loading.hubspot} />
          <MetricCard icon={BarChart3}  label="Win Rate"           value={connected.hubspot ? fmt.percent(h.win_rate) : '—'}                 sub={connected.hubspot ? `${fmt.number(h.open_deals)} open deals` : undefined}                   accent="orange" loading={loading.hubspot} />
        </div>
        {connected.hubspot && !loading.hubspot && (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mt-3">
            <MetricCard icon={Users}     label="Total Companies"   value={fmt.number(h.total_companies)}   sub={`${fmt.number(h.new_companies_this_month)} new this month`} accent="blue"  loading={false} />
            <MetricCard icon={Activity}  label="MRR (HubSpot)"    value={fmt.currency(h.monthly_recurring_revenue, '$')} sub="From closed deals"                          accent="green" loading={false} />
          </div>
        )}
      </section>

      {/* ── GitHub / Engineering ────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Engineering"
          badge="GitHub"
          connected={connected.github}
          onRefresh={() => fetchGithub(true)}
          refreshing={refreshing.github}
          onConnect={goConnect}
          integration="GitHub"
        />
        {errors.github && <ErrorBanner message={errors.github} />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Activity}      label="Commits this week"   value={connected.github ? fmt.number(g.commits_this_week) : '—'}    sub={connected.github ? `${fmt.number(g.commits_this_month)} this month` : undefined} accent="purple" loading={loading.github} />
          <MetricCard icon={GitPullRequest} label="Open PRs"           value={connected.github ? fmt.number(g.open_prs) : '—'}             sub={connected.github ? `${fmt.number(g.merged_prs)} merged` : undefined}             accent="blue"   loading={loading.github} />
          <MetricCard icon={Users}          label="Active Contributors" value={connected.github ? fmt.number(g.active_contributors) : '—'} sub={connected.github ? `${fmt.number(g.total_contributors)} total` : undefined}      accent="green"  loading={loading.github} />
          <MetricCard icon={GitBranch}      label="Active Repos"       value={connected.github ? fmt.number(g.active_repositories) : '—'} sub={connected.github ? `${fmt.number(g.total_repositories)} total` : undefined}      accent="orange" loading={loading.github} />
        </div>

        {connected.github && !loading.github && g.top_repos && g.top_repos.length > 0 && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Repositories</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {g.top_repos.slice(0, 5).map((repo, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{repo.name}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{fmt.number(repo.commits)} commits</span>
                    <span>{fmt.number(repo.prs)} PRs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Integration status bar */}
      <section className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Integrations</p>
          <button onClick={goConnect} className="text-xs text-blue-600 hover:underline">Manage</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Zoho Books', key: 'zoho'     },
            { label: 'Razorpay',  key: 'razorpay'  },
            { label: 'HubSpot',   key: 'hubspot'   },
            { label: 'GitHub',    key: 'github'     },
          ].map(({ label, key }) => (
            <div
              key={key}
              className={`flex items-center gap-2 p-2 rounded-lg border ${
                connected[key]
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : 'bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
              }`}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${connected[key] ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
              {connected[key] && <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}