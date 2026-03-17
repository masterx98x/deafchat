export default function ChatOverlays() {
  return (
    <>
      <div id="nickname-overlay" className="dc-overlay" role="dialog" aria-modal="true" aria-label="Scegli un nickname">
        <div className="dc-panel dc-overlay-card">
          <span className="dc-eyebrow">Join secure room</span>
          <h2 className="dc-overlay-card__title">
            <span className="dc-brand__badge" aria-hidden="true">
              <img src="/favicon.png" alt="" />
            </span>
            Entra nella chat
          </h2>
          <p id="overlay-room-name" className="dc-overlay-card__description" />
          <form id="nickname-form" className="dc-form-stack">
            <label className="dc-field">
              <span className="dc-field__label">Il tuo nickname</span>
              <input
                id="nickname-input"
                className="dc-input"
                type="text"
                maxLength={30}
                placeholder="Es. Marco, Delta, SecureGuest"
                autoComplete="off"
                required
                autoFocus
              />
            </label>
            <button className="dc-btn dc-btn--primary dc-btn--full" type="submit">
              Entra
            </button>
          </form>
        </div>
      </div>

      <div id="call-incoming" className="dc-call-overlay" hidden>
        <div className="dc-panel dc-call-card">
          <div className="dc-call-card__pulse" />
          <span id="call-incoming-icon" className="dc-call-card__icon">
            Call
          </span>
          <h3 id="call-incoming-title">Chiamata in arrivo</h3>
          <p id="call-from-nick" className="dc-call-card__from" />
          <div className="dc-call-card__actions">
            <button className="dc-btn dc-btn--primary" type="button" id="call-accept-btn">
              Accetta
            </button>
            <button className="dc-btn dc-btn--secondary" type="button" id="call-reject-btn">
              Rifiuta
            </button>
          </div>
        </div>
      </div>

      <div id="videocall-overlay" className="dc-videocall-overlay" hidden>
        <div className="dc-videocall-shell">
          <video id="remote-video" className="dc-videocall-shell__remote" autoPlay playsInline />
          <video id="local-video" className="dc-videocall-shell__local" autoPlay playsInline muted />
          <div className="dc-videocall-shell__bar">
            <span id="videocall-status">Connessione...</span>
            <div className="dc-videocall-shell__actions">
              <button className="dc-btn dc-btn--secondary" type="button" id="vcall-toggle-audio">
                Mic
              </button>
              <button className="dc-btn dc-btn--secondary" type="button" id="vcall-toggle-video">
                Cam
              </button>
              <button className="dc-btn dc-btn--danger" type="button" id="vcall-hangup">
                End
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="toast-container" className="dc-toast-container" aria-live="polite" />
    </>
  );
}
