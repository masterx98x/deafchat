import { Route, Routes, useLocation } from 'react-router-dom';
import AppFooter from './components/AppFooter';
import AppShell from './components/AppShell';
import BrandHeader from './components/BrandHeader';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';

function AppFrame() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');

  return (
    <AppShell>
      {!isChatRoute ? <BrandHeader /> : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat/:roomId" element={<ChatPage />} />
      </Routes>
      {!isChatRoute ? <AppFooter /> : null}
    </AppShell>
  );
}

export default function App() {
  return <AppFrame />;
}
