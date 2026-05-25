import { useEffect, useRef } from 'react';
import { isIndianSymbol, nseSymbolToTrendlyneTicker } from '../../../lib/nseSymbol';

const SWOT_WIDGET_COLORS = 'posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E';

function swotWidgetUrl(ticker: string): string {
  return `https://trendlyne.com/web-widget/swot-widget/Poppins/${encodeURIComponent(ticker)}/?${SWOT_WIDGET_COLORS}`;
}

function widgetTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Mirrors Trendlyne tl-widgets.js SDK path for swot-widget (script only scans DOM once on load). */
async function mountSwotWidget(
  blockquote: HTMLQuoteElement,
  url: string,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  if (blockquote.querySelector('.sdk-container')) return;

  const sdkEl = document.createElement('div');
  sdkEl.className = 'sdk-container';
  blockquote.appendChild(sdkEl);

  try {
    const response = await fetch(url, { signal });
    if (signal.aborted || !response.ok) return;
    const htmlContent = await response.text();
    if (signal.aborted) return;

    sdkEl.innerHTML = htmlContent;

    const scripts = sdkEl.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      newScript.textContent = oldScript.textContent;
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
  }
}

export function SwotSection({ symbol }: { symbol: string }) {
  const indian = isIndianSymbol(symbol);
  const hostRef = useRef<HTMLDivElement>(null);
  const ticker = indian ? nseSymbolToTrendlyneTicker(symbol) : '';

  useEffect(() => {
    const host = hostRef.current;
    if (!indian || !host || !ticker) return;

    const controller = new AbortController();
    const url = swotWidgetUrl(ticker);

    host.replaceChildren();
    const el = document.createElement('blockquote');
    el.className = 'trendlyne-widgets';
    el.setAttribute('data-get-url', url);
    el.setAttribute('data-theme', widgetTheme());
    host.appendChild(el);

    void mountSwotWidget(el, url, controller.signal);

    return () => controller.abort();
  }, [ticker, indian]);

  if (!indian || !ticker) return null;

  return (
    <div
      ref={hostRef}
      className="trendlyne-swot-host w-full min-h-[280px] [&_.trendlyne-widgets]:!m-0"
      aria-label="SWOT analysis"
    />
  );
}
