import { useEffect, useRef } from 'react';
import { nseSymbolToTrendlyneTicker } from '../../../lib/nseSymbol';

const TL_WIDGETS_SRC = 'https://cdn-static.trendlyne.com/static/js/webwidgets/tl-widgets.js';
const SWOT_WIDGET_COLORS = 'posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E';

function swotWidgetUrl(ticker: string): string {
  return `https://trendlyne.com/web-widget/swot-widget/Poppins/${encodeURIComponent(ticker)}/?${SWOT_WIDGET_COLORS}`;
}

function widgetTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function loadTrendlyneScript(): void {
  if (document.querySelector(`script[src="${TL_WIDGETS_SRC}"]`)) return;
  const script = document.createElement('script');
  script.src = TL_WIDGETS_SRC;
  script.async = true;
  script.charset = 'utf-8';
  document.body.appendChild(script);
}

export function SwotSection({ symbol }: { symbol: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ticker = nseSymbolToTrendlyneTicker(symbol);

  useEffect(() => {
    loadTrendlyneScript();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ticker) return;

    host.replaceChildren();
    const el = document.createElement('blockquote');
    el.className = 'trendlyne-widgets';
    el.setAttribute('data-get-url', swotWidgetUrl(ticker));
    el.setAttribute('data-theme', widgetTheme());
    host.appendChild(el);
  }, [ticker]);

  if (!ticker) return null;

  return (
    <div
      ref={hostRef}
      className="trendlyne-swot-host w-full min-h-[280px] [&_.trendlyne-widgets]:!m-0"
      aria-label="SWOT analysis"
    />
  );
}
