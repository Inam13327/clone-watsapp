import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const ChatWelcome = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-full"
    >
      <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-glow">
        <MessageCircle className="w-12 h-12 text-primary" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2 text-white">Welcome to ChatFlow</h2>
      <p className="text-muted-foreground max-w-md">
        Select a conversation from the sidebar or start a new chat. 
        You can also try ChatFlow AI for instant AI-powered assistance!
      </p>
    </motion.div>
  );
};
