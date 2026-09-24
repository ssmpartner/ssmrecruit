import { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, Node, Extension, mergeAttributes } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, Table as TableIcon,
  Minus, Quote, Pilcrow, FileDown,
} from 'lucide-react';
import PlaceholderPicker from './PlaceholderPicker';
import { placeholderLabel, type ContractArea, type TargetGroupCode } from '@/lib/contract-placeholders';

/** Inline-Knoten, der einen Platzhalter als Chip mit Klartext-Namen darstellt. */
const PlaceholderNode = Node.create({
  name: 'contractPlaceholder',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      key: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-placeholder]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const key = String(node.attrs.key || '');
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-placeholder': key,
        class: 'ph-chip',
      }),
      placeholderLabel(key),
    ];
  },
  renderText({ node }) {
    return `{{${node.attrs.key}}}`;
  },
});

/** Manueller Seitenumbruch (A4). */
const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': 'true', class: 'page-break' })];
  },
});

// A4 bei 96 dpi, Ränder identisch zur Vorschau
const PAGE_H = 1123, PAD_TOP = 110, PAD_BOTTOM = 90, PAGE_GAP = 28;
const USABLE = PAGE_H - PAD_TOP - PAD_BOTTOM;
const paginationKey = new PluginKey<{ breaks: { pos: number; rest: number; page: number }[]; deco: DecorationSet }>('a4Pagination');

function gapWidget(rest: number, page: number) {
  const el = document.createElement('div');
  el.className = 'a4-page-gap';
  el.contentEditable = 'false';
  el.style.height = `${rest + PAD_BOTTOM + PAGE_GAP + PAD_TOP}px`;
  el.innerHTML = `<div class="a4-gap-band" style="top:${rest + PAD_BOTTOM}px;height:${PAGE_GAP}px"><span>Seite ${page}</span></div>`;
  return el;
}

/** Zeigt echte A4-Seiten im Editor: Blöcke, die über das Seitenende laufen, rutschen auf die nächste Seite. */
const A4Pagination = Extension.create({
  name: 'a4Pagination',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: paginationKey,
      state: {
        init: () => ({ breaks: [], deco: DecorationSet.empty }),
        apply(tr, prev) {
          const meta = tr.getMeta(paginationKey);
          if (meta) {
            return {
              breaks: meta,
              deco: DecorationSet.create(tr.doc, meta.map((b: any) =>
                Decoration.widget(b.pos, () => gapWidget(b.rest, b.page), { side: -1, key: `gap-${b.pos}-${b.rest}`, ignoreSelection: true }))),
            };
          }
          return { breaks: prev.breaks, deco: prev.deco.map(tr.mapping, tr.doc) };
        },
      },
      props: { decorations: (state) => paginationKey.getState(state)?.deco },
      view: (view) => {
        let raf = 0;
        const measure = () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const root = view.dom as HTMLElement;
            const rootTop = root.getBoundingClientRect().top;
            const gaps = Array.from(root.querySelectorAll<HTMLElement>(':scope > .a4-page-gap'))
              .map(g => ({ top: g.getBoundingClientRect().top, h: g.offsetHeight }));
            const breaks: { pos: number; rest: number; page: number }[] = [];
            let shift = 0; let forceNext = false;
            view.state.doc.forEach((node, offset) => {
              const dom = view.nodeDOM(offset) as HTMLElement | null;
              if (!dom || !(dom instanceof HTMLElement)) return;
              const r = dom.getBoundingClientRect();
              const before = gaps.filter(g => g.top < r.top).reduce((a, g) => a + g.h, 0);
              const natural = r.top - rootTop - before - PAD_TOP;
              let y = natural + shift;
              const inPage = ((y % USABLE) + USABLE) % USABLE;
              const overflow = inPage + r.height > USABLE && r.height <= USABLE && inPage > 0;
              if ((forceNext && inPage > 0) || overflow) {
                const rest = USABLE - inPage;
                shift += rest; y += rest;
                breaks.push({ pos: offset, rest, page: Math.round(y / USABLE) + 1 });
              }
              forceNext = node.type.name === 'pageBreak';
            });
            const cur = paginationKey.getState(view.state)?.breaks ?? [];
            if (JSON.stringify(cur) !== JSON.stringify(breaks)) {
              view.dispatch(view.state.tr.setMeta(paginationKey, breaks).setMeta('addToHistory', false));
            }
          });
        };
        measure();
        return { update: (_v, prevState) => { if (prevState.doc !== view.state.doc || !paginationKey.getState(view.state)?.breaks.length) measure(); }, destroy: () => cancelAnimationFrame(raf) };
      },
    })];
  },
});

