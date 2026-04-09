import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppFooter from './components/AppFooter';
import DeafChatArrivalOverlay from './components/DeafChatArrivalOverlay';
import AppShell from './components/AppShell';
import BrandHeader from './components/BrandHeader';
import ProjectCtaStack from './components/ProjectCtaStack';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';

const DEAFSUITE_ENTRY_URL = 'https://www.deafsuite.it/?from=deafchat';
const DEAFNEWS_ENTRY_URL = 'https://deafnews.it/?from=deafchat';
const DEAFMAIL_ENTRY_URL = 'https://deafmail.deafsuite.it/?from=deafchat';

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
  const [arrivalSource, setArrivalSource] = useState(null);

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

  const arrivalSourceLabel = arrivalSource === 'deafnews' ? 'DeafNews' : 'DeafSuite';

  return (
    <AppShell
      transitionOverlay={arrivalSource ? <DeafChatArrivalOverlay sourceLabel={arrivalSourceLabel} /> : null}
      isArriving={Boolean(arrivalSource)}
    >
      {!isChatRoute ? <BrandHeader /> : null}
      {!isChatRoute ? (
        <ProjectCtaStack
          deafSuiteHref={DEAFSUITE_ENTRY_URL}
          deafNewsHref={DEAFNEWS_ENTRY_URL}
          deafMailHref={DEAFMAIL_ENTRY_URL}
        />
      ) : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat/:roomId" element={<ChatPage />} />
      </Routes>
      {!isChatRoute ? (
        <AppFooter
          deafSuiteHref={DEAFSUITE_ENTRY_URL}
          deafNewsHref={DEAFNEWS_ENTRY_URL}
        />
      ) : null}
    </AppShell>
  );
}

export default function App() {
  return <AppFrame />;
}
