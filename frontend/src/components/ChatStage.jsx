export default function ChatStage() {
  return (
    <section className="dc-chat-stage" aria-label="Stream dei messaggi">
      <div className="dc-panel dc-chat-stage__frame">
        <div id="messages" className="dc-messages" role="log" aria-live="polite" aria-label="Messaggi" />
      </div>

      <div id="recording-bar" className="dc-panel dc-recording-bar" hidden>
        <span className="dc-recording-bar__pulse" aria-hidden="true" />
        <span className="dc-recording-bar__label">Registrazione</span>
        <span className="dc-recording-bar__timer" id="rec-timer">
          0:00
        </span>
        <button className="dc-btn dc-btn--secondary" type="button" id="rec-cancel">
          Annulla
        </button>
        <button className="dc-btn dc-btn--primary" type="button" id="rec-stop">
          Invia
        </button>
      </div>

      <form id="message-form" className="dc-panel dc-message-composer">
        <label className="dc-sr-only" htmlFor="message-input">
          Scrivi un messaggio
        </label>
        <input
          id="message-input"
          className="dc-input dc-message-composer__input"
          type="text"
          placeholder="Scrivi un messaggio..."
          maxLength={2000}
          autoComplete="off"
          required
        />
        <input id="photo-input" type="file" accept="image/*" hidden />
        <button className="dc-btn dc-btn--secondary" type="button" id="photo-btn">
          Foto
        </button>
        <button className="dc-btn dc-btn--secondary" type="button" id="mic-btn">
          Audio
        </button>
        <button className="dc-btn dc-btn--primary" type="submit">
          Invia
        </button>
      </form>

      <aside id="members-sidebar" className="dc-panel dc-members-sidebar" hidden>
        <div className="dc-members-sidebar__header">
          <h2>Partecipanti</h2>
          <button id="members-close" type="button" aria-label="Chiudi">
            x
          </button>
        </div>
        <ul id="members-list" className="dc-members-list" />
      </aside>
    </section>
  );
}
