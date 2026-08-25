import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const PERMS: { key: string; label: string }[] = [
  { key: 'can_view', label: 'Ansehen' },
  { key: 'can_generate', label: 'Generieren' },
  { key: 'can_edit', label: 'Bearbeiten' },
  { key: 'can_finalize', label: 'Finalisieren' },
  { key: 'can_send', label: 'Versenden' },
  { key: 'can_archive', label: 'Archivieren' },
  { key: 'can_manage_templates', label: 'Vorlagen' },
  { key: 'can_manage_attachments', label: 'Anhänge' },
  { key: 'can_manage_sets', label: 'Sets' },
  { key: 'can_manage_letterhead', label: 'Briefpapier' },
  { key: 'can_manage_placeholders', label: 'Platzhalter' },
  { key: 'can_view_audit_log', label: 'Audit-Log' },
];

type Row = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  perms: Record<string, boolean>;
};

const ROLE_DEFAULTS: Record<string, string[]> = {
  hr: ['can_view', 'can_generate', 'can_edit', 'can_finalize', 'can_send'],
  geschaeftsleitung: ['can_view', 'can_generate'],
  teamleiter: ['can_view', 'can_generate', 'can_edit'],
  backoffice: ['can_view', 'can_generate', 'can_edit'],
  agency_manager: ['can_view', 'can_generate', 'can_edit'],
};

export default function ContractPermissionsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: emps }, { data: perms }] = await Promise.all([
      supabase.from('employees').select('user_id, name, email, role').not('user_id', 'is', null),
      supabase.from('contract_permissions').select('*'),
    ]);
    const permMap = new Map((perms ?? []).map((p: any) => [p.user_id, p]));
    setRows((emps ?? []).map((e: any) => ({
      user_id: e.user_id,
      display_name: e.name,
      email: e.email,
      role: e.role,
      perms: PERMS.reduce((acc, p) => {
        acc[p.key] = !!permMap.get(e.user_id)?.[p.key];
        return acc;
      }, {} as Record<string, boolean>),
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(userId: string, key: string, value: boolean) {
    setRows(rs => rs.map(r => r.user_id === userId ? { ...r, perms: { ...r.perms, [key]: value } } : r));
    const existing = (await supabase.from('contract_permissions').select('id').eq('user_id', userId).maybeSingle()).data;
    if (existing) {
      await (supabase.from('contract_permissions') as any).update({ [key]: value }).eq('user_id', userId);
    } else {
      await (supabase.from('contract_permissions') as any).insert({ user_id: userId, [key]: value });
    }
    toast.success('Aktualisiert');
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          Admin/Superadmin haben automatisch alle Rechte. Rollen-Defaults (gelb hinterlegt) gelten ohne explizite Vergabe:
        </p>
        <ul className="ml-4 list-disc">
          <li><strong>HR</strong>: Ansehen, Generieren, Bearbeiten, Finalisieren, Versenden</li>
          <li><strong>Geschäftsleitung</strong>: Ansehen, Generieren</li>
          <li><strong>Recruiter</strong> (Teamleiter, Backoffice, Agency Manager): Ansehen, Generieren, Bearbeiten</li>
        </ul>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Mitarbeiter</TableHead>
              {PERMS.map(p => <TableHead key={p.key} className="text-center text-xs">{p.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={PERMS.length + 1} className="text-center py-8 text-muted-foreground">Lädt…</TableCell></TableRow>}
            {rows.map(r => {
              const defaults = ROLE_DEFAULTS[r.role ?? ''] ?? [];
              return (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <div className="font-medium text-sm">{r.display_name || '–'}</div>
                    <div className="text-xs text-muted-foreground">{r.email} · {r.role || 'kein Rolle'}</div>
                  </TableCell>
                  {PERMS.map(p => {
                    const isDefault = defaults.includes(p.key);
                    return (
                      <TableCell key={p.key} className={`text-center ${isDefault ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}>
                        <Checkbox checked={r.perms[p.key] || isDefault} disabled={isDefault} onCheckedChange={v => toggle(r.user_id, p.key, !!v)} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
