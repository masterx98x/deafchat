export default function AppFooter({
  deafSuiteHref,
  deafNewsHref,
  deafScanHref,
}) {
  return (
    <footer className="dc-site-footer">
      <div className="dc-shell dc-site-footer__inner">
        <p className="dc-site-footer__copy">
          <strong>DeafChat</strong> e il modulo di chat effimera del laboratorio DeafSuite:
          comunicazioni temporanee, private e orientate alla privacy.
        </p>
        <div className="dc-site-footer__nav">
          <a href={deafSuiteHref}>
            DeafSuite
          </a>
          <a href={deafNewsHref}>
            DeafNews
          </a>
          <a href="https://deafmail.deafsuite.it/?from=deafchat">
            DeafMail
          </a>
          <a href={deafScanHref}>
            DeafScan
          </a>
        </div>
      </div>
    </footer>
  );
}
