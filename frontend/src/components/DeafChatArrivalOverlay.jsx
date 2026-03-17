export default function DeafChatArrivalOverlay({ sourceLabel = 'DeafSuite' }) {
  return (
    <div className="dc-entry-overlay" aria-hidden="true">
      <span className="dc-entry-overlay__bg" />
      <span className="dc-entry-overlay__grid" />
      <span className="dc-entry-overlay__noise" />
      <span className="dc-entry-overlay__orb dc-entry-overlay__orb--a" />
      <span className="dc-entry-overlay__orb dc-entry-overlay__orb--b" />
      <span className="dc-entry-overlay__orb dc-entry-overlay__orb--c" />
      <span className="dc-entry-overlay__beam dc-entry-overlay__beam--a" />
      <span className="dc-entry-overlay__beam dc-entry-overlay__beam--b" />
      <span className="dc-entry-overlay__sweep" />

      <div className="dc-entry-overlay__center">
        <div className="dc-entry-overlay__card">
          <img src="/favicon.png" alt="" width="46" height="46" decoding="async" />
          <div className="dc-entry-overlay__copy">
            <span>{sourceLabel} &rarr; DeafChat</span>
            <strong>Accesso alla chat sicura</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
