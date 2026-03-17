import SectionHeader from './SectionHeader';

export default function EcosystemCtaSection({
  deafSuiteHref,
  onDeafSuiteNavigate,
  onDeafSuiteWarm,
  deafNewsHref,
  onDeafNewsWarm,
}) {
  return (
    <section className="dc-section">
      <SectionHeader
        eyebrow="Connected projects"
        title="Muoviti tra chat, laboratorio e news senza perdere il contesto."
        description="DeafChat resta il punto piu rapido per comunicare. Quando ti serve approfondire o seguire il flusso editoriale, entri negli altri moduli dell'ecosistema con un click."
      />

      <div className="dc-ecosystem-grid">
        <article className="dc-panel dc-ecosystem-card dc-ecosystem-card--suite">
          <span className="dc-ecosystem-card__badge">DS</span>
          <span className="dc-ecosystem-card__kicker">Laboratorio operativo</span>
          <h3>Apri DeafSuite per guide, strumenti e approfondimenti collegati a DeafChat.</h3>
          <p>
            Privacy digitale, workflow, tutorial e contesto tecnico nello stesso ecosistema della
            chat effimera.
          </p>
          <div className="dc-ecosystem-card__actions">
            <a
              className="dc-btn dc-btn--secondary dc-btn--suite"
              href={deafSuiteHref}
              onClick={onDeafSuiteNavigate}
              onMouseEnter={onDeafSuiteWarm}
              onFocus={onDeafSuiteWarm}
              onTouchStart={onDeafSuiteWarm}
            >
              Vai a DeafSuite
            </a>
          </div>
        </article>

        <article className="dc-panel dc-ecosystem-card dc-ecosystem-card--news">
          <span className="dc-ecosystem-card__badge">DN</span>
          <span className="dc-ecosystem-card__kicker">Flusso editoriale</span>
          <h3>Apri DeafNews per restare aggiornato su AI, cybersecurity e trend tech.</h3>
          <p>
            Notizie, analisi e aggiornamenti rapidi per passare dalla conversazione al contesto
            informativo senza uscire dall'universo DeafSuite.
          </p>
          <div className="dc-ecosystem-card__actions">
            <a
              className="dc-btn dc-btn--secondary dc-btn--news"
              href={deafNewsHref}
              onMouseEnter={onDeafNewsWarm}
              onFocus={onDeafNewsWarm}
              onTouchStart={onDeafNewsWarm}
            >
              Vai a DeafNews
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
