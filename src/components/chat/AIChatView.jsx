import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useToast } from "@/hooks/use-toast";

export const AIChatView = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your AI Assistant. I can help you with questions, ideas, or just chat. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // NOTE: In a real production app, never expose keys on client side.
  // Use a backend proxy. For this local demo, we use a placeholder or ask user.
  // The user asked for "free extension", so we'll try to use a default or ask for one.
  // For now, we will simulate a smart response if no key is provided.
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      let responseText = "";

      if (apiKey) {
        // Use Real Gemini API
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        const result = await model.generateContent(userMsg.content);
        const response = await result.response;
        responseText = response.text();
      } else {
        // Simulated AI Logic (Mock)
        await new Promise(r => setTimeout(r, 1500)); // Fake delay
        
        const lowerInput = userMsg.content.toLowerCase();
        if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
             responseText = "Hello! I'm your AI Assistant. I can help with general questions, coding, or just chat. (Note: For real-time smart answers, please add a Gemini API Key in settings!)";
        } else if (lowerInput.includes('help')) {
             responseText = "I can help with coding, writing, or general questions. To enable full AI power, click the 'Key' icon and add your free Google Gemini API Key.";
        } else if (lowerInput.includes('weather')) {
             responseText = "I can't check real-time weather yet. Try asking me to write some code or explain a concept!";
        } else if (lowerInput.includes('code')) {
             responseText = "I love coding! I can generate snippets for React, Node.js, Python, and more. Just ask me: 'Write a React component for a button'.";
        } else {
             responseText = `I heard you say: "${userMsg.content}". \n\nTo get intelligent, real-time responses to any question, I need a Gemini API Key. \n1. Get a free key at aistudio.google.com\n2. Click the Key icon in the top right\n3. Paste your key.`;
        }
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("AI Error:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to get response. Check your API key or connection."
      });
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveKey = () => {
    const key = prompt("Enter your free Google Gemini API Key (get one at aistudio.google.com):", apiKey);
    if (key !== null) {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        toast({ title: "API Key Saved", description: "You are now connected to Gemini AI!" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-none">AI Assistant</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               Online • {apiKey ? 'Gemini Pro' : 'Demo Mode'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={saveKey} title="Configure API Key">
            Settings
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 max-w-3xl mx-auto pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === 'user' ? "justify-end" : "justify-start"}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                   <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`rounded-2xl p-4 max-w-[80%] shadow-sm ${
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 border border-white/10 text-foreground rounded-tl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {msg.role === 'user' && (
                 <Avatar className="h-8 w-8 mt-1 border border-white/10">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 justify-start">
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                   <Bot className="w-5 h-5 text-white" />
               </div>
               <div className="bg-muted/50 border border-white/10 rounded-2xl p-4 rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
               </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto flex gap-2">
            <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything..."
                className="bg-muted/50 border-white/10 focus-visible:ring-purple-500 text-white"
            />
            <Button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25"
            >
                <Send className="w-4 h-4" />
            </Button>
        </div>
        {!apiKey && (
            <p className="text-xs text-center text-muted-foreground mt-2">
                Running in demo mode. Click 'Settings' to add a free Gemini API key for real answers.
            </p>
        )}
      </div>
    </div>
  );
};
