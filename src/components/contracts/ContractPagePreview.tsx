import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const A4_W = 794; // 210mm @96dpi
const A4_H = 1123; // 297mm @96dpi

interface Props {
  html: string;
  /** Hintergrundbild (Briefpapier, erste Seite) als Data-URL */
  backgroundUrl?: string | null;
  /** Ränder in px */
  padding?: { top: number; right: number; bottom: number; left: number };
}

export default function ContractPagePreview({
  html,
  backgroundUrl,
  padding = { top: 110, right: 80, bottom: 90, left: 80 },
}: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [laidOut, setLaidOut] = useState(html);

  const usable = A4_H - padding.top - padding.bottom;
  const innerWidth = A4_W - padding.left - padding.right;

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      // Blöcke nicht zerschneiden; zu grosse Tabellen/Listen zeilenweise umbrechen
      el.querySelectorAll('[data-a4-spacer]').forEach(n => n.remove());
      el.querySelectorAll<HTMLElement>('[data-a4-shift]').forEach(n => { n.style.marginTop = n.dataset.a4Shift === 'none' ? '' : n.dataset.a4Shift!; n.removeAttribute('data-a4-shift'); });
      el.querySelectorAll<HTMLElement>('[data-page-break]').forEach(b => { b.style.height = '0px'; b.style.margin = '0'; b.style.border = '0'; });
      const base = el.getBoundingClientRect().top;
      const SAFE = 6;
      const units: HTMLElement[] = [];
      const collect = (node: HTMLElement) => {
        const h = node.getBoundingClientRect().height;
        const rows = node.querySelectorAll<HTMLElement>(':scope > tbody > tr, :scope > thead > tr, :scope > tr, :scope > table > tbody > tr, :scope > li');
        if (h > usable - SAFE && rows.length > 1) rows.forEach(r => units.push(r));
        else units.push(node);
      };
      (Array.from(el.children) as HTMLElement[]).forEach(collect);
      let force = false;
      for (const u of units) {
        const r = u.getBoundingClientRect();
        const y = r.top - base;
        const inPage = y % usable;
        const overflow = inPage > 0 && inPage + r.height > usable - SAFE && r.height <= usable;
        if ((force && inPage > 0) || overflow) {
          const gap = usable - inPage;
          if (u.tagName === 'TR') {
            const sp = document.createElement('tr');
            sp.setAttribute('data-a4-spacer', '');
            const td = document.createElement('td');
            td.colSpan = 50;
            td.style.cssText = `height:${gap}px;padding:0;border:0`;
            sp.appendChild(td);
            u.before(sp);
          } else if (u.tagName === 'LI') {
            u.dataset.a4Shift = u.style.marginTop || 'none';
            u.style.marginTop = `${gap}px`;
          } else {
            const sp = document.createElement('div');
            sp.setAttribute('data-a4-spacer', '');
            sp.style.height = `${gap}px`;
            u.before(sp);
          }
        }
        force = u.hasAttribute('data-page-break');
      }
      setLaidOut(el.innerHTML);
      setContentHeight(el.scrollHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html, usable]);

  // Bilder/Fonts können die Höhe nachträglich ändern
  useEffect(() => {
    const t = setTimeout(() => {
      if (measureRef.current) setContentHeight(measureRef.current.scrollHeight);
    }, 250);
    return () => clearTimeout(t);
  }, [html, backgroundUrl]);

  const pages = Math.max(1, Math.ceil((contentHeight || 1) / usable));

  const contentClass =
    'contract-preview prose prose-sm max-w-none ' +
    '[&_table]:border-collapse [&_table]:w-full [&_td]:border-0 [&_td]:p-1.5 [&_th]:border-0 [&_th]:p-1.5 [&_th]:text-left ' +
    '[&_p]:whitespace-pre-wrap [&_p:empty]:min-h-[1.15em] [&_p>br:only-child]:block';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Unsichtbare Messung in echter Seitenbreite */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0"
        style={{ width: innerWidth }}
      >
        <div ref={measureRef} className={contentClass} dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {Array.from({ length: pages }).map((_, i) => (
        <div key={i} className="relative">
          <div
            className="relative overflow-hidden bg-white shadow-md ring-1 ring-black/10"
            style={{ width: A4_W, height: A4_H }}
          >
            {backgroundUrl && (
              <img
                src={backgroundUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              />
            )}
            <div
              className="absolute"
              style={{
                // nur oben/unten abschneiden – hängende Nummern (1., A.) links bleiben sichtbar
                clipPath: `inset(0 -${padding.right}px 0 -${padding.left}px)`,
                top: padding.top,
                left: padding.left,
                width: innerWidth,
                height: usable,
              }}
            >
              <div
                className={contentClass}
                style={{ transform: `translateY(-${i * usable}px)`, color: '#111' }}
                dangerouslySetInnerHTML={{ __html: laidOut }}
              />
            </div>
          </div>
          <div className="mt-1 text-center text-[11px] text-muted-foreground">
            Seite {i + 1} von {pages}
          </div>
        </div>
      ))}
    </div>
  );
}
