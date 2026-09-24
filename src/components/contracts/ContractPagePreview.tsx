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
      // Manuelle Seitenumbrüche: Abstand bis zum nächsten Seitenanfang auffüllen
      const breaks = Array.from(el.querySelectorAll<HTMLElement>('[data-page-break]'));
      breaks.forEach(b => { b.style.height = '0px'; b.style.margin = '0'; b.style.border = '0'; });
      const base = el.getBoundingClientRect().top;
      for (const b of breaks) {
        const y = b.getBoundingClientRect().top - base;
        const rest = usable - (y % usable);
        b.style.height = `${rest >= usable ? 0 : rest}px`;
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
              className="absolute overflow-hidden"
              style={{
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
