import { Link } from 'react-router-dom';

const navItems = [
  { href: 'https://www.deafsuite.it/', label: 'DeafSuite' },
  { href: 'https://deafnews.it/', label: 'DeafNews' },
];

export default function BrandHeader() {
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
            {navItems.map((item) => (
              <a
                key={item.href}
                className="dc-nav-pill"
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
