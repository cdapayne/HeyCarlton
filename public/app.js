const startBtn = document.getElementById('startbtn');
const startScreen = document.getElementById('start-screen');
const app = document.getElementById('app');
const projectList = document.getElementById('project-list');
const newProjectBtn = document.getElementById('new-project-btn');
const historyList = document.getElementById('history-list');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const fileInput = document.getElementById('file-input');
const messagesDiv = document.getElementById('messages');
const modelSelect = document.getElementById('model-select');

let currentProject = null;

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  app.classList.remove('hidden');
  loadProjects();
});

newProjectBtn.addEventListener('click', async () => {
  const name = prompt('Project name');
  if (!name) return;
  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  loadProjects();
});

projectList.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    currentProject = e.target.dataset.id;
    loadHistory();
  }
});

historyList.addEventListener('click', async e => {
  if (e.target.tagName === 'LI') {
    const chatId = e.target.dataset.id;
    const res = await fetch(`/api/projects/${currentProject}/chats/${chatId}`);
    const chat = await res.json();
    renderChat(chat);
  }
});

promptForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentProject) return alert('Select a project');
  const prompt = promptInput.value;
  if (!prompt) return;
  appendMessage('user', prompt);
  const data = new FormData();
  data.append('prompt', prompt);
  data.append('model', modelSelect.value);
  Array.from(fileInput.files).forEach(f => data.append('files', f));
  const res = await fetch(`/api/projects/${currentProject}/chat`, { method: 'POST', body: data });
  const json = await res.json();
  appendMessage('bot', json.response);
  addHistoryItem(json);
  promptInput.value = '';
  fileInput.value = '';
});

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function loadProjects() {
  const res = await fetch('/api/projects');
  const projects = await res.json();
  projectList.innerHTML = '';
  projects.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.dataset.id = p.id;
    projectList.appendChild(li);
  });
}

async function loadHistory() {
  const res = await fetch(`/api/projects/${currentProject}/chats`);
  const chats = await res.json();
  historyList.innerHTML = '';
  chats.forEach(c => addHistoryItem(c));
  messagesDiv.innerHTML = '';
}

function addHistoryItem(chat) {
  const li = document.createElement('li');
  li.textContent = chat.title;
  li.dataset.id = chat.id;
  historyList.appendChild(li);
}

function renderChat(chat) {
  messagesDiv.innerHTML = '';
  appendMessage('user', chat.prompt);
  appendMessage('bot', chat.response);
}
