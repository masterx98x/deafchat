export default function DeafSuiteCtaBanner({ href }) {
  return (
    <div className="deafsuite-link-cta-shell is-ready">
      <a
        href={href}
        className="deafsuite-link-cta deafsuite-link-cta-lite"
        rel="noopener"
        aria-label="Apri DeafSuite"
      >
        <span className="deafsuite-link-cta-backdrop" aria-hidden="true" />
        <span className="deafsuite-link-cta-grid" aria-hidden="true" />
        <span className="deafsuite-link-cta-orb deafsuite-link-cta-orb-a" aria-hidden="true" />
        <span className="deafsuite-link-cta-orb deafsuite-link-cta-orb-b" aria-hidden="true" />
        <span className="deafsuite-link-cta-line deafsuite-link-cta-line-a" aria-hidden="true" />
        <span className="deafsuite-link-cta-codes" aria-hidden="true">
          <span className="deafsuite-link-cta-code deafsuite-link-cta-code-a">01A0SYS&lt;&gt;SUITE_MATRIX_01011011</span>
          <span className="deafsuite-link-cta-code deafsuite-link-cta-code-b">GUIDE::TOOLS::DOSSIER::GREEN_ROOM</span>
          <span className="deafsuite-link-cta-code deafsuite-link-cta-code-c">1010//LAB::ACCESS_GRANTED//KNOWLEDGE</span>
          <span className="deafsuite-link-cta-code deafsuite-link-cta-code-d">MATRIX_FLOW::EDITORIAL::RESEARCH::01</span>
        </span>

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
      </a>
    </div>
  );
}
