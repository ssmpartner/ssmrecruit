import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PERMS: { key: string; label: string }[] = [
  { key: 'can_view', label: 'Ansehen' },
  { key: 'can_generate', label: 'Generieren' },
  { key: 'can_edit', label: 'Bearbeiten' },
  { key: 'can_manage_templates', label: 'Vorlagen' },
  { key: 'can_manage_letterhead', label: 'Briefpapier' },
  { key: 'can_finalize', label: 'Finalisieren' },
  { key: 'can_archive', label: 'Archivieren' },
];

type Row = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  perms: Record<string, boolean>;
};

export default function ContractPermissionsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: emps }, { data: perms }] = await Promise.all([
      supabase.from('employees').select('user_id, name, email').not('user_id', 'is', null),
      supabase.from('contract_permissions').select('*'),
    ]);
    const permMap = new Map((perms ?? []).map((p: any) => [p.user_id, p]));
    setRows((emps ?? []).map((e: any) => ({
      user_id: e.user_id,
      display_name: e.name,
      email: e.email,
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
      await supabase.from('contract_permissions').update({ [key]: value }).eq('user_id', userId);
    } else {
      await supabase.from('contract_permissions').insert({ user_id: userId, [key]: value });
    }
    toast.success('Aktualisiert');
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Vorerst nur für Superadmin sichtbar. Diese Berechtigungen schalten das Modul später für weitere Rollen frei.
      </p>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
              {PERMS.map(p => <TableHead key={p.key} className="text-center">{p.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={PERMS.length + 1} className="text-center py-8 text-muted-foreground">Lädt…</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.user_id}>
                <TableCell>
                  <div className="font-medium text-sm">{r.display_name || '–'}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                {PERMS.map(p => (
                  <TableCell key={p.key} className="text-center">
                    <Checkbox checked={r.perms[p.key]} onCheckedChange={v => toggle(r.user_id, p.key, !!v)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
