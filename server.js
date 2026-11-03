require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('./models/User');
const Blog = require('./models/Blog');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

app.use(cors());
app.use(express.json());

// ---------- helpers ----------
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Keep the same JSON shape the frontend already uses
function formatBlog(b) {
  return {
    id: b._id.toString(),
    title: b.title,
    category: b.category,
    author: b.author,
    authorId: b.authorId ? b.authorId.toString() : null,
    content: b.content,
    createdAt: new Date(b.createdAt).getTime()
  };
}

// Add the two sample posts once, when the blogs collection is empty
async function seedBlogs() {
  if ((await Blog.countDocuments()) > 0) return;
  await Blog.insertMany([
    {
      title: 'Getting started with HTML and CSS',
      category: 'Web',
      author: 'Codomax Team',
      content: 'HTML gives a page its structure and CSS gives it style. Start with semantic tags like header, main and footer, then use flexbox and grid to lay things out.'
    },
    {
      title: 'JavaScript basics every beginner needs',
      category: 'JavaScript',
      author: 'Codomax Team',
      content: 'Learn variables, functions, arrays and the DOM first. Once you can read from a form and update the page, you are ready to build real apps.'
    }
  ]);
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
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10)
  });
  res.status(201).json({ message: 'Registration successful' });
}));

// User Login
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  const session = { id: user._id.toString(), name: user.name, email: user.email };
  const token = jwt.sign(session, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: session });
}));

// All blogs (public)
app.get('/api/blogs', wrap(async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: 1 });
  res.json(blogs.map(formatBlog));
}));

// My blogs
app.get('/api/blogs/mine', auth, wrap(async (req, res) => {
  const blogs = await Blog.find({ authorId: req.user.id }).sort({ createdAt: 1 });
  res.json(blogs.map(formatBlog));
}));

// One blog
app.get('/api/blogs/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found' });
  }
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: 'Post not found' });
  res.json(formatBlog(blog));
}));

// Create Blog
app.post('/api/blogs', auth, wrap(async (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }
  const blog = await Blog.create({
    title,
    category: category || 'Other',
    content,
    author: req.user.name,
    authorId: req.user.id
  });
  res.status(201).json(formatBlog(blog));
}));

// Edit Blog (owner only)
app.put('/api/blogs/:id', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found' });
  }
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: 'Post not found' });
  if (!blog.authorId || blog.authorId.toString() !== req.user.id) {
    return res.status(403).json({ message: 'You can only edit your own posts' });
  }
  const { title, category, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }
  blog.title = title;
  blog.category = category || blog.category;
  blog.content = content;
  await blog.save();
  res.json(formatBlog(blog));
}));

// Delete Blog (owner only)
app.delete('/api/blogs/:id', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found' });
  }
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: 'Post not found' });
  if (!blog.authorId || blog.authorId.toString() !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own posts' });
  }
  await blog.deleteOne();
  res.json({ message: 'Post deleted' });
}));

// ---------- error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

// ---------- start ----------
connectDB().then(async () => {
  await seedBlogs();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});