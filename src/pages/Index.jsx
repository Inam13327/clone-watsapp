import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Bot, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: MessageCircle,
      title: 'Direct Messages',
      description: 'Chat privately with anyone using their unique username',
    },
    {
      icon: Users,
      title: 'Group Chats',
      description: 'Create groups and invite friends with shareable codes',
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Get instant help from ChatFlow AI for any task',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your conversations are protected and encrypted',
    },
  ];

  return (
    <div className="min-h-screen bg-background dark overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-20">
          {/* Navigation */}
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-20"
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">
                Chat<span className="text-gradient">Flow</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button className="gradient-primary text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.nav>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Now with AI-powered chat</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-5xl md:text-7xl font-bold mb-6"
            >
              Connect with anyone,{' '}
              <span className="text-gradient">anywhere</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            >
              Experience seamless messaging with direct chats, group conversations, 
              and an intelligent AI assistant. Simple, fast, and beautiful.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/register">
                <Button size="lg" className="gradient-primary text-primary-foreground h-14 px-8 text-lg font-semibold shadow-glow">
                  Start Chatting Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  I have an account
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl rounded-3xl" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 max-w-2xl mx-auto shadow-2xl">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">ChatFlow AI</h3>
                  <p className="text-xs text-muted-foreground">Always ready to help</p>
                </div>
              </div>
              <div className="py-6 space-y-4">
                <div className="flex justify-end">
                  <div className="chat-bubble-own px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                    <p className="text-sm">Hey! Can you help me plan a trip to Tokyo?</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="chat-bubble-other px-4 py-2 rounded-2xl rounded-bl-md max-w-sm">
                    <p className="text-sm">
                      Of course! 🗼 I'd love to help you plan your Tokyo adventure. 
                      What dates are you thinking, and what kind of experiences interest you most?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Everything you need to stay connected
          </h2>
          <p className="text-muted-foreground text-lg">
            Powerful features designed for modern communication
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl"
        >
          <div className="absolute inset-0 gradient-primary opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative text-center py-16 px-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of users who are already enjoying seamless communication with ChatFlow.
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">
              Chat<span className="text-gradient">Flow</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ChatFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
