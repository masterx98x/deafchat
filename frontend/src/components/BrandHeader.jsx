const navItems = [
  { href: 'https://www.deafsuite.it/', label: 'DeafSuite' },
  { href: 'https://deafnews.it/', label: 'DeafNews' },
];

export default function BrandHeader() {
  return (
    <header className="dc-site-header">
      <div className="dc-shell dc-site-header__inner">
        <a className="dc-brand" href="/" aria-label="Vai alla home di DeafChat">
          <span className="dc-brand__badge" aria-hidden="true">
            <img src="/favicon.png" alt="" />
          </span>
          <span className="dc-brand__copy">
            <span className="dc-brand__title">DeafChat</span>
            <span className="dc-brand__subtitle">Privacy-first realtime communication</span>
          </span>
        </a>

        <nav className="dc-top-nav" aria-label="Navigazione esterna">
          {navItems.map((item) => (
            <a
              key={item.href}
              className="dc-pill-link"
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
