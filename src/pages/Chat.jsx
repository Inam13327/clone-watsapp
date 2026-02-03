import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation, matchPath } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { CallManager } from '@/components/chat/CallManager';
import { MessageCircle } from 'lucide-react';

export default function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </div>
      </div>
    );
  }

  const isAIActive = location.pathname.includes('/chat/ai');
  const match = matchPath("/chat/:conversationId", location.pathname);
  const conversationId = match?.params?.conversationId;

  return (
    <div className="min-h-screen flex bg-background dark overflow-hidden relative">
      <CallManager />
      <ChatSidebar 
        activeChat={conversationId}
        onSelectChat={(id) => navigate(`/chat/${id}`)}
        onSelectAI={() => navigate('/chat/ai')}
        isAIActive={isAIActive}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
