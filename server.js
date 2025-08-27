import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import OpenAI from 'openai';
import Parser from 'rss-parser';
import 'dotenv/config';
import { slugify, generateTitle } from './utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parser = new Parser();

const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
fs.mkdirSync(PROJECTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectId);
    fs.mkdirSync(projectPath, { recursive: true });
    cb(null, projectPath);
  },
  filename(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Create project
app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = slugify(name);
  const dir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, name, created: new Date().toISOString() }, null, 2));
  res.json({ id, name });
});

// List projects
app.get('/api/projects', (req, res) => {
  const projects = fs.readdirSync(PROJECTS_DIR)
    .filter(f => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory())
    .map(id => {
      const metaPath = path.join(PROJECTS_DIR, id, 'meta.json');
      const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath)) : { id, name: id };
      return meta;
    });
  res.json(projects);
});

// List chats for a project
app.get('/api/projects/:projectId/chats', (req, res) => {
  const projectId = req.params.projectId;
  const dir = path.join(PROJECTS_DIR, projectId);
  if (!fs.existsSync(dir)) return res.json([]);
  const chats = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'meta.json')
    .map(f => {
      const chat = JSON.parse(fs.readFileSync(path.join(dir, f)));
      return { id: f, title: chat.title, date: chat.date };
    });
  res.json(chats);
});

// Get chat content
app.get('/api/projects/:projectId/chats/:chatId', (req, res) => {
  const file = path.join(PROJECTS_DIR, req.params.projectId, req.params.chatId);
  if (!fs.existsSync(file)) return res.status(404).end();
  const chat = JSON.parse(fs.readFileSync(file));
  res.json(chat);
});

// Send chat
app.post('/api/projects/:projectId/chat', upload.array('files'), async (req, res) => {
  const projectId = req.params.projectId;
  const { prompt, model = 'gpt-3.5-turbo' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  let responseText = '';
  try {
    const sys = {
      role: 'system',
      content: 'You are Carlton, an AI assistant. Answer the user and end your response with an additional suggestion to take it to the next level.'
    };
    let userMessage;
    if (req.files && req.files.length) {
      const parts = [{ type: 'text', text: prompt }];
      for (const f of req.files) {
        if (f.mimetype && f.mimetype.startsWith('image/')) {
          const b64 = fs.readFileSync(f.path, { encoding: 'base64' });
          parts.push({ type: 'image_url', image_url: `data:${f.mimetype};base64,${b64}` });
        }
      }
      userMessage = { role: 'user', content: parts };
    } else {
      userMessage = { role: 'user', content: prompt };
    }
    const completion = await openai.chat.completions.create({
      model,
      messages: [sys, userMessage]
    });
    responseText = completion.choices[0].message.content.trim();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { title, file } = generateTitle(prompt);
  const chatData = {
    title,
    date: new Date().toISOString(),
    prompt,
    response: responseText,
    files: req.files ? req.files.map(f => ({ original: f.originalname, stored: f.filename })) : []
  };
  const chatPath = path.join(PROJECTS_DIR, projectId, file);
  fs.writeFileSync(chatPath, JSON.stringify(chatData, null, 2));
  res.json({ ...chatData, id: file });
});

app.get('/api/rss', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const feed = await parser.parseURL(url);
    const titles = feed.items.map(i => i.title);
    res.json({ titles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/balance', async (req, res) => {
  try {
    const resp = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    const data = await resp.json();
    res.json({ balance: data.total_available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone Codex endpoint using chat completions
app.post('/api/codex', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ response: completion.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
