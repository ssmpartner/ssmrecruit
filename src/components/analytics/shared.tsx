import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PIE_COLORS = [
  'hsl(168,17%,23%)', 'hsl(162,17%,50%)', 'hsl(67,16%,66%)',
  'hsl(38,80%,50%)', 'hsl(210,60%,52%)', 'hsl(152,55%,40%)',
  'hsl(0,65%,51%)', 'hsl(270,40%,50%)',
];

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.payload.fill }} />
        <span className="font-semibold text-foreground">{d.name}:</span>
        <span className="text-muted-foreground">{d.value}</span>
      </div>
    </div>
  );
};

interface StatCardModernProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  accentColor: string;
}

export function StatCardModern({ icon: Icon, title, value, subtitle, trend, accentColor }: StatCardModernProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.07] -translate-y-8 translate-x-8 transition-transform group-hover:scale-125" style={{ background: accentColor }} />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-xl p-2 transition-colors" style={{ background: `${accentColor}15` }}>
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', trend >= 0 ? 'bg-[hsl(152,55%,40%)]/10 text-[hsl(152,55%,40%)]' : 'bg-destructive/10 text-destructive')}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  );
}

export function ChartCard({ title, subtitle, icon: Icon, children, className }: { title: string; subtitle?: string; icon?: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border bg-card shadow-sm overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-2">
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <div>
          <h3 className="text-xs font-semibold">{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 pt-3">{children}</div>
    </div>
  );
}

export const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const x = cx + (outerRadius + 24) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 24) * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="hsl(0,0%,45%)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-medium">
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};
