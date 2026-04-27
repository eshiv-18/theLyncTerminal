import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import DashboardSidebar, { FILTERS } from '../components/DashboardSidebar';
import { FinanceSection, SalesSection, PaymentsSection, EngineeringSection } from '../components/DashboardSections';
import {
  AlertCircle, RefreshCw, Loader2, Link2, ArrowRight, Calendar,
  LayoutDashboard, DollarSign, Users, CreditCard, GitBranch,
  Building2, Globe, Rocket, MapPin, Sparkles,
} from 'lucide-react';

function getQuarter() {
  const d=new Date(), q=Math.ceil((d.getMonth()+1)/3);
  return `Q${q} ${d.getFullYear()}`;
}
function getQuarterRange() {
  const d=new Date(), q=Math.ceil((d.getMonth()+1)/3);
  const start = new Date(d.getFullYear(), (q-1)*3, 1);
  const end = new Date(d.getFullYear(), q*3, 0);
  const fmt = (dt) => dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `${fmt(start)} – ${fmt(end)}, ${d.getFullYear()}`;
}

/* ── Empty state ───────────────────────────────────────────────── */
function EmptyState({ onConnect }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
        <Link2 className="h-7 w-7 text-slate-400"/>
      </div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 tracking-tight">No integrations connected</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        Connect your tools to see live metrics, charts, and insights in one place.
      </p>
      <button onClick={onConnect}
        className="inline-flex items-center gap-2 bg-[#0055BE] hover:bg-[#004AAA] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm">
        Connect Apps <ArrowRight className="h-4 w-4"/>
      </button>
    </div>
  );
}

