import React from 'react';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Lead, Agency, Employee } from '@/lib/mock-data';
import type { LeadSourceConfig } from '@/context/leads-context';

interface ExportActionsProps {
  filtered: Lead[];
  agencies: Agency[];
  employees: Employee[];
  leadSources: LeadSourceConfig[];
  activeTab: string;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportActions({ filtered, agencies, employees, leadSources, activeTab }: ExportActionsProps) {
  const handleCSV = () => {
    const date = format(new Date(), 'yyyy-MM-dd');
    const agencyMap = new Map(agencies.map(a => [a.id, a.name]));
    const empMap = new Map(employees.map(e => [e.id, e.name]));
    const srcMap = new Map(leadSources.map(s => [s.id, s.label]));

    const headers = ['Name', 'E-Mail', 'Telefon', 'Kanton', 'Stadt', 'Status', 'Quelle', 'Agentur', 'Mitarbeiter', 'Kampagne', 'Erstellt'];
    const rows = filtered.map(l => [
      l.name, l.email, l.phone, l.canton, l.city, l.status,
      srcMap.get(l.source) || l.source, agencyMap.get(l.agencyId) || l.agencyId,
      empMap.get(l.employeeId) || l.employeeId, l.campaign,
      format(new Date(l.createdAt), 'dd.MM.yyyy'),
    ]);

    downloadCSV(`analytics-${activeTab}-${date}.csv`, headers, rows);
  };

  const handlePDF = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleCSV}
        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-[10px] font-semibold text-foreground hover:bg-muted transition-colors"
      >
        <Download className="h-3 w-3" />
        CSV
      </button>
      <button
        onClick={handlePDF}
        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-[10px] font-semibold text-foreground hover:bg-muted transition-colors"
      >
        <FileText className="h-3 w-3" />
        PDF
      </button>
    </div>
  );
}
