export default function ChatHeaderBar() {
  return (
    <header className="dc-chat-header">
      <div className="dc-chat-header__left">
        <a className="dc-chat-back" href="/" aria-label="Torna alla home" title="Torna alla home">
          <span aria-hidden="true">/</span>
          <span>Home</span>
        </a>

        <div className="dc-chat-title-block">
          <span className="dc-eyebrow">Ephemeral session</span>
          <h1 id="chat-room-name">Chat</h1>
          <div className="dc-chat-meta">
            <span id="members-count">0 partecipanti</span>
            <span id="countdown" className="dc-chat-chip" title="Autodistruzione" />
          </div>
        </div>
      </div>

      <div className="dc-chat-header__actions">
        <button className="dc-btn dc-btn--secondary" type="button" id="videocall-btn" hidden>
          Video
        </button>
        <button className="dc-btn dc-btn--secondary" type="button" id="voicecall-btn" hidden>
          Voice
        </button>
        <button className="dc-btn dc-btn--secondary" type="button" id="notif-toggle">
          Notify
          <span className="dc-notif-dot" aria-hidden="true" />
        </button>
        <button className="dc-btn dc-btn--secondary" type="button" id="share-btn">
          Share
        </button>
        <button className="dc-btn dc-btn--secondary" type="button" id="members-toggle">
          Members
        </button>
      </div>
    </header>
  );
}
