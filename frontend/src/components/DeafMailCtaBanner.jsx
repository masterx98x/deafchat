export default function DeafMailCtaBanner({ href }) {
  return (
    <div className="deafmail-cta-shell is-ready">
      <a
        href={href}
        className="deafmail-cta deafmail-cta-lite"
        rel="noopener"
        aria-label="Apri DeafMail"
      >
        <span className="deafmail-cta-backdrop" aria-hidden="true" />
        <span className="deafmail-cta-grid" aria-hidden="true" />
        <span className="deafmail-cta-orb deafmail-cta-orb-a" aria-hidden="true" />
        <span className="deafmail-cta-orb deafmail-cta-orb-b" aria-hidden="true" />
        <span className="deafmail-cta-line deafmail-cta-line-a" aria-hidden="true" />

        <span className="deafmail-cta-content">
          <span className="deafmail-cta-brand">
            <span className="deafmail-cta-logo-wrap">
              <span className="deafmail-cta-icon" aria-hidden="true">✉</span>
            </span>
            <span className="deafmail-cta-brand-copy">
              <span className="deafmail-cta-kicker">Email temporanea gratuita</span>
              <span className="deafmail-cta-title">Crea un indirizzo email usa e getta con DeafMail — nessuna registrazione</span>
            </span>
          </span>

          <span className="deafmail-cta-side">
            <span className="deafmail-cta-chip">Apri DeafMail</span>
            <span className="deafmail-cta-arrow" aria-hidden="true">&#8599;</span>
          </span>
        </span>
      </a>
    </div>
  );
}
