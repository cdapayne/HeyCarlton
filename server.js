import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
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

const DEFAULT_PROMPT = 'You are Carlton, an AI assistant. Answer the user and end your response with an additional suggestion to take it to the next level.';

// Create project
app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = slugify(name);
  const dir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const meta = { id, name, prompt: DEFAULT_PROMPT, created: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  res.json(meta);
});

// List projects
app.get('/api/projects', (req, res) => {
  const projects = fs.readdirSync(PROJECTS_DIR)
    .filter(f => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory())
    .map(id => {
      const metaPath = path.join(PROJECTS_DIR, id, 'meta.json');
      const meta = fs.existsSync(metaPath)
        ? JSON.parse(fs.readFileSync(metaPath))
        : { id, name: id, prompt: DEFAULT_PROMPT };
      return meta;
    });
  res.json(projects);
});

app.put('/api/projects/:projectId', (req, res) => {
  const metaPath = path.join(PROJECTS_DIR, req.params.projectId, 'meta.json');
  if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'not found' });
  const meta = JSON.parse(fs.readFileSync(metaPath));
  const { name, prompt } = req.body;
  if (name) meta.name = name;
  if (prompt !== undefined) meta.prompt = prompt;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  res.json(meta);
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
app.post('/api/projects/:projectId/chat', async (req, res) => {
  const projectId = req.params.projectId;
  const { prompt, model = 'gpt-3.5-turbo' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const metaPath = path.join(PROJECTS_DIR, projectId, 'meta.json');
  let projectPrompt = DEFAULT_PROMPT;
  if (fs.existsSync(metaPath)) {
    try {
      projectPrompt = JSON.parse(fs.readFileSync(metaPath)).prompt || projectPrompt;
    } catch {}
  }

  let responseText = '';
  try {
    const sys = { role: 'system', content: projectPrompt };
    const completion = await openai.chat.completions.create({
      model,
      messages: [sys, { role: 'user', content: prompt }]
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
    response: responseText
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

// Return current OpenAI account balance
app.get('/api/balance', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    const data = await response.json();
    const balance = data.total_available ?? 0;
    res.json({ balance });
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
