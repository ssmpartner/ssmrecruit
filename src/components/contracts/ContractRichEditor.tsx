import { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
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
  Minus, Quote, Pilcrow,
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
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: 'contract-editor prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[420px] px-6 py-5',
      },
    },
    onUpdate: ({ editor: ed }) => onChange(chipsToTokens(ed.getHTML())),
  });

  // Externe Inhalte (z.B. nach DOCX-Import oder Vorlagenwechsel) übernehmen
  useEffect(() => {
    if (!editor) return;
    const current = chipsToTokens(editor.getHTML());
    if ((value || '') !== current) {
      editor.commands.setContent(tokensToChips(value || ''), { emitUpdate: false });
    }
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
        <div className="ml-auto">
          <PlaceholderPicker
            area={area}
            targetGroup={targetGroup}
            onInsertKey={(key) => editor.chain().focus().insertContent({ type: 'contractPlaceholder', attrs: { key } }).run()}
          />
        </div>
      </div>
      <div className="bg-white dark:bg-muted/20 max-h-[58vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
