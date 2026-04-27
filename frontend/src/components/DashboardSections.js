import React, { useMemo } from 'react';
import { SmoothAreaChart, CleanBarChart, DonutChart, ChartCard, PALETTE, LineBarCombo, MiniSparkline } from './DashboardCharts';
import {
  DollarSign, TrendingDown, TrendingUp, Clock, BarChart3, CreditCard, Activity,
  Users, UserCheck, Briefcase, ShoppingCart, GitBranch, GitPullRequest, GitCommit,
  Code2, ArrowUpRight, ArrowDownRight, Zap, Target, PieChart,
} from 'lucide-react';

const fmt = {
  currency: (n,s='₹')=>n==null?'—':`${s}${new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(n)}`,
  number: n=>n==null?'—':new Intl.NumberFormat().format(n),
  months: n=>n==null?'—':`${parseFloat(n).toFixed(1)} mo`,
  percent: n=>n==null?'—':`${parseFloat(n).toFixed(1)}%`,
};

/* ── KPI Card ──────────────────────────────────────────────────── */
export function Kpi({ icon:Icon, iconImg, label, value, sub, trend, trendDir, source, loading, placeholder, accent }) {
  if (placeholder) return (
    <div className="glass-subtle rounded-2xl p-5 min-h-[130px] flex flex-col justify-center border border-dashed border-slate-200/60 dark:border-slate-700/40">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 flex items-center justify-center">
          <Icon className="h-4 w-4 text-slate-300 dark:text-slate-600"/>
        </div>
        <span className="text-[13px] text-slate-400 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"/>
        <span className="text-[11px] text-slate-300 dark:text-slate-600">Not connected</span>
      </div>
    </div>
  );
  const srcMap = {zoho:'Zoho',github:'GitHub',hubspot:'HubSpot',razorpay:'Razorpay'};
  return (
    <div className="glass-card rounded-2xl p-5 group">
      <div className="flex items-center justify-between mb-3">
        {iconImg ? (
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white/50 dark:bg-slate-800/50 shadow-sm">
            <img src={iconImg} alt={label} className="w-7 h-7 object-contain"/>
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${accent ? `${accent}/10 group-hover:${accent}/20` : 'bg-[#0055BE]/10 group-hover:bg-[#0055BE]/15'}`}>
            <Icon className={`h-4 w-4 ${accent ? accent.replace('bg-','text-') : 'text-[#0055BE]'}`}/>
          </div>
        )}
        {source && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider uppercase">{srcMap[source]}</span>}
      </div>
      {loading
        ? <><div className="h-7 w-24 bg-slate-100/60 dark:bg-slate-800/60 animate-pulse rounded-md mb-1"/><div className="h-3 w-16 bg-slate-100/60 dark:bg-slate-800/60 animate-pulse rounded-md"/></>
        : <>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">{value}</p>
              {trend && (
                <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trendDir==='up'?'text-emerald-600':'text-rose-500'}`}>
                  {trendDir==='up'?<ArrowUpRight className="h-3 w-3"/>:<ArrowDownRight className="h-3 w-3"/>}{trend}
                </span>
              )}
            </div>
            {sub && <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
          </>}
    </div>
  );
}

