import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  AreaChart, Area, Legend, ComposedChart, Line, CartesianGrid,
} from 'recharts';

export const PALETTE = {
  primary: '#0055BE', accent: '#0055BE', positive: '#10b981', negative: '#f43f5e',
  chart: ['#0055BE','#3B82F6','#93C5FD','#002D62','#10b981','#f59e0b','#8b5cf6','#ec4899'],
};

const tt = {
  backgroundColor: 'rgba(15, 23, 42, 0.92)', border: 'none', borderRadius: '12px',
  color: '#e2e8f0', fontSize: '12px', padding: '10px 14px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
  backdropFilter: 'blur(8px)',
};

export function SmoothAreaChart({ data, dataKey='value', nameKey='name', color=PALETTE.accent, height=200 }) {
  if (!data?.length) return null;
  const gid = `sg-${color.replace('#','')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{top:4,right:4,bottom:0,left:-24}}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2}/>
            <stop offset="100%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey={nameKey} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tt} cursor={{stroke:color,strokeWidth:1,strokeDasharray:'4 4'}}/>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} dot={false} activeDot={{r:4,fill:color,stroke:'#fff',strokeWidth:2}}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CleanBarChart({ data, dataKey='value', nameKey='name', color=PALETTE.accent, height=200 }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{top:4,right:4,bottom:0,left:-24}}>
        <XAxis dataKey={nameKey} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tt} cursor={{fill:'rgba(0,85,190,0.04)'}}/>
        <Bar dataKey={dataKey} fill={color} radius={[6,6,0,0]} maxBarSize={32}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height=200 }) {
  if (!data?.length) return null;
  const total = data.reduce((s,d)=>s+d.value,0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" nameKey="name" stroke="none" cornerRadius={8}>
          {data.map((_,i)=><Cell key={i} fill={PALETTE.chart[i%PALETTE.chart.length]}/>)}
        </Pie>
        <Tooltip contentStyle={tt}/>
        <Legend iconType="circle" iconSize={6} wrapperStyle={{fontSize:'11px',color:'#94a3b8'}}
          formatter={(v,e)=><span style={{color:'#64748b'}}>{v} ({Math.round(e.payload.value/total*100)}%)</span>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── Combo: Bar + Line chart ───────────────────────────────────── */
export function LineBarCombo({ data, barKey='value', lineKey='value2', nameKey='name', height=200 }) {
  if (!data?.length) return null;
  const gid = 'combo-line-grad';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{top:4,right:4,bottom:0,left:-24}}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.accent} stopOpacity={0.15}/>
            <stop offset="100%" stopColor={PALETTE.accent} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false}/>
        <XAxis dataKey={nameKey} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tt}/>
        <Bar dataKey={barKey} fill={PALETTE.accent} radius={[4,4,0,0]} maxBarSize={28} opacity={0.8}/>
        <Line type="monotone" dataKey={lineKey} stroke={PALETTE.positive} strokeWidth={2.5} dot={{r:3,fill:PALETTE.positive,stroke:'#fff',strokeWidth:2}} activeDot={{r:5}}/>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ── Mini Sparkline ────────────────────────────────────────────── */
export function MiniSparkline({ data, dataKey='value', color=PALETTE.accent, height=40 }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{top:2,right:2,bottom:2,left:2}}>
        <defs>
          <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="100%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace('#','')})`} dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Chart Card — Glassmorphism ────────────────────────────────── */
export function ChartCard({ title, source, children, isEmpty, className='' }) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 tracking-tight">{title}</h3>
        {source && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">{source}</span>}
      </div>
      {isEmpty
        ? <div className="flex flex-col items-center justify-center h-[160px] gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100/60 dark:bg-slate-800/60 flex items-center justify-center">
              <div className="w-4 h-0.5 bg-slate-300 dark:bg-slate-600 rounded"/>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">No data yet</p>
          </div>
        : children}
    </div>
  );
}
