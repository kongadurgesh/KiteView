import { useEffect, useRef, useState, type RefObject } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/cn';
import { LookupRedirect } from '../features/lookup/LookupRedirect';
import { normalizeRoutePath, PERSISTENT_PAGES, PERSISTENT_PATHS } from './persistentPages';

interface PersistentOutletProps {
  scrollContainerRef: RefObject<HTMLElement | null>;
}

export function PersistentOutlet({ scrollContainerRef }: PersistentOutletProps) {
  const location = useLocation();
  const routePath = normalizeRoutePath(location.pathname);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([routePath]));
  const scrollPositions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (routePath === '/lookup' || !PERSISTENT_PATHS.has(routePath)) return;
    setVisited((prev) => {
      if (prev.has(routePath)) return prev;
      const next = new Set(prev);
      next.add(routePath);
      return next;
    });
  }, [routePath]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || routePath === '/lookup' || !PERSISTENT_PATHS.has(routePath)) return;

    return () => {
      scrollPositions.current.set(routePath, el.scrollTop);
    };
  }, [routePath, scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || routePath === '/lookup' || !PERSISTENT_PATHS.has(routePath)) return;

    const saved = scrollPositions.current.get(routePath);
    requestAnimationFrame(() => {
      el.scrollTop = saved ?? 0;
    });
  }, [routePath, scrollContainerRef]);

  if (routePath === '/lookup') {
    return <LookupRedirect />;
  }

  if (!PERSISTENT_PATHS.has(routePath)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {PERSISTENT_PAGES.map(({ path, Component }) => {
        if (!visited.has(path)) return null;
        const isActive = path === routePath;
        return (
          <div
            key={path}
            className={cn('w-full flex flex-col items-center', !isActive && 'hidden')}
            aria-hidden={!isActive}
            hidden={!isActive}
          >
            <Component />
          </div>
        );
      })}
    </>
  );
}
