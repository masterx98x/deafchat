import { startTransition, useEffect, useState } from 'react';
import FaqSection from '../components/FaqSection';
import FeatureGrid from '../components/FeatureGrid';
import RoomCreatorCard from '../components/RoomCreatorCard';
import SectionHeader from '../components/SectionHeader';

const metrics = [
  { value: '5-120 min', label: 'Timer di autodistruzione stanza' },
  { value: '2 modalita', label: 'Privata 1-to-1 o gruppo' },
  { value: '0 database', label: 'Nessun salvataggio persistente' },
];

const featureItems = [
  {
    index: '01',
    title: 'Effimera davvero',
    description: 'La stanza scade tra 5 minuti e 2 ore. Quando finisce il tempo, sparisce il contenuto.',
  },
  {
    index: '02',
    title: 'Voice e video private',
    description: 'Nelle room 1-to-1 puoi passare subito da testo a voce o video con un click.',
  },
  {
    index: '03',
    title: 'Foto e audio nativi',
    description: 'Invii rapidi, feedback realtime e interfaccia compatta per desktop e mobile.',
  },
  {
    index: '04',
    title: 'Un link e basta',
    description: 'Nessuna registrazione, nessuna installazione: apri il link, scegli il nickname, entra.',
  },
];

const processItems = [
  {
    index: 'Step 1',
    title: 'Crea',
    description: 'Definisci tipo stanza e durata. DeafChat genera subito room ID e link condivisibile.',
  },
  {
    index: 'Step 2',
    title: 'Condividi',
    description: 'Passa il link alla persona giusta o al gruppo, senza onboarding e senza attrito.',
  },
  {
    index: 'Step 3',
    title: 'Sparisce',
    description: 'Alla scadenza, la sessione si chiude e il contenuto viene rimosso.',
  },
];

const faqItems = [
  {
    question: 'DeafChat e gratuito?',
    answer: 'Si. Non richiede registrazione e include chat, audio, foto e chiamate private.',
  },
  {
    question: 'I messaggi vengono salvati?',
    answer: 'No. DeafChat e pensato come spazio temporaneo in memoria, non come archivio persistente.',
  },
  {
    question: 'Serve installare qualcosa?',
    answer: 'No. Funziona direttamente nel browser su smartphone, tablet e desktop.',
  },
  {
    question: 'Le chiamate passano dal server?',
    answer: 'Il signaling passa dal backend, mentre audio e video usano WebRTC e TURN quando serve.',
  },
];

const initialForm = {
  roomName: '',
  roomType: 'private',
  expiryMinutes: 30,
};

export default function HomePage() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    document.title = 'DeafChat - Comunicazioni temporanee, private e senza registrazione';
  }, []);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'expiryMinutes' ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: form.roomName.trim(),
          room_type: form.roomType,
          expiry_minutes: form.expiryMinutes,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();

      startTransition(() => {
        setResult(payload);
      });
    } catch (submitError) {
      console.error(submitError);
      setError('Errore nella creazione della stanza. Riprova tra qualche secondo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!result?.link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.link);
    } catch (copyError) {
      console.error(copyError);
      setError('Impossibile copiare il link dagli appunti.');
    }
  }

  function handleReset() {
    setForm(initialForm);
    setResult(null);
    setError('');
  }

  return (
    <main className="dc-main">
      <div className="dc-shell dc-home-shell">
        <section className="dc-home-hero">
          <div className="dc-home-hero__copy">
            <div className="dc-kicker-row">
              <span className="dc-eyebrow">DeafSuite ecosystem</span>
              <span className="dc-kicker-muted">Realtime secure chat</span>
            </div>

            <h1>Comunicazioni temporanee, private e senza registrazione.</h1>
            <p className="dc-home-hero__description">
              DeafChat porta nel laboratorio DeafSuite una web app premium per conversazioni
              effimere: testo, foto, audio e chiamate private in un'interfaccia moderna,
              leggibile e pensata per non affaticare gli occhi.
            </p>

            <div className="dc-pill-row">
              <span className="dc-soft-pill">Zero registrazione</span>
              <span className="dc-soft-pill">Messaggi in RAM</span>
              <span className="dc-soft-pill">Link istantaneo</span>
              <span className="dc-soft-pill">Voice e video</span>
            </div>

            <div className="dc-metric-grid">
              {metrics.map((item) => (
                <article key={item.value} className="dc-panel dc-metric-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>

            <div className="dc-panel dc-home-insight">
              <span className="dc-eyebrow">Security posture</span>
              <div className="dc-home-insight__grid">
                <div>
                  <strong>Privacy-first</strong>
                  <p>Interfaccia pulita, niente rumore visivo, azioni critiche ben separate.</p>
                </div>
                <div>
                  <strong>Browser-native</strong>
                  <p>Funziona nel browser e mantiene un feeling premium da tool professionale.</p>
                </div>
              </div>
            </div>
          </div>

          <RoomCreatorCard
            form={form}
            isSubmitting={isSubmitting}
            error={error}
            result={result}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
            onCopy={handleCopyLink}
            onReset={handleReset}
          />
        </section>

        <section className="dc-section">
          <SectionHeader
            eyebrow="Capability layer"
            title="Progettata per conversazioni veloci, sensibili e senza archiviazione."
            description="La UI separa meglio i momenti chiave: creazione stanza, contesto, azione e stato."
          />
          <FeatureGrid items={featureItems} />
        </section>

        <section className="dc-section">
          <SectionHeader
            eyebrow="How it works"
            title="Tre passaggi chiari, zero attrito."
            description="Ogni sezione accompagna l'utente senza rumore: crei, condividi, poi la sessione si spegne."
          />
          <FeatureGrid items={processItems} variant="process" />
        </section>

        <section className="dc-section">
          <SectionHeader
            eyebrow="FAQ"
            title="Le domande essenziali, senza perdere il focus."
            description="Informazioni importanti, impaginate con piu respiro e leggibilita."
          />
          <FaqSection items={faqItems} />
        </section>
      </div>
    </main>
  );
}
