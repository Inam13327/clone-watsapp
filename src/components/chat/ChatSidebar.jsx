import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MessageSquare, Users, LogOut, Search, UserPlus } from "lucide-react";
import { NewChatDialog } from "./NewChatDialog";
import { JoinGroupDialog } from "./JoinGroupDialog";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export const ChatSidebar = ({
  activeChat,
  onSelectChat,
  onSelectAI,
  isAIActive,
}) => {
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const lastMessagesRef = useRef({});

  const { data: conversations = [], refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/chats');
        return data;
      } catch (error) {
        // console.error("Failed to fetch conversations", error);
        return [];
      }
    },
  });

  // Polling for new conversations/updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Check for new messages and notify
  useEffect(() => {
    if (!conversations.length) return;

    conversations.forEach(chat => {
      const lastMsg = chat.lastMessage;
      if (!lastMsg) return;

      const prevLastMsgId = lastMessagesRef.current[chat.id];
      
      // If we have a previous record, and the ID is different, it's a new message
      if (prevLastMsgId && prevLastMsgId !== lastMsg.id) {
        // Notify if it's not our own message
        if (lastMsg.sender_id !== user?.id) {
           toast({
             title: `New message from ${chat.name}`,
             description: lastMsg.content,
             duration: 3000,
           });
        }
      }
      
      // Update ref
      lastMessagesRef.current[chat.id] = lastMsg.id;
    });
  }, [conversations, user, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  const getConversationName = (conversation) => {
    return conversation.name || 'Unknown';
  };

  const filteredConversations = conversations.filter(conversation => 
    getConversationName(conversation).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-white">Messages</h2>
          <div className="flex gap-2">
            {/* Disable Join Group for now */}
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsJoinGroupOpen(true)}
              title="Join Group"
            >
              <UserPlus className="h-5 w-5" />
            </Button> */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewChatOpen(true)}
              title="New Chat"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-white bg-background/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <Button
            variant={isAIActive ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 h-14"
            onClick={onSelectAI}
          >
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="bg-primary/10">AI</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="font-medium">AI Assistant</span>
              <span className="text-xs text-muted-foreground">Always here to help</span>
            </div>
          </Button>

          {filteredConversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant={activeChat === conversation.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 h-14 relative"
              onClick={() => onSelectChat(conversation.id)}
            >
              <Avatar className="h-10 w-10 border">
                <AvatarFallback>
                  {conversation.type === 'group' ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <div className="flex justify-between w-full items-center">
                    <span className="font-medium truncate">
                      {getConversationName(conversation)}
                    </span>
                    {conversation.unreadCount > 0 && activeChat !== conversation.id && (
                        <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {conversation.unreadCount}
                        </span>
                    )}
                </div>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {conversation.type === 'group' ? 'Group Chat' : 'Direct Message'}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <NewChatDialog 
        open={isNewChatOpen} 
        onOpenChange={setIsNewChatOpen}
        onChatCreated={(id) => {
          setIsNewChatOpen(false);
          refetch();
          onSelectChat(id);
        }}
      />

      <JoinGroupDialog
        open={isJoinGroupOpen}
        onOpenChange={setIsJoinGroupOpen}
        onGroupJoined={(id) => {
          setIsJoinGroupOpen(false);
          refetch();
          onSelectChat(id);
        }}
      />
    </div>
  );
};
