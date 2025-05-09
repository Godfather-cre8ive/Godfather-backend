// Backend for Godfather Creative Planet

const express = require('express');
const cors = require('cors');
app.use(cors({ origin: 'https://gcp-admin-tau.vercel.app' }));
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB error:', err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'godfather_cp',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

const upload = multer({ storage });

const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const ContactSchema = new mongoose.Schema({
  name: String,
  email: String,
  service: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const PortfolioSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  imageUrl: String
});

const BlogSchema = new mongoose.Schema({
  title: String,
  summary: String,
  imageUrl: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Contact = mongoose.model('Contact', ContactSchema);
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);
const Blog = mongoose.model('Blog', BlogSchema);

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Access Denied' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid Token' });
  }
};

// Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.post('/api/contact', async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(200).json({ message: 'Message received' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.get('/api/portfolio', async (req, res) => {
  const items = await Portfolio.find();
  res.json(items);
});

app.post('/api/portfolio', authenticate, upload.single('image'), async (req, res) => {
  const item = new Portfolio({ ...req.body, imageUrl: req.file.path });
  await item.save();
  res.status(201).json(item);
});

app.get('/api/blogs', async (req, res) => {
  const posts = await Blog.find();
  res.json(posts);
});

app.post('/api/blogs', authenticate, upload.single('image'), async (req, res) => {
  const post = new Blog({ ...req.body, imageUrl: req.file.path });
  await post.save();
  res.status(201).json(post);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
