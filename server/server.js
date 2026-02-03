const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'your-secret-key-chatflow'; // In production, use env var

// Manual CORS Middleware for maximum compatibility on local network
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow any origin on the local network
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Request logging (exclude polling to reduce spam)
  const isPolling = req.method === 'GET' && (req.url.includes('/signal/poll') || req.url.includes('/chats'));
  
  if (!isPolling) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${origin || 'unknown'}`);
  }
  
  next();
});

app.use(bodyParser.json());

// --- Database Helpers ---
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

// Ensure data files exist
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(CHATS_FILE)) fs.writeFileSync(CHATS_FILE, '[]');

const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const users = readData(USERS_FILE);

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      username,
      display_name: username,
      password: hashedPassword,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    // Auto login
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY);
    const { password: _, ...userWithoutPassword } = newUser;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readData(USERS_FILE);
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const users = readData(USERS_FILE);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { display_name, bio, status, avatar_url } = req.body;
    
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === decoded.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = { ...users[userIndex] };
    if (display_name !== undefined) updatedUser.display_name = display_name;
    if (bio !== undefined) updatedUser.bio = bio;
    if (status !== undefined) updatedUser.status = status;
    if (avatar_url !== undefined) updatedUser.avatar_url = avatar_url;

    users[userIndex] = updatedUser;
    writeData(USERS_FILE, users);

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/heartbeat', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === decoded.id);

    if (userIndex !== -1) {
      users[userIndex].last_seen = new Date().toISOString();
      writeData(USERS_FILE, users);
      console.log(`Heartbeat received from ${users[userIndex].username}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Heartbeat error:", error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// --- Signaling Routes (Simple Polling) ---
// In-memory store for signaling messages to avoid disk I/O for ephemeral data
// Structure: { [userId]: [ { type, senderId, data, timestamp } ] }
const signalingQueue = {};

app.post('/api/signal/send', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { targetUserId, type, data } = req.body;
    
    if (!signalingQueue[targetUserId]) {
        signalingQueue[targetUserId] = [];
    }

    signalingQueue[targetUserId].push({
        type, // 'offer', 'answer', 'candidate', 'end-call'
        senderId: decoded.id,
        data,
        timestamp: Date.now()
    });

    // Cleanup old messages (> 30 seconds) to prevent memory leaks
    const now = Date.now();
    signalingQueue[targetUserId] = signalingQueue[targetUserId].filter(m => now - m.timestamp < 30000);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/signal/poll', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.id;

    const messages = signalingQueue[userId] || [];
    // Clear delivered messages
    signalingQueue[userId] = [];

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- User Routes ---

app.get('/api/users/search', (req, res) => {
  const { q } = req.query;
  const users = readData(USERS_FILE);

  if (!q) {
    // Return all users (limit to 20 for performance if needed)
    const results = users.slice(0, 50).map(({ password, ...u }) => u);
    return res.json(results);
  }

  const lowerQ = q.toLowerCase();
  
  const results = users
    .filter(u => 
      u.username.toLowerCase().includes(lowerQ) || 
      u.email.toLowerCase().includes(lowerQ) ||
      (u.display_name && u.display_name.toLowerCase().includes(lowerQ))
    )
    .map(({ password, ...u }) => u); // Exclude password

  res.json(results);
});

app.post('/api/users/batch', (req, res) => {
  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds)) return res.json([]);

  const users = readData(USERS_FILE);
  const results = users
    .filter(u => userIds.includes(u.id))
    .map(({ password, ...u }) => u);

  res.json(results);
});

// --- Chat Routes ---

