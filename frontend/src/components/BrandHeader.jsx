import { Link } from 'react-router-dom';

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
      </div>
    </header>
  );
}
