export default function AppFooter({ deafSuiteHref, onDeafSuiteNavigate, onDeafSuiteWarm }) {
  return (
    <footer className="dc-site-footer">
      <div className="dc-shell dc-site-footer__inner">
        <p className="dc-site-footer__copy">
          <strong>DeafChat</strong> e il modulo di chat effimera del laboratorio DeafSuite:
          comunicazioni temporanee, private e orientate alla privacy.
        </p>
        <div className="dc-site-footer__nav">
          <a
            href={deafSuiteHref}
            onClick={onDeafSuiteNavigate}
            onMouseEnter={onDeafSuiteWarm}
            onFocus={onDeafSuiteWarm}
            onTouchStart={onDeafSuiteWarm}
          >
            DeafSuite
          </a>
          <a href="https://deafnews.it/" target="_blank" rel="noreferrer noopener">
            DeafNews
          </a>
        </div>
      </div>
    </footer>
  );
}
