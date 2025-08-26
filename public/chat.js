const projectList = document.getElementById('project-list');
const newProjectBtn = document.getElementById('new-project-btn');
const openCodexBtn = document.getElementById('open-codex');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const fileInput = document.getElementById('file-input');
const messagesDiv = document.getElementById('messages');
const modelSelect = document.getElementById('model-select');

let remainingQueries = parseInt(localStorage.getItem('remainingQueries') || '0');
const queryLimit = document.createElement('div');
queryLimit.id = 'query-limit';
document.getElementById('top-info').appendChild(queryLimit);
updateQueryDisplay();

let currentProject = null;

openCodexBtn.addEventListener('click', () => {
  window.open('codex.html', 'codexWindow');
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
    loadProjectHistory();
  }
});

promptForm.addEventListener('submit', async e => {
  e.preventDefault();
  const prompt = promptInput.value;
  if (!prompt) return;
  if (remainingQueries <= 0) {
    alert('Query limit reached');
    return;
  }
  if (!currentProject) {
    const name = prompt.trim().substring(0, 20) || 'project';
    const resProj = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const proj = await resProj.json();
    currentProject = proj.id;
    loadProjects();
  }
  appendMessage('user', prompt);
  const data = new FormData();
  data.append('prompt', prompt);
  data.append('model', modelSelect.value);
  Array.from(fileInput.files).forEach(f => data.append('files', f));
  const res = await fetch(`/api/projects/${currentProject}/chat`, { method: 'POST', body: data });
  const json = await res.json();
  appendMessage('bot', json.response);
  promptInput.value = '';
  fileInput.value = '';
  remainingQueries--;
  localStorage.setItem('remainingQueries', remainingQueries);
  updateQueryDisplay();
});

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      const p = document.createElement('p');
      p.textContent = before;
      div.appendChild(p);
    }
    const codeText = match[1];
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = codeText.trim();
    pre.appendChild(code);
    div.appendChild(pre);
    hljs.highlightElement(code);
    lastIndex = regex.lastIndex;
  }
  const after = text.slice(lastIndex).trim();
  if (after) {
    const p = document.createElement('p');
    p.textContent = after;
    div.appendChild(p);
  }
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

async function loadProjectHistory() {
  const res = await fetch(`/api/projects/${currentProject}/chats`);
  const chats = await res.json();
  messagesDiv.innerHTML = '';
  for (const c of chats) {
    const resChat = await fetch(`/api/projects/${currentProject}/chats/${c.id}`);
    const chat = await resChat.json();
    appendMessage('user', chat.prompt);
    appendMessage('bot', chat.response);
  }
}

loadProjects();

function updateQueryDisplay() {
  queryLimit.textContent = `Queries left: ${remainingQueries}`;
}
