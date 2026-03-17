import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppFooter from './components/AppFooter';
import DeafChatArrivalOverlay from './components/DeafChatArrivalOverlay';
import AppShell from './components/AppShell';
import BrandHeader from './components/BrandHeader';
import DeafSuiteTransitionOverlay from './components/DeafSuiteTransitionOverlay';
import ProjectCtaStack from './components/ProjectCtaStack';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';

const DEAFSUITE_ORIGIN = 'https://www.deafsuite.it';
const DEAFSUITE_ENTRY_URL = `${DEAFSUITE_ORIGIN}/?from=deafchat`;
const DEAFNEWS_ORIGIN = 'https://deafnews.it';
const DEAFNEWS_ENTRY_URL = `${DEAFNEWS_ORIGIN}/?from=deafchat`;

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

function warmDeafNewsResources() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  appendHeadLink('dns-prefetch', '//deafnews.it');
  appendHeadLink('preconnect', DEAFNEWS_ORIGIN, { crossorigin: 'anonymous' });
  appendHeadLink('prefetch', `${DEAFNEWS_ORIGIN}/favicon.png`, { as: 'image' });

  const warmFetch = () => {
    const img = new window.Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = `${DEAFNEWS_ORIGIN}/favicon.png`;
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warmFetch, { timeout: 1200 });
  } else {
    window.setTimeout(warmFetch, 220);
  }
}

function consumeInboundSource(expectedSource) {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const inboundSource = url.searchParams.get('from');
  const expectedSources = Array.isArray(expectedSource) ? expectedSource : [expectedSource];

  if (!expectedSources.includes(inboundSource)) {
    return null;
  }

  url.searchParams.delete('from');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
  return inboundSource;
}

function AppFrame() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');
  const [isLeavingToDeafSuite, setIsLeavingToDeafSuite] = useState(false);
  const [arrivalSource, setArrivalSource] = useState(null);
  const warmedSuiteRef = useRef(false);
  const warmedNewsRef = useRef(false);

  const ensureDeafSuiteWarm = () => {
    if (warmedSuiteRef.current) return;
    warmedSuiteRef.current = true;
    warmDeafSuiteResources();
  };

  const ensureDeafNewsWarm = () => {
    if (warmedNewsRef.current) return;
    warmedNewsRef.current = true;
    warmDeafNewsResources();
  };

  useEffect(() => {
    ensureDeafSuiteWarm();
    ensureDeafNewsWarm();
  }, []);

  useEffect(() => {
    const inboundSource = consumeInboundSource(['deafsuite', 'deafnews']);
    if (!inboundSource) {
      return undefined;
    }

    setArrivalSource(inboundSource);
    const timer = window.setTimeout(() => {
      setArrivalSource(null);
    }, 760);

    return () => window.clearTimeout(timer);
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

  const arrivalSourceLabel = arrivalSource === 'deafnews' ? 'DeafNews' : 'DeafSuite';

  const shellOverlay = isLeavingToDeafSuite
    ? <DeafSuiteTransitionOverlay />
    : (arrivalSource ? <DeafChatArrivalOverlay sourceLabel={arrivalSourceLabel} /> : null);

  return (
    <AppShell
      transitionOverlay={shellOverlay}
      isArriving={Boolean(arrivalSource)}
    >
      {!isChatRoute ? <BrandHeader /> : null}
      {!isChatRoute ? (
        <ProjectCtaStack
          deafSuiteHref={DEAFSUITE_ENTRY_URL}
          deafNewsHref={DEAFNEWS_ENTRY_URL}
          onDeafSuiteNavigate={handleDeafSuiteNavigate}
          onDeafSuiteWarm={ensureDeafSuiteWarm}
          onDeafNewsWarm={ensureDeafNewsWarm}
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
          deafNewsHref={DEAFNEWS_ENTRY_URL}
          onDeafNewsWarm={ensureDeafNewsWarm}
        />
      ) : null}
    </AppShell>
  );
}

export default function App() {
  return <AppFrame />;
}
