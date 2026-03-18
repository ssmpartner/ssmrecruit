import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
}

export default function StatCard({ title, value, change, positive, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-lg bg-accent p-2">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {change && (
        <p className={`mt-1 text-sm font-medium ${positive ? 'text-success' : 'text-destructive'}`}>
          {positive ? '↑' : '↓'} {change}
        </p>
      )}
    </div>
  );
}