/** {{key}} → Chip-Markup für den Editor. */
export function tokensToChips(html: string): string {
  return (html || '').replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi,
    (_m, key) => `<span data-placeholder="${key}"></span>`);
}

/** Chip-Markup → {{key}} für Speicherung/Rendering. */
export function chipsToTokens(html: string): string {
  return (html || '').replace(/<span[^>]*data-placeholder="([a-z0-9_.]+)"[^>]*>.*?<\/span>/gi,
    (_m, key) => `{{${key}}}`);
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  area: ContractArea;
  targetGroup?: TargetGroupCode;
}

export default function ContractRichEditor({ value, onChange, area, targetGroup }: Props) {
  const initial = useMemo(() => tokensToChips(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Letzter vom Editor selbst gemeldeter Stand – verhindert, dass eigene Eingaben
  // (z.B. Leerzeilen oder Leerschläge) durch ein Zurücksetzen verloren gehen.
  const lastEmitted = useRef<string>(value || '');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      PlaceholderNode,
      PageBreakNode,
      A4Pagination,
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: 'contract-editor prose prose-sm max-w-none dark:prose-invert focus:outline-none contract-a4-sheet',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = chipsToTokens(ed.getHTML());
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Externe Inhalte (z.B. nach DOCX-Import oder Vorlagenwechsel) übernehmen.
  // Eigene Tastatureingaben werden übersprungen, damit der Cursor bleibt.
  useEffect(() => {
    if (!editor) return;
    const next = value || '';
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    editor.commands.setContent(tokensToChips(next), { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return <div className="rounded-lg border min-h-[420px]" />;

  const tb = (active: boolean) => (active ? 'bg-accent text-accent-foreground' : '');

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()} title="Rückgängig"><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()} title="Wiederholen"><Redo2 className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('bold'))}`} onClick={() => editor.chain().focus().toggleBold().run()} title="Fett"><Bold className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('italic'))}`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv"><Italic className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('underline'))}`} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Unterstrichen"><UnderlineIcon className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('paragraph'))}`} onClick={() => editor.chain().focus().setParagraph().run()} title="Normaler Text"><Pilcrow className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('heading', { level: 1 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Titel"><Heading1 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('heading', { level: 2 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Überschrift"><Heading2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('heading', { level: 3 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Unterüberschrift"><Heading3 className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('bulletList'))}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste"><List className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('orderedList'))}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummerierte Liste"><ListOrdered className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive('blockquote'))}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Zitat"><Quote className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Trennlinie"><Minus className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive({ textAlign: 'left' }))}`} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Linksbündig"><AlignLeft className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive({ textAlign: 'center' }))}`} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Zentriert"><AlignCenter className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 ${tb(editor.isActive({ textAlign: 'right' }))}`} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Rechtsbündig"><AlignRight className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabelle einfügen"><TableIcon className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()} title="Seitenumbruch einfügen"><FileDown className="h-4 w-4" /></Button>
        <div className="ml-auto">
          <PlaceholderPicker
            area={area}
            targetGroup={targetGroup}
            onInsertKey={(key) => editor.chain().focus().insertContent({ type: 'contractPlaceholder', attrs: { key } }).run()}
          />
        </div>
      </div>

      {editor.isActive('table') && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 px-2 py-1.5 text-xs">
          <span className="mr-1 text-muted-foreground">Tabelle:</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().addRowBefore().run()}>Zeile oben</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().addRowAfter().run()}>Zeile unten</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().deleteRow().run()}>Zeile löschen</Button>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().addColumnBefore().run()}>Spalte links</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().addColumnAfter().run()}>Spalte rechts</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().deleteColumn().run()}>Spalte löschen</Button>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().mergeOrSplit().run()}>Zellen verbinden/teilen</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Kopfzeile</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}>Tabelle löschen</Button>
          <span className="ml-auto text-muted-foreground">Spaltenbreite: Trennlinie mit der Maus ziehen</span>
        </div>
      )}

      <div className="bg-muted/60 max-h-[58vh] overflow-auto py-6 px-4">
        <EditorContent editor={editor} className="mx-auto w-fit" />
      </div>
    </div>
  );
}
