/**
 * FounderHome.js — Founder Dashboard
 *
 * FIXES APPLIED:
 *  - Was: `return <h1 style={{color:'red'}}>NEW DASHBOARD WORKING</h1>`
 *  - Now: Real dashboard that reads tokens from DB and displays live metrics
 *
 * Data flow:
 *  1. Reads orgId from user context (organization_id or startup.id)
 *  2. Calls GET /api/auth/github/status  → knows if GitHub connected
 *  3. Calls GET /api/auth/zoho/status    → knows if Zoho connected
 *  4. If connected, calls GET /api/github/metrics   → repo/commit/PR data
 *  5. If connected, calls GET /api/financial/metrics → revenue/burn/runway
 *  6. Renders real numbers; shows "Connect" CTA if not yet linked
 *
 * Persistence: tokens live in MongoDB keyed to organization_id, so they
 * survive logout/login. No session storage is used for OAuth tokens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  GitBranch, GitPullRequest, Users, Code2,
  DollarSign, TrendingDown, Clock, AlertCircle,
  RefreshCw, ExternalLink, Loader2, CheckCircle2,
  Activity, BarChart3, Zap,
} from 'lucide-react';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const fmt = {
  currency: (n) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n),
  number: (n) => (n == null ? '—' : new Intl.NumberFormat().format(n)),
  months: (n) => (n == null ? '—' : `${parseFloat(n).toFixed(1)} mo`),
};

function MetricCard({ icon: Icon, label, value, sub, accent = 'blue', loading }) {
  const accents = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`p-1.5 rounded-lg ${accents[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />
      ) : (
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, connected, onRefresh, refreshing, onConnect, integration }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        {connected ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
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
        <button
          onClick={onConnect}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Connect {integration}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FounderHome() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Stable org ID — never 'default_org'. Mirrors the fix in IntegrationsPage.
  const orgId = user?.organization_id ?? user?.startup?.id ?? user?.id;

  // Connection status
  const [githubConnected, setGithubConnected] = useState(false);
  const [zohoConnected,   setZohoConnected]   = useState(false);

  // Metric data
  const [githubMetrics,   setGithubMetrics]   = useState(null);
  const [zohoMetrics,     setZohoMetrics]     = useState(null);

  // Loading / error states
  const [statusLoading,   setStatusLoading]   = useState(true);
  const [githubLoading,   setGithubLoading]   = useState(false);
  const [zohoLoading,     setZohoLoading]     = useState(false);
  const [githubError,     setGithubError]     = useState(null);
  const [zohoError,       setZohoError]       = useState(null);
  const [githubRefreshing,setGithubRefreshing]= useState(false);
  const [zohoRefreshing,  setZohoRefreshing]  = useState(false);

  // ── 1. Check which integrations are connected ──────────────────────────────
  const checkStatus = useCallback(async () => {
    if (!orgId) return;
    setStatusLoading(true);
    try {
      const [ghRes, zoRes] = await Promise.allSettled([
        api.integrations.github.getStatus(orgId),
        api.integrations.zoho.getStatus(orgId),
      ]);
      setGithubConnected(ghRes.status === 'fulfilled' && ghRes.value.data.connected);
      setZohoConnected(zoRes.status === 'fulfilled' && zoRes.value.data.connected);
    } finally {
      setStatusLoading(false);
    }
  }, [orgId]);

  // ── 2. Fetch GitHub metrics ────────────────────────────────────────────────
  const fetchGithubMetrics = useCallback(async (isRefresh = false) => {
    if (!orgId || !githubConnected) return;
    isRefresh ? setGithubRefreshing(true) : setGithubLoading(true);
    setGithubError(null);
    try {
      const res = await api.integrations.github.getMetrics(orgId);
      setGithubMetrics(res.data);
    } catch (err) {
      setGithubError(err.message || 'Failed to load GitHub metrics');
    } finally {
      isRefresh ? setGithubRefreshing(false) : setGithubLoading(false);
    }
  }, [orgId, githubConnected]);

  // ── 3. Fetch Zoho / financial metrics ────────────────────────────────────
  const fetchZohoMetrics = useCallback(async (isRefresh = false) => {
    if (!orgId || !zohoConnected) return;
    isRefresh ? setZohoRefreshing(true) : setZohoLoading(true);
    setZohoError(null);
    try {
      const res = await api.integrations.zoho.getMetrics(orgId);
      setZohoMetrics(res.data);
    } catch (err) {
      setZohoError(err.message || 'Failed to load financial metrics');
    } finally {
      isRefresh ? setZohoRefreshing(false) : setZohoLoading(false);
    }
  }, [orgId, zohoConnected]);

  // ── Orchestrate on mount + when connection status resolves ─────────────────
  useEffect(() => { checkStatus(); }, [checkStatus]);
  useEffect(() => { if (githubConnected) fetchGithubMetrics(); }, [githubConnected, fetchGithubMetrics]);
  useEffect(() => { if (zohoConnected)   fetchZohoMetrics();   }, [zohoConnected,   fetchZohoMetrics]);

  // ── Shorthand for "go connect this integration" ───────────────────────────
  const goConnect = () => navigate('/integrations');

  // ─── Render ───────────────────────────────────────────────────────────────
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

  const g = githubMetrics  || {};
  const f = zohoMetrics    || {};

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user?.name ? `${user.name}'s Dashboard` : 'Founder Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live data from your connected integrations
          </p>
        </div>

        {statusLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking connections…
          </div>
        )}
      </div>

      {/* ── Onboarding nudge if nothing connected ──────────────────────────── */}
      {!statusLoading && !githubConnected && !zohoConnected && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-start gap-4">
          <Zap className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-800 dark:text-blue-200">No integrations connected yet</p>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-0.5">
              Connect GitHub and Zoho Books to start seeing real metrics on this dashboard.
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

      {/* ── Financial Section (Zoho) ──────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Financial Overview"
          connected={zohoConnected}
          onRefresh={() => fetchZohoMetrics(true)}
          refreshing={zohoRefreshing}
          onConnect={goConnect}
          integration="Zoho Books"
        />

        {zohoError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {zohoError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            icon={DollarSign}
            label="Cash Balance"
            value={zohoConnected ? fmt.currency(f.cash_balance) : '—'}
            sub="Current bank balance"
            accent="green"
            loading={zohoLoading}
          />
          <MetricCard
            icon={TrendingDown}
            label="Monthly Burn"
            value={zohoConnected ? fmt.currency(f.burn_rate_monthly) : '—'}
            sub="Net burn rate"
            accent="red"
            loading={zohoLoading}
          />
          <MetricCard
            icon={BarChart3}
            label="Monthly Revenue"
            value={zohoConnected ? fmt.currency(f.total_revenue_month) : '—'}
            sub="This month"
            accent="blue"
            loading={zohoLoading}
          />
          <MetricCard
            icon={Clock}
            label="Runway"
            value={zohoConnected ? fmt.months(f.runway_months) : '—'}
            sub="At current burn"
            accent={
              f.runway_months == null ? 'blue'
                : f.runway_months < 3 ? 'red'
                : f.runway_months < 6 ? 'orange'
                : 'green'
            }
            loading={zohoLoading}
          />
        </div>

        {/* Zoho secondary row */}
        {zohoConnected && !zohoLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <MetricCard
              icon={DollarSign}
              label="Accounts Receivable"
              value={fmt.currency(f.accounts_receivable)}
              sub="Outstanding invoices"
              accent="orange"
              loading={false}
            />
            <MetricCard
              icon={DollarSign}
              label="Quarterly Revenue"
              value={fmt.currency(f.total_revenue_quarter)}
              sub="Last 3 months"
              accent="blue"
              loading={false}
            />
            <MetricCard
              icon={TrendingDown}
              label="Quarterly Expenses"
              value={fmt.currency(f.total_expenses_quarter)}
              sub="Last 3 months"
              accent="red"
              loading={false}
            />
          </div>
        )}
      </section>

      {/* ── Engineering Section (GitHub) ─────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Engineering Activity"
          connected={githubConnected}
          onRefresh={() => fetchGithubMetrics(true)}
          refreshing={githubRefreshing}
          onConnect={goConnect}
          integration="GitHub"
        />

        {githubError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {githubError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            icon={Activity}
            label="Commits this week"
            value={githubConnected ? fmt.number(g.commits_this_week) : '—'}
            sub={githubConnected ? `${fmt.number(g.commits_this_month)} this month` : undefined}
            accent="purple"
            loading={githubLoading}
          />
          <MetricCard
            icon={GitPullRequest}
            label="Open PRs"
            value={githubConnected ? fmt.number(g.open_prs) : '—'}
            sub={githubConnected ? `${fmt.number(g.merged_prs)} merged` : undefined}
            accent="blue"
            loading={githubLoading}
          />
          <MetricCard
            icon={Users}
            label="Active Contributors"
            value={githubConnected ? fmt.number(g.active_contributors) : '—'}
            sub={githubConnected ? `${fmt.number(g.total_contributors)} total` : undefined}
            accent="green"
            loading={githubLoading}
          />
          <MetricCard
            icon={GitBranch}
            label="Active Repos"
            value={githubConnected ? fmt.number(g.active_repositories) : '—'}
            sub={githubConnected ? `${fmt.number(g.total_repositories)} total` : undefined}
            accent="orange"
            loading={githubLoading}
          />
        </div>

        {/* Top repos table */}
        {githubConnected && !githubLoading && g.top_repos && g.top_repos.length > 0 && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Repositories</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {g.top_repos.slice(0, 5).map((repo, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {repo.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{fmt.number(repo.commits)} commits</span>
                    <span>{fmt.number(repo.prs)} PRs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Language breakdown */}
        {githubConnected && !githubLoading && g.languages && Object.keys(g.languages).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(g.languages)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([lang, count]) => (
                <span
                  key={lang}
                  className="text-xs px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                >
                  {lang} <span className="opacity-60">({count})</span>
                </span>
              ))}
          </div>
        )}
      </section>

      {/* ── Integration status summary ────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Integrations</p>
          <button
            onClick={goConnect}
            className="text-xs text-blue-600 hover:underline"
          >
            Manage
          </button>
        </div>
        <div className="mt-3 flex gap-4">
          {[
            { label: 'GitHub',     connected: githubConnected },
            { label: 'Zoho Books', connected: zohoConnected   },
          ].map(({ label, connected }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}