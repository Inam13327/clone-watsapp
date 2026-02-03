import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, MoreVertical, Phone, Video, Loader2, Smile, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import EmojiPicker from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const ChatView = () => {
  const { conversationId: chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversationDetails, setConversationDetails] = useState(null);
  const [profiles, setProfiles] = useState({});
  const scrollRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setCurrentUser(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      // Fetch conversation details
      const { data: conversation } = await api.get(`/chats/${chatId}`);
      setConversationDetails(conversation);

      // Fetch messages
      const { data: msgs } = await api.get(`/chats/${chatId}/messages`);
      
      // Fetch profiles for message senders
      const userIds = [...new Set(msgs.map(m => m.sender_id))];
      // Include current user in profile fetch just in case
      if (currentUser?.id && !userIds.includes(currentUser.id)) {
        userIds.push(currentUser.id);
      }

      const { data: profilesData } = await api.post('/users/batch', { userIds });

      const profilesMap = (profilesData || []).reduce((acc, profile) => ({
        ...acc,
        [profile.id]: profile
      }), {});

      setProfiles(profilesMap);
      setMessages(msgs || []);

      // Mark messages as read if there are unread ones from others
      const hasUnread = msgs.some(m => m.sender_id !== currentUser?.id && m.status !== 'read');
      if (hasUnread) {
         try {
             await api.post(`/chats/${chatId}/read`);
             // We don't need to re-fetch immediately as the next poll will pick it up,
             // or we could optimistically update local state if we wanted instant feedback.
         } catch (err) {
             console.error("Failed to mark read:", err);
         }
      }
    } catch (error) {
      // Only log errors if it's a manual fetch (showLoading=true) or if it's not a common network/polling error
      if (showLoading) {
        console.error('Error fetching messages:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load messages",
        });
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    // If we're already loading a different chat, don't set loading to true again immediately
    // to avoid flickering if we can fetch fast. But here we do want to show loading for a new chat.
    if (!chatId) {
        setIsLoading(false);
        return;
    }

    // Reset states for new chat
    setMessages([]);
    setConversationDetails(null);
    setIsLoading(true);

    fetchMessages(true);

    // Poll for new messages every 3 seconds
    const intervalId = setInterval(() => {
        fetchMessages(false);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [chatId]); // Remove currentUser dependency to avoid loop

  // Separate effect for scrolling to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCall = async (type) => {
    if (!currentUser) return;
    
    // Dispatch custom event to start call
    const event = new CustomEvent('start-call', { 
        detail: { 
            targetUserId: conversationDetails.otherUser.id, 
            type 
        } 
    });
    window.dispatchEvent(event);

    const callMessage = type === 'video' 
      ? "🎥 Video call started" 
      : "📞 Voice call started";

    try {
      await api.post(`/chats/${chatId}/messages`, {
        content: callMessage,
      });
      fetchMessages(false);
    } catch (error) {
        console.error("Failed to send call message", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      await api.post(`/chats/${chatId}/messages`, {
        content: messageContent,
      });

      // Refresh messages immediately
      await fetchMessages(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
      setNewMessage(messageContent); // Restore message on error
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prevInput) => prevInput + emojiObject.emoji);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversationDetails) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <p className="text-muted-foreground">Chat not found or failed to load.</p>
        <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => fetchMessages(true)}
        >
            Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white hover:bg-white/10" 
            onClick={() => navigate('/chat')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10 border-2 border-white/10">
            <AvatarImage src={conversationDetails?.otherUser?.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {conversationDetails?.name?.substring(0, 2).toUpperCase() || "CH"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-white text-lg leading-none">
              {conversationDetails?.name || "Loading..."}
            </h3>
            {conversationDetails?.type === 'group' ? (
              <p className="text-xs text-muted-foreground mt-1">Group Chat</p>
            ) : (
              conversationDetails?.isOnline ? (
                <p className="text-xs text-green-400 flex items-center gap-1.5 mt-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                  Online
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                   {conversationDetails?.otherUser?.last_seen 
                    ? `Last seen ${new Date(conversationDetails.otherUser.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                    : 'Offline'}
                </p>
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:bg-white/10 hover:text-white rounded-full h-10 w-10 transition-colors"
            onClick={() => handleCall('voice')}
            title="Voice Call"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:bg-white/10 hover:text-white rounded-full h-10 w-10 transition-colors"
            onClick={() => handleCall('video')}
            title="Video Call"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white rounded-full h-10 w-10 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => {
            // Check for system messages (calls)
            if (message.content.includes("call started") || message.content.includes("Video call") || message.content.includes("Voice call")) {
               return (
                 <div key={message.id} className="flex justify-center my-4">
                   <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-white/5">
                      {message.content.includes("Video") ? <Video className="w-3 h-3"/> : <Phone className="w-3 h-3"/>}
                      {message.content}
                      <span className="opacity-50 mx-1">•</span>
                      <span className="opacity-50">{new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                 </div>
               );
            }

            const isOwn = message.sender_id === currentUser?.id;
            const senderProfile = profiles[message.sender_id];

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={senderProfile?.avatar_url} />
                    <AvatarFallback>
                      {senderProfile?.username?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[70%] ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-white"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isOwn && (
                      <span>
                        {message.status === 'read' ? (
                          <CheckCheck className="w-3 h-3 text-blue-300" />
                        ) : (
                          <Check className="w-3 h-3 text-white/70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none bg-transparent">
               <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
            </PopoverContent>
          </Popover>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-white bg-background/50"
          />
          <Button type="submit" disabled={!newMessage.trim()} className="bg-primary hover:bg-primary/90">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
