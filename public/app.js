const startBtn = document.getElementById('startbtn');
const startScreen = document.getElementById('start-screen');
const app = document.getElementById('app');
const projectList = document.getElementById('project-list');
const newProjectBtn = document.getElementById('new-project-btn');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const fileInput = document.getElementById('file-input');
const messagesDiv = document.getElementById('messages');
const modelSelect = document.getElementById('model-select');
const codexInput = document.getElementById('codex-input');
const codexOutput = document.getElementById('codex-output');
const codexSubmit = document.getElementById('codex-submit');

let currentProject = null;

startBtn.addEventListener('click', () => {
  console.log('Start button clicked');
  startScreen.classList.add('hidden');
  app.classList.remove('hidden');
  loadProjects();
});

newProjectBtn.addEventListener('click', async () => {
  console.log('New project button clicked');
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
  console.log('Project list clicked', e.target);
  if (e.target.tagName === 'LI') {
    currentProject = e.target.dataset.id;
    loadProjectHistory();
  }
});

promptForm.addEventListener('submit', async e => {
  e.preventDefault();
  console.log('Prompt form submitted');
  const prompt = promptInput.value;
  if (!prompt) return;
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
});

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  if (/```/.test(text) || text.includes('\n')) {
    const codeText = text.replace(/```/g, '');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = codeText;
    pre.appendChild(code);
    div.appendChild(pre);
  } else {
    div.textContent = text;
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

codexSubmit.addEventListener('click', async () => {
  const prompt = codexInput.value;
  if (!prompt) return;
  const res = await fetch('/api/codex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const json = await res.json();
  codexOutput.textContent = json.response || json.error || '';
});
