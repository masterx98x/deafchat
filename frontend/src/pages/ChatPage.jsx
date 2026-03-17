import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatHeaderBar from '../components/ChatHeaderBar';
import ChatOverlays from '../components/ChatOverlays';
import ChatSidebar from '../components/ChatSidebar';
import ChatStage from '../components/ChatStage';

export default function ChatPage() {
  const { roomId } = useParams();

  useEffect(() => {
    document.title = roomId ? `Chat ${roomId} - DeafChat` : 'Chat - DeafChat';

    let isMounted = true;

    import('../legacy/initChatPage.js')
      .then(({ initChatPage }) => {
        if (isMounted) {
          initChatPage();
        }
      })
      .catch((error) => {
        console.error('Impossibile inizializzare la chat:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  return (
    <>
      <ChatOverlays />

      <div id="chat-app" className="dc-chat-app" hidden>
        <div className="dc-shell dc-chat-shell">
          <ChatHeaderBar />

          <div className="dc-chat-layout">
            <ChatSidebar />
            <ChatStage />
          </div>
        </div>
      </div>
    </>
  );
}
