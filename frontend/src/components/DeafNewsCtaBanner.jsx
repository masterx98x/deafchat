import { useEffect, useState } from 'react';

function shouldInterceptNavigation(event) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export default function DeafNewsCtaBanner({ href, onWarm }) {
  const [isReady, setIsReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 80);
    onWarm?.();
    return () => window.clearTimeout(timer);
  }, [onWarm]);

  const handleNavigate = (event) => {
    if (!href || isLeaving || !shouldInterceptNavigation(event)) {
      return;
    }

    event.preventDefault();
    onWarm?.();
    setIsLeaving(true);
    window.setTimeout(() => {
      window.location.assign(href);
    }, 240);
  };

  return (
    <div className={`deafnews-cta-shell${isReady ? ' is-ready' : ''}${isLeaving ? ' is-leaving' : ''}`}>
      <a
        href={href}
        className="deafnews-cta"
        onClick={handleNavigate}
        onMouseEnter={onWarm}
        onFocus={onWarm}
        onTouchStart={onWarm}
        aria-label="Apri DeafNews"
      >
        <span className="deafnews-cta-backdrop" aria-hidden="true" />
        <span className="deafnews-cta-grid" aria-hidden="true" />
        <span className="deafnews-cta-energy deafnews-cta-energy-a" aria-hidden="true" />
        <span className="deafnews-cta-energy deafnews-cta-energy-b" aria-hidden="true" />
        <span className="deafnews-cta-energy deafnews-cta-energy-c" aria-hidden="true" />

        <span className="deafnews-cta-content">
          <span className="deafnews-cta-brand">
            <span className="deafnews-cta-logo-wrap">
              <img src="/deafnews-favicon.png" alt="" className="deafnews-cta-logo" width="44" height="44" decoding="async" />
            </span>
            <span className="deafnews-cta-brand-copy">
              <span className="deafnews-cta-kicker">Progetto collegato</span>
              <span className="deafnews-cta-title">Segui il flusso news su DeafNews</span>
            </span>
          </span>

          <span className="deafnews-cta-side">
            <span className="deafnews-cta-chip">Apri DeafNews</span>
            <span className="deafnews-cta-arrow" aria-hidden="true">&#8599;</span>
          </span>
        </span>
      </a>
    </div>
  );
}
