require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const DB_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// ---------- tiny JSON "database" ----------
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const seed = {
      users: [],
      blogs: [
        {
          id: 1,
          title: 'Getting started with HTML and CSS',
          category: 'Web',
          author: 'Codomax Team',
          authorId: 0,
          content: 'HTML gives a page its structure and CSS gives it style. Start with semantic tags like header, main and footer, then use flexbox and grid to lay things out.',
          createdAt: Date.now() - 86400000 * 3
        },
        {
          id: 2,
          title: 'JavaScript basics every beginner needs',
          category: 'JavaScript',
          author: 'Codomax Team',
          authorId: 0,
          content: 'Learn variables, functions, arrays and the DOM first. Once you can read from a form and update the page, you are ready to build real apps.',
          createdAt: Date.now() - 86400000 * 2
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------- auth middleware ----------
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

// ---------- routes ----------
app.get('/', (req, res) => res.json({ message: 'Inkwell API is running' }));

// User Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  db.users.push({
    id: Date.now(),
    name,
    email,
    password: await bcrypt.hash(password, 10)
  });
  writeDB(db);
  res.status(201).json({ message: 'Registration successful' });
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  const session = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(session, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: session });
});

// All blogs (public)
app.get('/api/blogs', (req, res) => {
  res.json(readDB().blogs);
});

// My blogs
app.get('/api/blogs/mine', auth, (req, res) => {
  res.json(readDB().blogs.filter(b => b.authorId === req.user.id));
});

// One blog
app.get('/api/blogs/:id', (req, res) => {
  const blog = readDB().blogs.find(b => b.id === Number(req.params.id));
  if (!blog) return res.status(404).json({ message: 'Post not found' });
  res.json(blog);
});

// Create Blog
app.post('/api/blogs', auth, (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }
  const db = readDB();
  const blog = {
    id: Date.now(),
    title,
    category: category || 'Other',
    author: req.user.name,
    authorId: req.user.id,
    content,
    createdAt: Date.now()
  };
  db.blogs.push(blog);
  writeDB(db);
  res.status(201).json(blog);
});

// Edit Blog (owner only)
app.put('/api/blogs/:id', auth, (req, res) => {
  const db = readDB();
  const blog = db.blogs.find(b => b.id === Number(req.params.id));
  if (!blog) return res.status(404).json({ message: 'Post not found' });
  if (blog.authorId !== req.user.id) {
    return res.status(403).json({ message: 'You can only edit your own posts' });
  }
  const { title, category, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }
  blog.title = title;
  blog.category = category || blog.category;
  blog.content = content;
  writeDB(db);
  res.json(blog);
});

// Delete Blog (owner only)
app.delete('/api/blogs/:id', auth, (req, res) => {
  const db = readDB();
  const blog = db.blogs.find(b => b.id === Number(req.params.id));
  if (!blog) return res.status(404).json({ message: 'Post not found' });
  if (blog.authorId !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own posts' });
  }
  db.blogs = db.blogs.filter(b => b.id !== blog.id);
  writeDB(db);
  res.json({ message: 'Post deleted' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));