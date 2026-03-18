import { Globe, Music, Facebook, Linkedin, FileSpreadsheet } from 'lucide-react';
import { type LeadSource, sourceConfig } from '@/lib/mock-data';

const iconMap = { Globe, Music, Facebook, Linkedin, FileSpreadsheet };

export default function SourceBadge({ source }: { source: LeadSource }) {
  const config = sourceConfig[source];
  const Icon = iconMap[config.icon as keyof typeof iconMap];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