// Get all conversations for the current user
app.get('/api/chats', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const currentUserId = decoded.id;
    const chats = readData(CHATS_FILE);
    const users = readData(USERS_FILE);

    // Find chats where user is a participant
    const userChats = chats.filter(chat => chat.participants.includes(currentUserId));

    // Transform to match frontend expectations
    const formattedChats = userChats.map(chat => {
      let name = chat.name;
      let otherUser = null;
      let isOnline = false;

      if (chat.type === 'direct') {
        const otherUserId = chat.participants.find(id => id !== currentUserId);
        const user = users.find(u => u.id === otherUserId);
        
        if (user) {
          name = user.display_name || user.username;
          const { password, ...u } = user;
          otherUser = u;

          if (user.last_seen) {
             const diff = new Date() - new Date(user.last_seen);
             if (diff < 60000) isOnline = true; // 60s timeout (since we heartbeat every 30s)
          }
        } else {
          name = 'Unknown User';
        }
      }

      const unreadCount = chat.messages.filter(m => 
        m.sender_id !== currentUserId && m.status !== 'read'
      ).length;

      return {
        id: chat.id,
        type: chat.type,
        name: name,
        otherUser,
        isOnline,
        created_at: chat.created_at,
        updated_at: chat.updated_at || chat.created_at,
        lastMessage: chat.messages[chat.messages.length - 1] || null,
        unreadCount
      };
    });

    res.json(formattedChats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get existing chat
app.post('/api/chats', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const currentUserId = decoded.id;
    const { targetUserId, type = 'direct', name, participants = [] } = req.body;

    const chats = readData(CHATS_FILE);
    
    let chat;

    if (type === 'direct') {
      // Check if direct chat already exists
      chat = chats.find(c => 
        c.type === 'direct' &&
        c.participants.includes(currentUserId) && 
        c.participants.includes(targetUserId)
      );
    }

    if (!chat) {
      const allParticipants = type === 'direct' 
        ? [currentUserId, targetUserId] 
        : [currentUserId, ...participants];

      // Remove duplicates
      const uniqueParticipants = [...new Set(allParticipants)];

      chat = {
        id: uuidv4(),
        type,
        name: type === 'group' ? name : null,
        participants: uniqueParticipants,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      chats.push(chat);
      writeData(CHATS_FILE, chats);
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
app.post('/api/chats/:chatId/messages', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { chatId } = req.params;
    const { content } = req.body;

    const chats = readData(CHATS_FILE);
    const chatIndex = chats.findIndex(c => c.id === chatId);

    if (chatIndex === -1) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const newMessage = {
      id: uuidv4(),
      sender_id: decoded.id,
      content,
      created_at: new Date().toISOString()
    };

    chats[chatIndex].messages.push(newMessage);
    writeData(CHATS_FILE, chats);

    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get('/api/chats/:chatId/messages', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { chatId } = req.params;
    const chats = readData(CHATS_FILE);
    const chat = chats.find(c => c.id === chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat.messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
app.post('/api/chats/:chatId/read', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { chatId } = req.params;
    
    const chats = readData(CHATS_FILE);
    const chatIndex = chats.findIndex(c => c.id === chatId);

    if (chatIndex === -1) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chat = chats[chatIndex];
    let updated = false;

    // Mark all messages NOT sent by current user as read
    chat.messages.forEach(msg => {
        if (msg.sender_id !== decoded.id && msg.status !== 'read') {
            msg.status = 'read';
            updated = true;
        }
    });

    if (updated) {
        writeData(CHATS_FILE, chats);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single chat details
app.get('/api/chats/:chatId', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const currentUserId = decoded.id;
    const { chatId } = req.params;
    
    const chats = readData(CHATS_FILE);
    const users = readData(USERS_FILE);
    const chat = chats.find(c => c.id === chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check participation
    if (!chat.participants.includes(currentUserId)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    let name = chat.name;
    let otherUser = null;
    
    if (chat.type === 'direct') {
      const otherUserId = chat.participants.find(id => id !== currentUserId);
      otherUser = users.find(u => u.id === otherUserId);
      name = otherUser ? (otherUser.display_name || otherUser.username) : 'Unknown User';
    }

    // Determine online status (active in last 60 seconds)
    let isOnline = false;
    let lastSeen = null;
    if (otherUser && otherUser.last_seen) {
        const lastSeenDate = new Date(otherUser.last_seen);
        const diff = new Date() - lastSeenDate;
        if (diff < 60000) { // 60 seconds
            isOnline = true;
        }
        lastSeen = otherUser.last_seen;
    }

    const chatDetails = {
        ...chat,
        name,
        isOnline,
        otherUser: otherUser ? {
            id: otherUser.id,
            username: otherUser.username,
            display_name: otherUser.display_name,
            avatar_url: otherUser.avatar_url,
            email: otherUser.email,
            last_seen: lastSeen,
            is_online: isOnline
        } : null
    };

    res.json(chatDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a group
app.post('/api/chats/:chatId/join', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { chatId } = req.params;
    
    const chats = readData(CHATS_FILE);
    const chatIndex = chats.findIndex(c => c.id === chatId);

    if (chatIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const chat = chats[chatIndex];

    if (chat.type !== 'group') {
      return res.status(400).json({ error: 'Cannot join a direct chat' });
    }

    if (chat.participants.includes(decoded.id)) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    chat.participants.push(decoded.id);
    writeData(CHATS_FILE, chats);

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat Endpoint
app.post('/api/ai', async (req, res) => {
    try {
        const { message } = req.body;
        // Simple echo or rule-based response for now
        // In a real app, you'd call OpenAI or another LLM here
        
        const responses = [
            "That's interesting! Tell me more.",
            "I'm a local AI running on Node.js. How can I help?",
            "I've received your message: " + message,
            "I am currently in development mode."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ content: randomResponse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
