import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const HEADER_SLOT_ID = 'dashboard-header-filters';
const HEADER_ROOT_MARGIN = '-80px 0px 0px 0px';

export default function StickyFiltersHost({ render, overlays = null }) {
  const sentinelRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    setSlot(document.getElementById(HEADER_SLOT_ID));
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: HEADER_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <div className={stuck ? 'invisible pointer-events-none' : undefined}>
        {render('page')}
      </div>
      {stuck && slot && createPortal(
        <div className="border-t border-slate-200/60">
          <div className="max-w-7xl mx-auto px-6 py-2">
            {render('header')}
          </div>
        </div>,
        slot,
      )}
      {overlays}
    </>
  );
}
