import { useEffect, useState } from 'react';
import MatrixRainBackground from './MatrixRainBackground';

export default function DeafSuiteCtaBanner({
  href,
  onNavigate,
  onWarm,
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 80);
    onWarm?.();
    return () => window.clearTimeout(timer);
  }, [onWarm]);

  const handleNavigate = (event) => {
    if (typeof onNavigate === 'function') {
      onNavigate(event);
      return;
    }

    if (href) {
      window.location.assign(href);
    }
  };

  return (
    <div className={`deafsuite-link-cta-shell${isReady ? ' is-ready' : ''}`}>
      <button
        type="button"
        className="deafsuite-link-cta"
        onClick={handleNavigate}
        onMouseEnter={onWarm}
        onFocus={onWarm}
        onTouchStart={onWarm}
        aria-label="Apri DeafSuite"
      >
        <span className="deafsuite-link-cta-backdrop" aria-hidden="true" />
        <MatrixRainBackground className="deafsuite-link-cta-matrix" columnCount={18} baseSeed={2201} />
        <span className="deafsuite-link-cta-grid" aria-hidden="true" />
        <span className="deafsuite-link-cta-noise" aria-hidden="true" />
        <span className="deafsuite-link-cta-orb deafsuite-link-cta-orb-a" aria-hidden="true" />
        <span className="deafsuite-link-cta-orb deafsuite-link-cta-orb-b" aria-hidden="true" />

        <span className="deafsuite-link-cta-content">
          <span className="deafsuite-link-cta-brand">
            <span className="deafsuite-link-cta-logo-wrap">
              <img src="/deafsuite-favicon.png" alt="" className="deafsuite-link-cta-logo" width="44" height="44" decoding="async" />
            </span>
            <span className="deafsuite-link-cta-brand-copy">
              <span className="deafsuite-link-cta-kicker">Laboratorio collegato</span>
              <span className="deafsuite-link-cta-title">Rientra in DeafSuite per guide, strumenti e approfondimenti editoriali</span>
            </span>
          </span>

          <span className="deafsuite-link-cta-side">
            <span className="deafsuite-link-cta-chip">Apri DeafSuite</span>
            <span className="deafsuite-link-cta-arrow" aria-hidden="true">&#8599;</span>
          </span>
        </span>
      </button>
    </div>
  );
}
