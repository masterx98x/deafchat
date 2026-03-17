const expiryOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 ora', value: 60 },
  { label: '2 ore', value: 120 },
];

const roomTypes = [
  {
    label: 'Privata',
    value: 'private',
    description: '1-to-1 con chiamate vocali e video',
  },
  {
    label: 'Gruppo',
    value: 'group',
    description: 'Chat multipla effimera con foto e audio',
  },
];

export default function RoomCreatorCard({
  form,
  isSubmitting,
  error,
  result,
  onFieldChange,
  onSubmit,
  onCopy,
  onReset,
}) {
  return (
    <aside className="dc-panel dc-control-card">
      <div className="dc-control-card__header">
        <span className="dc-eyebrow">Create secure room</span>
        <h2>Crea una stanza DeafChat</h2>
        <p>
          Scegli durata, modalita e nome. Il link nasce subito e puo essere condiviso
          senza account o onboarding.
        </p>
      </div>

      <form className="dc-form-stack" onSubmit={onSubmit}>
        <label className="dc-field">
          <span className="dc-field__label">
            Nome stanza <span className="dc-field__optional">(opzionale)</span>
          </span>
          <input
            className="dc-input"
            type="text"
            name="roomName"
            value={form.roomName}
            onChange={onFieldChange}
            maxLength={60}
            placeholder="Es. Briefing, room privata, review rapida"
            autoComplete="off"
          />
        </label>

        <div className="dc-field">
          <span className="dc-field__label">Autodistruzione</span>
          <div className="dc-segmented-grid">
            {expiryOptions.map((option) => (
              <label
                key={option.value}
                className={`dc-segment ${
                  form.expiryMinutes === option.value ? 'dc-segment--active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="expiryMinutes"
                  value={option.value}
                  checked={form.expiryMinutes === option.value}
                  onChange={onFieldChange}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="dc-field">
          <span className="dc-field__label">Tipo stanza</span>
          <div className="dc-choice-list">
            {roomTypes.map((option) => (
              <label
                key={option.value}
                className={`dc-choice-card ${
                  form.roomType === option.value ? 'dc-choice-card--active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="roomType"
                  value={option.value}
                  checked={form.roomType === option.value}
                  onChange={onFieldChange}
                />
                <span className="dc-choice-card__content">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {error ? <p className="dc-inline-alert dc-inline-alert--error">{error}</p> : null}

        <button className="dc-btn dc-btn--primary dc-btn--full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creazione in corso...' : 'Crea stanza'}
        </button>
      </form>

      {result ? (
        <div className="dc-result-card">
          <div className="dc-result-card__header">
            <span className="dc-eyebrow">Room ready</span>
            <h3>La stanza e pronta</h3>
            <p>Il timer e gia attivo. Copia il link o entra subito nella sessione.</p>
          </div>

          <div className="dc-link-field">
            <input className="dc-input" type="text" value={result.link} readOnly aria-label="Link stanza" />
            <button className="dc-btn dc-btn--secondary" type="button" onClick={onCopy}>
              Copia
            </button>
          </div>

          <div className="dc-result-card__actions">
            <a className="dc-btn dc-btn--primary" href={`/chat/${result.room_id}`}>
              Entra nella stanza
            </a>
            <button className="dc-btn dc-btn--secondary" type="button" onClick={onReset}>
              Nuova stanza
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