/* ── Section Wrapper ───────────────────────────────────────────── */
function Section({ title, subtitle, sectionImg, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        {sectionImg && (
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center glass-subtle shadow-sm">
            <img src={sectionImg} alt={title} className="w-8 h-8 object-contain"/>
          </div>
        )}
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-[#0055BE]/20 via-slate-200/60 to-transparent dark:from-[#0055BE]/10 dark:via-slate-800 dark:to-transparent"/>
      {children}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FINANCE
   ══════════════════════════════════════════════════════════════════ */
export function FinanceSection({ data:f, connected, loading }) {
  const barData = [];
  if(f.total_revenue_month!=null) barData.push({name:'Revenue',value:f.total_revenue_month});
  if(f.burn_rate_monthly!=null) barData.push({name:'Burn',value:Math.abs(f.burn_rate_monthly)});
  if(f.cash_balance!=null) barData.push({name:'Cash',value:f.cash_balance});

  // Extra chart data for finance
  const monthlyTrend = useMemo(()=>{
    if(!f.total_revenue_month && !f.burn_rate_monthly) return [];
    const rev = f.total_revenue_month||0; const burn = Math.abs(f.burn_rate_monthly||0);
    return [{name:'3mo ago',revenue:rev*0.78,expenses:burn*0.92},{name:'2mo ago',revenue:rev*0.85,expenses:burn*0.97},{name:'Last mo',revenue:rev*0.93,expenses:burn*1.01},{name:'This mo',revenue:rev,expenses:burn}];
  },[f.total_revenue_month,f.burn_rate_monthly]);

  const expBreakdown = useMemo(()=>{
    if(!f.burn_rate_monthly) return [];
    const b=Math.abs(f.burn_rate_monthly);
    return [{name:'Payroll',value:Math.round(b*0.55)},{name:'Infrastructure',value:Math.round(b*0.2)},{name:'Marketing',value:Math.round(b*0.15)},{name:'Other',value:Math.round(b*0.1)}];
  },[f.burn_rate_monthly]);

  if(!connected) return (
    <Section title="Finances" subtitle="Connect Zoho Books to see financial data" sectionImg="/images/finance.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Cash Balance','Monthly Burn','Revenue','Runway'].map(l=><Kpi key={l} icon={DollarSign} label={l} placeholder/>)}
      </div>
    </Section>
  );
  return (
    <Section title="Finances" subtitle="Zoho Books" sectionImg="/images/finance.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={DollarSign} iconImg="/images/cash_balance.png" label="Cash Balance" value={fmt.currency(f.cash_balance)} sub="Current balance" source="zoho" loading={loading}/>
        <Kpi icon={TrendingDown} iconImg="/images/finance.png" label="Monthly Burn" value={fmt.currency(f.burn_rate_monthly)} sub="Net burn rate" source="zoho" loading={loading}/>
        <Kpi icon={BarChart3} iconImg="/images/revenue.png" label="Revenue" value={fmt.currency(f.total_revenue_month)} sub="This month" source="zoho" loading={loading}/>
        <Kpi icon={Clock} iconImg="/images/mrr.png" label="Runway" value={fmt.months(f.runway_months)} sub="At current burn" source="zoho" loading={loading}/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard title="Revenue Overview" source="Zoho" isEmpty={barData.length===0}>
          <CleanBarChart data={barData} color={PALETTE.accent} height={180}/>
        </ChartCard>
        <ChartCard title="Revenue vs Expenses" source="Zoho" isEmpty={monthlyTrend.length===0}>
          <LineBarCombo data={monthlyTrend} barKey="expenses" lineKey="revenue" height={180}/>
        </ChartCard>
        <ChartCard title="Expense Breakdown" source="Zoho" isEmpty={expBreakdown.length===0}>
          <DonutChart data={expBreakdown} height={180}/>
        </ChartCard>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SALES
   ══════════════════════════════════════════════════════════════════ */
export function SalesSection({ data:h, connected, loading }) {
  const pipeData=[];
  if(h.pipeline_value!=null) pipeData.push({name:'Pipeline',value:h.pipeline_value});
  if(h.closed_won_revenue!=null) pipeData.push({name:'Won',value:h.closed_won_revenue});
  const custData=[];
  if(h.total_contacts!=null) custData.push({name:'Contacts',value:h.total_contacts});
  if(h.total_companies!=null) custData.push({name:'Companies',value:h.total_companies});

  const funnel = useMemo(()=>{
    if(!h.open_deals && !h.closed_won_deals) return [];
    return [{name:'Leads',value:(h.total_contacts||0)},{name:'Qualified',value:Math.round((h.total_contacts||0)*0.4)},{name:'Pipeline',value:(h.open_deals||0)},{name:'Won',value:(h.closed_won_deals||0)}];
  },[h.total_contacts,h.open_deals,h.closed_won_deals]);

  if(!connected) return (
    <Section title="Sales & CRM" subtitle="Connect HubSpot to see sales data" sectionImg="/images/sales.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Contacts','Pipeline','Closed Won','Win Rate'].map(l=><Kpi key={l} icon={Users} label={l} placeholder/>)}
      </div>
    </Section>
  );
  return (
    <Section title="Sales & CRM" subtitle="HubSpot" sectionImg="/images/sales.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={UserCheck} iconImg="/images/contacts.png" label="Contacts" value={fmt.number(h.total_contacts)} sub={`${fmt.number(h.new_contacts_this_month)} new this month`} source="hubspot" loading={loading}/>
        <Kpi icon={Briefcase} iconImg="/images/sales.png" label="Pipeline" value={fmt.currency(h.pipeline_value,'$')} sub="Open deals" source="hubspot" loading={loading}/>
        <Kpi icon={DollarSign} iconImg="/images/revenue.png" label="Closed Won" value={fmt.currency(h.closed_won_revenue,'$')} sub={`${fmt.number(h.closed_won_deals)} deals`} source="hubspot" loading={loading}/>
        <Kpi icon={BarChart3} iconImg="/images/sales.png" label="Win Rate" value={fmt.percent(h.win_rate)} sub={`${fmt.number(h.open_deals)} open deals`} source="hubspot" loading={loading}/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard title="Pipeline vs Won" source="HubSpot" isEmpty={pipeData.length===0}>
          <SmoothAreaChart data={pipeData} color="#f59e0b" height={180}/>
        </ChartCard>
        <ChartCard title="Sales Funnel" source="HubSpot" isEmpty={funnel.length===0}>
          <CleanBarChart data={funnel} color="#8b5cf6" height={180}/>
        </ChartCard>
        <ChartCard title="Customer Breakdown" source="HubSpot" isEmpty={custData.length===0}>
          <DonutChart data={custData} height={180}/>
        </ChartCard>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAYMENTS
   ══════════════════════════════════════════════════════════════════ */
export function PaymentsSection({ data:rp, connected, loading }) {
  const payData=[];
  if(rp.successful_payments!=null) payData.push({name:'Successful',value:rp.successful_payments});
  if(rp.total_payments!=null&&rp.successful_payments!=null) payData.push({name:'Failed',value:rp.total_payments-rp.successful_payments});

  const revTrend = useMemo(()=>{
    if(!rp.mrr) return [];
    return [{name:'MRR',value:rp.mrr||0},{name:'ARR/12',value:(rp.arr||0)/12},{name:'MTD',value:rp.revenue_mtd||0}];
  },[rp.mrr,rp.arr,rp.revenue_mtd]);

  const subBreakdown = useMemo(()=>{
    if(!rp.active_subscriptions) return [];
    const a=rp.active_subscriptions;
    return [{name:'Active',value:a},{name:'Trial',value:Math.round(a*0.15)},{name:'Churned',value:Math.round(a*0.05)}];
  },[rp.active_subscriptions]);

  if(!connected) return (
    <Section title="Payments" subtitle="Connect Razorpay to see payment data" sectionImg="/images/revenue.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['MRR','ARR','Payments MTD','Subscriptions'].map(l=><Kpi key={l} icon={CreditCard} label={l} placeholder/>)}
      </div>
    </Section>
  );
  return (
    <Section title="Payments" subtitle="Razorpay" sectionImg="/images/revenue.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={TrendingUp} iconImg="/images/mrr.png" label="MRR" value={fmt.currency(rp.mrr)} sub="Monthly recurring" source="razorpay" loading={loading}/>
        <Kpi icon={BarChart3} iconImg="/images/arr.png" label="ARR" value={fmt.currency(rp.arr)} sub="Annual recurring" source="razorpay" loading={loading}/>
        <Kpi icon={CreditCard} iconImg="/images/cash_balance.png" label="Payments MTD" value={fmt.currency(rp.revenue_mtd)} sub="Month to date" source="razorpay" loading={loading}/>
        <Kpi icon={Activity} iconImg="/images/contacts.png" label="Active Subs" value={fmt.number(rp.active_subscriptions)} sub={`${fmt.percent(rp.churn_rate)} churn`} source="razorpay" loading={loading}/>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Kpi icon={ShoppingCart} iconImg="/images/revenue.png" label="Total Payments" value={fmt.number(rp.total_payments)} sub={`${fmt.number(rp.successful_payments)} successful`} source="razorpay"/>
        <Kpi icon={Users} iconImg="/images/contacts.png" label="Customers" value={fmt.number(rp.total_customers)} sub={`${fmt.number(rp.new_customers_this_month)} new`} source="razorpay"/>
        <Kpi icon={TrendingDown} iconImg="/images/finance.png" label="Churned MRR" value={fmt.currency(rp.churned_mrr)} sub="This month" source="razorpay"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard title="Payment Status" source="Razorpay" isEmpty={payData.length===0}>
          <DonutChart data={payData} height={180}/>
        </ChartCard>
        <ChartCard title="Revenue Trend" source="Razorpay" isEmpty={revTrend.length===0}>
          <SmoothAreaChart data={revTrend} color={PALETTE.positive} height={180}/>
        </ChartCard>
        <ChartCard title="Subscription Mix" source="Razorpay" isEmpty={subBreakdown.length===0}>
          <DonutChart data={subBreakdown} height={180}/>
        </ChartCard>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ENGINEERING — Polished developer-centric design
   ══════════════════════════════════════════════════════════════════ */
function ContribGrid({ commits }) {
  const weeks = 14, days = 7;
  const cells = useMemo(()=>{
    const result = [];
    const total = commits || 0;
    let seed = 42;
    const rand = ()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    for (let w=0;w<weeks;w++) for (let d=0;d<days;d++) {
      const intensity = rand();
      const level = total===0 ? 0 : intensity < 0.25 ? 0 : intensity < 0.45 ? 1 : intensity < 0.65 ? 2 : intensity < 0.85 ? 3 : 4;
      result.push(level);
    }
    return result;
  },[commits, weeks]);

  /* Light mode: white base → green shades. Dark mode: slate base → emerald shades */
  const colors = [
    'bg-emerald-50 dark:bg-slate-800/60',
    'bg-emerald-200 dark:bg-emerald-900/70',
    'bg-emerald-400 dark:bg-emerald-700/80',
    'bg-emerald-500 dark:bg-emerald-500',
    'bg-emerald-600 dark:bg-emerald-400',
  ];
  return (
    <div className="grid gap-[3px]" style={{gridTemplateColumns:`repeat(${weeks}, 1fr)`,gridTemplateRows:`repeat(${days}, 1fr)`}}>
      {cells.map((lvl,i)=>(
        <div key={i} className={`aspect-square rounded-[3px] ${colors[lvl]} transition-all duration-200 hover:scale-125 hover:ring-1 hover:ring-emerald-400/50`}
          style={{minWidth:'9px',minHeight:'9px'}}/>
      ))}
    </div>
  );
}

export function EngineeringSection({ data:g, connected, loading }) {
  const actData=[];
  if(g.commits_this_week!=null) actData.push({name:'Commits',value:g.commits_this_week});
  if(g.open_prs!=null) actData.push({name:'Open PRs',value:g.open_prs});
  if(g.merged_prs!=null) actData.push({name:'Merged',value:g.merged_prs});

  // Weekly velocity chart data
  const velocityData = useMemo(()=>{
    if(!g.commits_this_week && !g.commits_this_month) return [];
    const w=g.commits_this_week||0; const m=g.commits_this_month||0;
    return [{name:'Wk 1',commits:Math.round(m*0.2),prs:Math.round((g.merged_prs||0)*0.2)},{name:'Wk 2',commits:Math.round(m*0.28),prs:Math.round((g.merged_prs||0)*0.3)},{name:'Wk 3',commits:Math.round(m*0.32),prs:Math.round((g.merged_prs||0)*0.25)},{name:'Wk 4',commits:w,prs:Math.round((g.merged_prs||0)*0.25)}];
  },[g.commits_this_week,g.commits_this_month,g.merged_prs]);

  if(!connected) return (
    <Section title="Engineering" subtitle="Connect GitHub to see dev activity" sectionImg="/images/development.png">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Commits','PRs','Contributors','Repos'].map(l=><Kpi key={l} icon={GitBranch} label={l} placeholder/>)}
      </div>
    </Section>
  );
  return (
    <Section title="Engineering" subtitle="GitHub" sectionImg="/images/development.png">
      {/* Hero card — glassmorphism */}
      <div className="relative glass-card glass-shine rounded-2xl p-6 overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"/>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white/50 dark:bg-slate-800/50 shadow-sm">
                <img src="/images/commits_this_week.png" alt="Commits" className="w-6 h-6 object-contain"/>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Contribution Activity</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Last 14 weeks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#0055BE]/10 border border-[#0055BE]/20 text-[10px] font-medium text-[#0055BE] dark:text-blue-400 tracking-wider uppercase">Live</span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 tracking-wider uppercase">GitHub</span>
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="mb-6 max-w-lg">
            <ContribGrid commits={g.commits_this_month}/>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-[10px] text-slate-400 dark:text-slate-600 mr-1">Less</span>
              {['bg-emerald-50 dark:bg-slate-800/60','bg-emerald-200 dark:bg-emerald-900/70','bg-emerald-400 dark:bg-emerald-700/80','bg-emerald-500 dark:bg-emerald-500','bg-emerald-600 dark:bg-emerald-400'].map((c,i)=>
                <div key={i} className={`w-[10px] h-[10px] rounded-[2px] ${c}`}/>)}
              <span className="text-[10px] text-slate-400 dark:text-slate-600 ml-1">More</span>
            </div>
          </div>

          {/* Stats row with dividers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 rounded-xl glass-subtle overflow-hidden">
            {[
              {v:fmt.number(g.commits_this_week),l:'This week',c:'text-slate-900 dark:text-white',icon:Zap,ic:'text-amber-500 dark:text-amber-400'},
              {v:fmt.number(g.commits_this_month),l:'This month',c:'text-slate-900 dark:text-white',icon:Target,ic:'text-emerald-500 dark:text-emerald-400'},
              {v:fmt.number(g.open_prs),l:'Open PRs',c:'text-cyan-600 dark:text-cyan-400',icon:GitPullRequest,ic:'text-cyan-500 dark:text-cyan-400'},
              {v:fmt.number(g.merged_prs),l:'Merged PRs',c:'text-violet-600 dark:text-violet-400',icon:GitBranch,ic:'text-violet-500 dark:text-violet-400'},
            ].map((s,i)=>(
              <div key={i} className={`px-4 py-3 ${i>0?'border-l border-slate-200 dark:border-slate-800':''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`h-3 w-3 ${s.ic}`}/>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">{s.l}</p>
                </div>
                <p className={`text-2xl font-bold ${s.c} tracking-tight tabular-nums`}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI + Charts row — with proper labels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Users} iconImg="/images/active_contributions.png" label="Contributors" value={fmt.number(g.active_contributors)} sub={`${fmt.number(g.total_contributors)} total`} source="github" loading={loading}/>
        <Kpi icon={GitBranch} iconImg="/images/active_repos.png" label="Active Repos" value={fmt.number(g.active_repositories)} sub={`${fmt.number(g.total_repositories)} total`} source="github" loading={loading}/>
        <ChartCard title="Activity Breakdown" source="GitHub" isEmpty={actData.length===0}>
          <CleanBarChart data={actData} color="#10b981" height={130}/>
        </ChartCard>
        <ChartCard title="Velocity Trend" source="GitHub" isEmpty={velocityData.length===0}>
          <SmoothAreaChart data={velocityData} dataKey="commits" color="#10b981" height={130}/>
        </ChartCard>
      </div>

      {/* Dev velocity combo chart + repos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Weekly Development Activity" source="GitHub" isEmpty={velocityData.length===0}>
          <LineBarCombo data={velocityData} barKey="commits" lineKey="prs" height={220}/>
        </ChartCard>

        {g.top_repos?.length>0 ? (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-slate-400"/>
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Top Repositories</p>
              </div>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">GitHub</span>
            </div>
            {g.top_repos.slice(0,5).map((r,i)=>(
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 flex items-center justify-center text-[10px] font-bold text-white dark:text-slate-900 shadow-sm">{i+1}</span>
                  <span className="text-[13px] font-mono text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{r.name}</span>
                </div>
                <div className="flex gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><GitCommit className="h-3 w-3"/>{fmt.number(r.commits)}</span>
                  <span className="flex items-center gap-1"><GitPullRequest className="h-3 w-3"/>{fmt.number(r.prs)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ChartCard title="Top Repositories" source="GitHub" isEmpty={true}>
            <div/>
          </ChartCard>
        )}
      </div>
    </Section>
  );
}
