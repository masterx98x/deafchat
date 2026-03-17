import { Link } from 'react-router-dom';

export default function BrandHeader({
  deafSuiteHref,
  deafNewsHref,
  onDeafSuiteNavigate,
  onDeafSuiteWarm,
  onDeafNewsWarm,
}) {
  return (
    <header className="dc-site-header">
      <div className="dc-shell dc-site-header__inner">
        <div className="dc-site-header__brand">
          <div className="dc-brand__badge" aria-hidden="true">
            <img src="/favicon.png" alt="" />
          </div>
          <Link className="dc-brand__title" to="/" aria-label="Vai alla home di DeafChat">
            DeafChat
          </Link>
        </div>

        <div className="dc-site-header__actions">
          <nav className="dc-nav-primary" aria-label="Navigazione esterna">
            <a
              className="dc-nav-pill"
              href={deafSuiteHref}
              onClick={onDeafSuiteNavigate}
              onMouseEnter={onDeafSuiteWarm}
              onFocus={onDeafSuiteWarm}
              onTouchStart={onDeafSuiteWarm}
            >
              DeafSuite
            </a>
            <a
              className="dc-nav-pill"
              href={deafNewsHref}
              onMouseEnter={onDeafNewsWarm}
              onFocus={onDeafNewsWarm}
              onTouchStart={onDeafNewsWarm}
            >
              DeafNews
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
