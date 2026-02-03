import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);

    const { error } = await signUp(email, password, username);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success('Account created! Welcome to ChatFlow.');
      navigate('/chat');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex dark">
      {/* Left Panel - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 gradient-dark items-center justify-center p-12"
      >
        <div className="max-w-md text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 mx-auto mb-8 rounded-3xl gradient-primary flex items-center justify-center shadow-glow"
          >
            <MessageCircle className="w-12 h-12 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">
            Chat<span className="text-gradient">Flow</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Join millions of users who trust ChatFlow for their daily conversations.
          </p>
        </div>
      </motion.div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">
              Chat<span className="text-gradient">Flow</span>
            </h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">Create account</h2>
            <p className="text-muted-foreground">Start chatting with friends and AI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="pl-10 h-12 bg-card border-border"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Unique username for others to find you</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-card border-border text-white"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center mt-8 text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
