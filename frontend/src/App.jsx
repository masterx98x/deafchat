import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppFooter from './components/AppFooter';
import AppShell from './components/AppShell';
import BrandHeader from './components/BrandHeader';
import DeafSuiteTransitionOverlay from './components/DeafSuiteTransitionOverlay';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';

const DEAFSUITE_ORIGIN = 'https://www.deafsuite.it';
const DEAFSUITE_ENTRY_URL = `${DEAFSUITE_ORIGIN}/?from=deafchat`;

function appendHeadLink(rel, href, extra = {}) {
  if (!href || document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  Object.entries(extra).forEach(([key, value]) => {
    if (value != null && value !== '') {
      link.setAttribute(key, value);
    }
  });
  document.head.appendChild(link);
}

function warmDeafSuiteResources() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  appendHeadLink('dns-prefetch', '//www.deafsuite.it');
  appendHeadLink('preconnect', DEAFSUITE_ORIGIN, { crossorigin: 'anonymous' });
  appendHeadLink('prefetch', `${DEAFSUITE_ORIGIN}/favicon.png`, { as: 'image' });

  const warmFetch = () => {
    const img = new window.Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = `${DEAFSUITE_ORIGIN}/favicon.png`;
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warmFetch, { timeout: 1200 });
  } else {
    window.setTimeout(warmFetch, 220);
  }
}

function AppFrame() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');
  const [isLeavingToDeafSuite, setIsLeavingToDeafSuite] = useState(false);
  const warmedRef = useRef(false);

  const ensureDeafSuiteWarm = () => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    warmDeafSuiteResources();
  };

  useEffect(() => {
    ensureDeafSuiteWarm();
  }, []);

  const handleDeafSuiteNavigate = (event) => {
    event?.preventDefault();
    if (isLeavingToDeafSuite) return;
    ensureDeafSuiteWarm();
    setIsLeavingToDeafSuite(true);
    window.setTimeout(() => {
      window.location.assign(DEAFSUITE_ENTRY_URL);
    }, 860);
  };

  return (
    <AppShell transitionOverlay={isLeavingToDeafSuite ? <DeafSuiteTransitionOverlay /> : null}>
      {!isChatRoute ? (
        <BrandHeader
          deafSuiteHref={DEAFSUITE_ENTRY_URL}
          onDeafSuiteNavigate={handleDeafSuiteNavigate}
          onDeafSuiteWarm={ensureDeafSuiteWarm}
        />
      ) : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat/:roomId" element={<ChatPage />} />
      </Routes>
      {!isChatRoute ? (
        <AppFooter
          deafSuiteHref={DEAFSUITE_ENTRY_URL}
          onDeafSuiteNavigate={handleDeafSuiteNavigate}
          onDeafSuiteWarm={ensureDeafSuiteWarm}
        />
      ) : null}
    </AppShell>
  );
}

export default function App() {
  return <AppFrame />;
}
