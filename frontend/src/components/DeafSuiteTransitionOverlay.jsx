import TransitionMatrixRain from './TransitionMatrixRain';

const DEAFSUITE_FAVICON_URL = 'https://www.deafsuite.it/favicon.png';

export default function DeafSuiteTransitionOverlay() {
  return (
    <div className="dc-suite-transition" aria-hidden="true">
      <span className="dc-suite-transition__bg" />
      <TransitionMatrixRain />
      <span className="dc-suite-transition__grid" />
      <span className="dc-suite-transition__orb dc-suite-transition__orb--a" />
      <span className="dc-suite-transition__orb dc-suite-transition__orb--b" />
      <span className="dc-suite-transition__orb dc-suite-transition__orb--c" />
      <span className="dc-suite-transition__sweep" />
      <span className="dc-suite-transition__beam dc-suite-transition__beam--a" />
      <span className="dc-suite-transition__beam dc-suite-transition__beam--b" />

      <div className="dc-suite-transition__center">
        <div className="dc-suite-transition__brand-row">
          <div className="dc-suite-transition__brand-card is-chat">
            <img src="/favicon.png" alt="" width="46" height="46" decoding="async" />
            <span>DeafChat</span>
          </div>
          <span className="dc-suite-transition__arrow">&#8594;</span>
          <div className="dc-suite-transition__brand-card is-suite">
            <img src={DEAFSUITE_FAVICON_URL} alt="" width="46" height="46" decoding="async" />
            <span>DeafSuite</span>
          </div>
        </div>
        <p className="dc-suite-transition__copy">Ritorno al laboratorio in corso...</p>
      </div>
    </div>
  );
}
