import { Globe, Music, Facebook, Linkedin, FileSpreadsheet, Tag } from 'lucide-react';
import { useLeads } from '@/context/useLeads';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe, Music, Facebook, Linkedin, FileSpreadsheet, Tag,
};

export default function SourceBadge({ source }: { source: string }) {
  const { leadSources } = useLeads();
  const config = leadSources.find(s => s.id === source);
  const Icon = iconMap[config?.icon || 'Tag'] || Tag;
  const color = config?.color || '#6B7280';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        color: color,
      }}
    >
      <Icon className="h-3 w-3" />
      {config?.label || source}
    </span>
  );
}