/* ── Mobile tabs ───────────────────────────────────────────────── */
function MobileTabs({ active, onChange }) {
  const icons = {all:LayoutDashboard,finances:DollarSign,sales:Users,payments:CreditCard,engineering:GitBranch};
  return (
    <div className="lg:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 mb-6">
      {FILTERS.map(f=>{
        const Icon=icons[f.id];
        return (
          <button key={f.id} onClick={()=>onChange(f.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
              active===f.id
                ? 'bg-[#0055BE] text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}>
            <Icon className="h-3.5 w-3.5"/> {f.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Animated Quarter Badge ─────────────────────────────────── */
function QuarterBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVisible(true),100); return ()=>clearTimeout(t); },[]);
  return (
    <div className={`relative overflow-hidden rounded-2xl glass-accent p-5 mb-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer pointer-events-none"/>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0055BE] to-[#003D8F] flex items-center justify-center shadow-lg shadow-[#0055BE]/20 animate-pulse-slow">
            <Sparkles className="h-6 w-6 text-white"/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#0055BE] dark:text-blue-400 uppercase tracking-widest mb-0.5">Current Quarter</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{getQuarter()}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{getQuarterRange()}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
          <Calendar className="h-4 w-4 text-[#0055BE]"/>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Company Info Banner ───────────────────────────────────────── */
function CompanyBanner({ user }) {
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVisible(true),300); return ()=>clearTimeout(t); },[]);
  
  const startup = user?.startup;
  const companyName = startup?.name || startup?.company_name || user?.name;
  const sector = startup?.sector;
  const stage = startup?.stage;
  const hq = startup?.hq;
  const website = startup?.website;
  
  if (!companyName) return null;
  
  return (
    <div className={`flex items-center gap-4 mb-6 transition-all duration-500 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0055BE] to-[#003D8F] dark:from-blue-400 dark:to-blue-200 flex items-center justify-center shadow-sm">
        <Building2 className="h-5 w-5 text-white dark:text-slate-900"/>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">{companyName}</h2>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {sector && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0055BE] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
              <Rocket className="h-3 w-3"/>{sector}
            </span>
          )}
          {stage && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-md">
              {stage}
            </span>
          )}
          {hq && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin className="h-3 w-3"/>{hq}
            </span>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-500 transition-colors">
              <Globe className="h-3 w-3"/>{website.replace(/https?:\/\//,'')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function FounderHome() {
  const {user}=useAuth();
  const navigate=useNavigate();
  const orgId=user?.organization_id??user?.startup?.id??user?.id;
  const [filter,setFilter]=useState('all');
  const [collapsed,setCollapsed]=useState(false);
  const [con,setCon]=useState({github:false,zoho:false,hubspot:false,razorpay:false});
  const [gm,setGm]=useState(null);
  const [zm,setZm]=useState(null);
  const [hm,setHm]=useState(null);
  const [rm,setRm]=useState(null);
  const [sLoad,setSLoad]=useState(true);
  const [ld,setLd]=useState({github:false,zoho:false,hubspot:false,razorpay:false});
  const [ref,setRef]=useState(false);
  const sl=(k,v)=>setLd(p=>({...p,[k]:v}));
  const go=()=>navigate('/integrations');

  const checkStatus=useCallback(async()=>{
    if(!orgId) return; setSLoad(true);
    const [a,b,c,d]=await Promise.allSettled([
      api.integrations.github.getStatus(orgId),api.integrations.zoho.getStatus(orgId),
      api.integrations.hubspot.getStatus(orgId),api.integrations.razorpay.getStatus(orgId),
    ]);
    setCon({github:a.status==='fulfilled'&&a.value.data.connected,zoho:b.status==='fulfilled'&&b.value.data.connected,
      hubspot:c.status==='fulfilled'&&c.value.data.connected,razorpay:d.status==='fulfilled'&&d.value.data.connected});
    setSLoad(false);
  },[orgId]);

  const fGh=useCallback(async()=>{if(!orgId||!con.github)return;sl('github',true);try{setGm((await api.integrations.github.getMetrics(orgId)).data);}catch{}finally{sl('github',false);}},[orgId,con.github]);
  const fZo=useCallback(async()=>{if(!orgId||!con.zoho)return;sl('zoho',true);try{setZm((await api.integrations.zoho.getMetrics(orgId)).data);}catch{}finally{sl('zoho',false);}},[orgId,con.zoho]);
  const fHs=useCallback(async()=>{if(!orgId||!con.hubspot)return;sl('hubspot',true);try{setHm((await api.integrations.hubspot.getMetrics(orgId)).data);}catch{}finally{sl('hubspot',false);}},[orgId,con.hubspot]);
  const fRp=useCallback(async()=>{if(!orgId||!con.razorpay)return;sl('razorpay',true);try{setRm((await api.integrations.razorpay.getMetrics(orgId)).data);}catch{}finally{sl('razorpay',false);}},[orgId,con.razorpay]);

  const refreshAll=async()=>{setRef(true);await Promise.allSettled([fGh(),fZo(),fHs(),fRp()]);setRef(false);};

  useEffect(()=>{checkStatus();},[checkStatus]);
  useEffect(()=>{if(con.github)fGh();},[con.github,fGh]);
  useEffect(()=>{if(con.zoho)fZo();},[con.zoho,fZo]);
  useEffect(()=>{if(con.hubspot)fHs();},[con.hubspot,fHs]);
  useEffect(()=>{if(con.razorpay)fRp();},[con.razorpay,fRp]);

  if(!orgId) return (
    <div className="p-6"><div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0"/>
      <p className="text-sm text-amber-700">Your account is not linked to an organization. Please complete onboarding.</p>
    </div></div>
  );

  const cc=Object.values(con).filter(Boolean).length;
  if(!sLoad&&cc===0) return <div className="py-12 px-6"><EmptyState onConnect={go}/></div>;

  const show=s=>filter==='all'||filter===s;

  return (
    <div className="flex h-full">
      {/* Sidebar flush to left edge */}
      <div className={`hidden lg:block shrink-0 border-r border-slate-200 dark:border-slate-800 py-4 ${collapsed ? 'px-2' : 'pl-4 pr-3'}`}>
        <DashboardSidebar active={filter} onChange={setFilter} connected={con} collapsed={collapsed} onCollapse={()=>setCollapsed(!collapsed)}/>
      </div>

      {/* Content area with internal padding */}
      <div className="flex-1 min-w-0 py-6 px-6 lg:px-8">
        {/* ── Animated Quarter Banner ── */}
        <QuarterBanner/>

        {/* ── Company Info ── */}
        <CompanyBanner user={user}/>

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-6 animate-fadeIn">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">
              {user?.name ? `${user.name}'s Dashboard` : 'Dashboard'}
            </h1>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="text-[12px] text-slate-400">
                {sLoad ? 'Checking…' : `${cc} integration${cc>1?'s':''} active`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sLoad && <Loader2 className="h-4 w-4 animate-spin text-slate-400"/>}
            <button onClick={refreshAll} disabled={ref||sLoad}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${ref?'animate-spin':''}`}/> Refresh
            </button>
          </div>
        </div>

        {/* ── Status pills ── */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {[{l:'Zoho',k:'zoho'},{l:'Razorpay',k:'razorpay'},{l:'HubSpot',k:'hubspot'},{l:'GitHub',k:'github'}].map(({l,k},i)=>(
            <span key={k} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-300 ${
              con[k]
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
            }`} style={{animationDelay:`${i*100}ms`}}>
              <span className={`h-1.5 w-1.5 rounded-full transition-colors ${con[k]?'bg-emerald-500 animate-pulse':'bg-slate-300 dark:bg-slate-600'}`}/>
              {l}
            </span>
          ))}
        </div>

        <MobileTabs active={filter} onChange={setFilter}/>

        {/* ── Sections ── */}
        <div className="space-y-10">
          {show('finances') && <FinanceSection data={zm||{}} connected={con.zoho} loading={ld.zoho}/>}
          {show('sales') && <SalesSection data={hm||{}} connected={con.hubspot} loading={ld.hubspot}/>}
          {show('payments') && <PaymentsSection data={rm||{}} connected={con.razorpay} loading={ld.razorpay}/>}
          {show('engineering') && <EngineeringSection data={gm||{}} connected={con.github} loading={ld.github}/>}
        </div>
      </div>
    </div>
  );
}