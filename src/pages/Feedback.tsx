import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, MessageSquare, Trash2, Loader2, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

type Attachment = { path: string; url: string; name: string; type: string };

type Feedback = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by_user_id: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  attachments: Attachment[] | null;
};

type Comment = {
  id: string;
  feedback_id: string;
  comment: string;
  is_official: boolean;
  created_by_user_id: string;
  created_by_name: string;
  created_at: string;
  attachments: Attachment[] | null;
};

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Eingegangen', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  { value: 'reviewing', label: 'Wird überprüft', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  { value: 'in_progress', label: 'In Arbeit', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' },
  { value: 'done', label: 'Erledigt', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  { value: 'rejected', label: 'Abgelehnt', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
];

const CATEGORY_OPTIONS = [
  { value: 'improvement', label: 'Verbesserung' },
  { value: 'bug', label: 'Fehler' },
  { value: 'feature', label: 'Neue Funktion' },
  { value: 'ui', label: 'Design / UI' },
  { value: 'other', label: 'Sonstiges' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
];

function statusMeta(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value) ?? STATUS_OPTIONS[0];
}

export default function Feedback() {
  const { user, isSuperadmin } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  // New feedback form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('improvement');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  // Comment input per feedback id
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentAttachments, setCommentAttachments] = useState<Record<string, Attachment[]>>({});
  const [feedbackAttachments, setFeedbackAttachments] = useState<Attachment[]>([]);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingComment, setUploadingComment] = useState<Record<string, boolean>>({});

  async function uploadFiles(files: FileList | File[]): Promise<Attachment[]> {
    const arr = Array.from(files);
    const results: Attachment[] = [];
    for (const file of arr) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: max. 20MB`);
        continue;
      }
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${user?.id ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('feedback-attachments').upload(path, file, { contentType: file.type });
      if (error) { toast.error(`Upload fehlgeschlagen: ${file.name}`); continue; }
      const { data } = supabase.storage.from('feedback-attachments').getPublicUrl(path);
      results.push({ path, url: data.publicUrl, name: file.name, type: file.type });
    }
    return results;
  }

  const userName = (user?.user_metadata as { display_name?: string; full_name?: string } | undefined)?.display_name
    || (user?.user_metadata as { full_name?: string } | undefined)?.full_name
    || user?.email
    || 'Mitarbeiter';

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: fb, error: e1 }, { data: cm, error: e2 }] = await Promise.all([
      supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('feedback_comments').select('*').order('created_at', { ascending: true }),
    ]);
    if (e1 || e2) {
      toast.error('Feedback konnte nicht geladen werden');
    }
    setFeedbacks((fb as Feedback[]) ?? []);
    const grouped: Record<string, Comment[]> = {};
    ((cm as Comment[]) ?? []).forEach(c => {
      grouped[c.feedback_id] = grouped[c.feedback_id] ?? [];
      grouped[c.feedback_id].push(c);
    });
    setComments(grouped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitFeedback() {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error('Bitte Titel und Beschreibung ausfüllen');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 4000),
      category,
      priority,
      created_by_user_id: user.id,
      created_by_name: userName,
      created_by_email: user.email ?? '',
      attachments: feedbackAttachments,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Speichern fehlgeschlagen');
      return;
    }
    toast.success('Feedback gesendet – vielen Dank!');
    setTitle(''); setDescription(''); setCategory('improvement'); setPriority('medium');
    setFeedbackAttachments([]);
    setDialogOpen(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    const patch: Partial<Feedback> = { status };
    if (status === 'done') patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('feedback').update(patch).eq('id', id);
    if (error) { toast.error('Status konnte nicht geändert werden'); return; }
    toast.success('Status aktualisiert');
    load();
  }

  async function deleteFeedback(id: string) {
    if (!confirm('Feedback wirklich löschen?')) return;
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) { toast.error('Löschen fehlgeschlagen'); return; }
    toast.success('Feedback gelöscht');
    load();
  }

  async function addComment(feedbackId: string, asOfficial = false) {
    if (!user) return;
    const text = (commentDrafts[feedbackId] ?? '').trim();
    if (!text) return;
    const { error } = await supabase.from('feedback_comments').insert({
      feedback_id: feedbackId,
      comment: text.slice(0, 2000),
      is_official: asOfficial && isSuperadmin,
      created_by_user_id: user.id,
      created_by_name: userName,
    });
    if (error) { toast.error('Kommentar fehlgeschlagen'); return; }
    setCommentDrafts(d => ({ ...d, [feedbackId]: '' }));
    load();
  }

  const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.status === filter);

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Feedback</h1>
          <p className="text-muted-foreground mt-1 text-sm">Vorschläge, Wünsche und Verbesserungen für SSM Recruit</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Neues Feedback</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Neues Feedback</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titel</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Kurz und klar" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Beschreibung</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={4000} rows={6} placeholder="Was wünschst du dir? Was funktioniert nicht?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Kategorie</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priorität</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={submitFeedback} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Senden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Alle ({feedbacks.length})</Button>
        {STATUS_OPTIONS.map(s => {
          const c = feedbacks.filter(f => f.status === s.value).length;
          return (
            <Button key={s.value} variant={filter === s.value ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s.value)}>
              {s.label} ({c})
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Noch keine Feedbacks in dieser Kategorie.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(f => {
            const meta = statusMeta(f.status);
            const fComments = comments[f.id] ?? [];
            const canDelete = user?.id === f.created_by_user_id || isSuperadmin;
            return (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-lg">{f.title}</h3>
                      <Badge className={meta.color}>{meta.label}</Badge>
                      <Badge variant="outline">{CATEGORY_OPTIONS.find(c => c.value === f.category)?.label ?? f.category}</Badge>
                      {f.priority === 'high' && <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">Hohe Priorität</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Von {f.created_by_name} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: de })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isSuperadmin && (
                      <Select value={f.status} onValueChange={(v) => updateStatus(f.id, v)}>
                        <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteFeedback(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap mb-4">{f.description}</p>

                {fComments.length > 0 && (
                  <div className="space-y-2 mb-3 border-t pt-3">
                    {fComments.map(c => (
                      <div key={c.id} className={`rounded-lg p-3 text-sm ${c.is_official ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">{c.created_by_name}</span>
                          {c.is_official && <Badge variant="default" className="h-4 text-[10px] px-1.5">Offizielle Antwort</Badge>}
                          <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-start">
                  <Textarea
                    value={commentDrafts[f.id] ?? ''}
                    onChange={e => setCommentDrafts(d => ({ ...d, [f.id]: e.target.value }))}
                    placeholder="Kommentar hinzufügen..."
                    rows={2}
                    maxLength={2000}
                    className="text-sm"
                  />
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" onClick={() => addComment(f.id, false)}>Senden</Button>
                    {isSuperadmin && (
                      <Button size="sm" variant="outline" onClick={() => addComment(f.id, true)} title="Als offizielle Antwort markieren">
                        Offiziell
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
