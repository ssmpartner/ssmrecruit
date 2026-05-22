import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Users, Building2, UserCircle2 } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const [q, setQ] = useState('');
  const { leads, agencies, employees } = useLeads();
  const { role, isReviewRole, isBackoffice } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!open) setQ(''); }, [open]);

  // Scope per role: review roles & backoffice => only leads
  const canSearchAgencies = !isReviewRole && !isBackoffice;
  const canSearchEmployees = !isReviewRole && !isBackoffice;

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { leads: [], agencies: [], employees: [] };
    const termDigits = term.replace(/\D/g, '');

    const leadHits = leads.filter(l => {
      const phoneDigits = (l.phone || '').replace(/\D/g, '');
      const phoneMatch = termDigits.length > 0 && phoneDigits.includes(termDigits);
      return (
        l.name?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.city?.toLowerCase().includes(term) ||
        (l.plz || '').includes(term) ||
        phoneMatch
      );
    }).slice(0, 8);

    const agencyHits = canSearchAgencies ? agencies.filter(a =>
      a.name?.toLowerCase().includes(term) ||
      (a.city || '').toLowerCase().includes(term) ||
      (a.plz || '').includes(term)
    ).slice(0, 6) : [];

    const employeeHits = canSearchEmployees ? employees.filter(e =>
      e.name?.toLowerCase().includes(term) ||
      e.email?.toLowerCase().includes(term)
    ).slice(0, 6) : [];

    return { leads: leadHits, agencies: agencyHits, employees: employeeHits };
  }, [q, leads, agencies, employees, canSearchAgencies, canSearchEmployees]);

  const total = results.leads.length + results.agencies.length + results.employees.length;

  const handleNav = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 top-[20%] translate-y-0 border-2 shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              canSearchAgencies
                ? 'Suche nach Leads, Agenturen oder Mitarbeitern…'
                : 'Suche nach Leads (Name, E-Mail, Telefon, PLZ, Ort)…'
            }
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border bg-muted px-2 text-[10px] font-medium text-muted-foreground">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!q.trim() && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Beginnen Sie zu tippen, um zu suchen…
            </div>
          )}
          {q.trim() && total === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Keine Ergebnisse für „{q}"
            </div>
          )}

          {results.leads.length > 0 && (
            <Section title="Leads" icon={<Users className="h-3.5 w-3.5" />}>
              {results.leads.map(l => (
                <ResultRow
                  key={l.id}
                  title={l.name}
                  subtitle={[l.email, l.phone, [l.plz, l.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                  onClick={() => handleNav(`/leads?leadId=${l.id}`)}
                />
              ))}
            </Section>
          )}

          {results.agencies.length > 0 && (
            <Section title="Agenturen" icon={<Building2 className="h-3.5 w-3.5" />}>
              {results.agencies.map(a => (
                <ResultRow
                  key={a.id}
                  title={a.name}
                  subtitle={[a.plz, a.city].filter(Boolean).join(' ')}
                  onClick={() => handleNav('/agencies')}
                />
              ))}
            </Section>
          )}

          {results.employees.length > 0 && (
            <Section title="Mitarbeiter" icon={<UserCircle2 className="h-3.5 w-3.5" />}>
              {results.employees.map(e => (
                <ResultRow
                  key={e.id}
                  title={e.name}
                  subtitle={e.email}
                  onClick={() => handleNav('/employees')}
                />
              ))}
            </Section>
          )}
        </div>

        {(isReviewRole || isBackoffice) && (
          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            Ihre Rolle ({role}) hat nur Zugriff auf Leads.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ResultRow({ title, subtitle, onClick }: { title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left hover:bg-muted/70 transition-colors"
    >
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground truncate max-w-full">{subtitle}</div>}
    </button>
  );
}
