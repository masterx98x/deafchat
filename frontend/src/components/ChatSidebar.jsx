const quickTips = [
  'Usa Share per copiare il link stanza in un click.',
  'Nelle room private puoi passare subito da testo a voice o video.',
  'Foto e audio restano legati al ciclo di vita della stanza.',
];

export default function ChatSidebar() {
  return (
    <aside className="dc-chat-sidebar" aria-label="Informazioni stanza">
      <section className="dc-panel dc-chat-sidebar__card">
        <span className="dc-eyebrow">Privacy layer</span>
        <h2>Stanza effimera, nessun account.</h2>
        <p>
          DeafChat privilegia velocita, discrezione e sessioni temporanee. Il focus e sulla
          conversazione in corso, non sull&apos;archivio.
        </p>
      </section>

      <section className="dc-panel dc-chat-sidebar__card">
        <span className="dc-eyebrow">Quick tips</span>
        <ul className="dc-chat-sidebar__list">
          {quickTips.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="dc-panel dc-chat-sidebar__card dc-chat-sidebar__card--compact">
        <span className="dc-chat-dot" aria-hidden="true" />
        <div>
          <strong>Realtime secure flow</strong>
          <p>Link condivisibile, accesso immediato, nessun passaggio superfluo.</p>
        </div>
      </section>
    </aside>
  );
}
