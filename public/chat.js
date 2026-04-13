const projectList = document.getElementById('project-list');
const newProjectBtn = document.getElementById('new-project-btn');
const openCodexBtn = document.getElementById('open-codex');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const messagesDiv = document.getElementById('messages');
const modelSelect = document.getElementById('model-select');
const balanceDiv = document.getElementById('balance');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const rssOptions = document.getElementById('rss-options');
const rssMarquee = document.getElementById('rss-marquee');
const zipInput = document.getElementById('zip-input');
const weatherDiv = document.getElementById('weather');
const datetimeDiv = document.getElementById('datetime');
const tickerLabel = document.querySelector('.ticker-label');
const customFeedName = document.getElementById('custom-feed-name');
const customFeedUrl = document.getElementById('custom-feed-url');
const addFeedBtn = document.getElementById('add-feed-btn');

function updateTickerLabel() {
  if (window.matchMedia('(max-width: 600px)').matches) {
    tickerLabel.textContent = 'PNT:';
  } else {
    tickerLabel.textContent = '';
  }
}
window.addEventListener('resize', updateTickerLabel);
updateTickerLabel();

function getFlyInClass() {
  const dirs = ['fly-in-left', 'fly-in-right', 'fly-in-top', 'fly-in-bottom'];
  return dirs[Math.floor(Math.random() * dirs.length)];
}
const defaultFeeds = {
  cnn: { name: 'CNN', url: 'https://rss.cnn.com/rss/cnn_topstories.rss' },
  abc: { name: 'ABC', url: 'https://feeds.abcnews.com/abcnews/topstories' },
  sports: { name: 'Sports', url: 'https://www.espn.com/espn/rss/news' }
};
let customFeeds = JSON.parse(localStorage.getItem('customFeeds') || '{}');
const allFeeds = { ...defaultFeeds, ...customFeeds };
let selectedFeeds = JSON.parse(localStorage.getItem('rssFeeds') || JSON.stringify(Object.keys(defaultFeeds)));
let userZip = localStorage.getItem('zip') || '';

let currentProject = null;

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    modelSelect.innerHTML = '';
    if (data.models && data.models.length) {
      data.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
      });
      const saved = localStorage.getItem('selectedModel');
      if (saved && data.models.includes(saved)) {
        modelSelect.value = saved;
      } else if (data.models.includes('gpt-4o-mini')) {
        modelSelect.value = 'gpt-4o-mini';
      }
    } else {
      const fallback = ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
      fallback.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Failed to load models:', e);
    const fallback = ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
    modelSelect.innerHTML = '';
    fallback.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    });
    modelSelect.value = 'gpt-4o-mini';
  }
}
modelSelect.addEventListener('change', () => {
  localStorage.setItem('selectedModel', modelSelect.value);
});
loadModels();

async function updateBalance() {
  try {
    const res = await fetch('/api/balance');
    const data = await res.json();
    balanceDiv.textContent = `$${(+data.balance).toFixed(2)}`;
  } catch (e) {
    balanceDiv.textContent = 'n/a';
  }
}
updateBalance();
setInterval(updateBalance, 60000);

openCodexBtn.addEventListener('click', () => {
  window.open('codex.html', 'codexWindow');
});

newProjectBtn.addEventListener('click', async () => {
  const { value: name } = await Swal.fire({
    title: 'Project name',
    input: 'text',
    inputPlaceholder: 'Enter project name',
    showCancelButton: true,
    confirmButtonText: 'Create',
    background: '#1f2937',
    color: '#fff'
  });
  if (!name) return;
  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  loadProjects();
});

projectList.addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li) return;
  currentProject = li.dataset.id;
  document.querySelectorAll('#project-list li').forEach(li => li.classList.remove('selected'));
  li.classList.add('selected');
  loadProjectHistory();
});

settingsBtn.addEventListener('click', () => {
  renderSettings();
  settingsModal.classList.remove('hidden');
  settingsModal.classList.add('flex');
});

addFeedBtn.addEventListener('click', () => {
  const name = customFeedName.value.trim();
  const url = customFeedUrl.value.trim();
  if (!name || !url) return;
  const key = `custom_${Date.now()}`;
  allFeeds[key] = { name, url };
  customFeeds[key] = { name, url };
  localStorage.setItem('customFeeds', JSON.stringify(customFeeds));
  selectedFeeds.push(key);
  localStorage.setItem('rssFeeds', JSON.stringify(selectedFeeds));
  renderSettings();
  customFeedName.value = '';
  customFeedUrl.value = '';
});

settingsForm.addEventListener('submit', e => {
  e.preventDefault();
  selectedFeeds = Array.from(rssOptions.querySelectorAll('input:checked')).map(cb => cb.value);
  localStorage.setItem('rssFeeds', JSON.stringify(selectedFeeds));
  userZip = zipInput.value.trim();
  localStorage.setItem('zip', userZip);
  settingsModal.classList.add('hidden');
  settingsModal.classList.remove('flex');
  updateMarquee();
  updateWeather();
});

promptForm.addEventListener('submit', async e => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = '';
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
  const { bubble: botBubble, container: botDiv } = appendStreamingMessage();
  try {
    const res = await fetch(`/api/projects/${currentProject}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelSelect.value })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.content) {
            fullText += data.content;
            renderStreamedContent(botBubble, fullText);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }
          if (data.error) {
            botBubble.textContent = 'Error: ' + data.error;
          }
        } catch {}
      }
    }
  } catch (err) {
    botBubble.textContent = 'Error: ' + err.message;
    console.error(err);
  }
});

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role} flex gap-3 ${role === 'user' ? 'justify-end' : ''}`;
  const bubble = document.createElement('div');
  bubble.className = role === 'bot'
    ? 'bubble max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/15 text-slate-200 shadow-[0_2px_20px_rgba(0,240,255,0.06)] leading-relaxed text-sm'
    : 'bubble max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-600/40 to-indigo-600/40 border border-blue-500/20 text-slate-100 shadow-[0_2px_20px_rgba(59,130,246,0.15)] leading-relaxed text-sm';
  bubble.classList.add(getFlyInClass());
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      const p = document.createElement('p');
      p.textContent = before;
      bubble.appendChild(p);
    }
    const codeText = match[1];
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = codeText.trim();
    pre.appendChild(code);
    bubble.appendChild(pre);
    hljs.highlightElement(code);
    lastIndex = regex.lastIndex;
  }
  const after = text.slice(lastIndex).trim();
  if (after) {
    const p = document.createElement('p');
    p.textContent = after;
    bubble.appendChild(p);
  }
  if (role === 'bot') {
    const icon = document.createElement('div');
    icon.className = 'flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,240,255,0.15)]';
    icon.textContent = '🤖';
    div.appendChild(icon);
    div.appendChild(bubble);
  } else {
    div.appendChild(bubble);
  }
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendStreamingMessage() {
  const div = document.createElement('div');
  div.className = 'message bot flex gap-3';
  const icon = document.createElement('div');
  icon.className = 'flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,240,255,0.15)]';
  icon.textContent = '\ud83e\udd16';
  const bubble = document.createElement('div');
  bubble.className = 'bubble max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/15 text-slate-200 shadow-[0_2px_20px_rgba(0,240,255,0.06)] leading-relaxed text-sm';
  bubble.classList.add(getFlyInClass());
  const cursor = document.createElement('span');
  cursor.className = 'inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse';
  bubble.appendChild(cursor);
  div.appendChild(icon);
  div.appendChild(bubble);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return { bubble, container: div };
}

function renderStreamedContent(bubble, text) {
  bubble.innerHTML = '';
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      const p = document.createElement('p');
      p.textContent = before;
      bubble.appendChild(p);
    }
    const codeText = match[1];
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = codeText.trim();
    pre.appendChild(code);
    bubble.appendChild(pre);
    hljs.highlightElement(code);
    lastIndex = regex.lastIndex;
  }
  const after = text.slice(lastIndex).trim();
  if (after) {
    const p = document.createElement('p');
    p.textContent = after;
    bubble.appendChild(p);
  }
  // Add blinking cursor at the end
  const cursor = document.createElement('span');
  cursor.className = 'inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse';
  bubble.appendChild(cursor);
}

async function loadProjects() {
  const res = await fetch('/api/projects');
  const projects = await res.json();
  projectList.innerHTML = '';
  projects.forEach(p => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = p.name;
    li.appendChild(span);
    const btn = document.createElement('button');
    btn.className = 'proj-settings ml-2 text-xs';
    btn.innerHTML = '<i class="fas fa-cog"></i>';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { value: newPrompt } = await Swal.fire({
        title: 'Enter AI prompt',
        input: 'text',
        inputValue: p.prompt || '',
        showCancelButton: true,
        confirmButtonText: 'Save',
        background: '#1f2937',
        color: '#fff'
      });
      if (newPrompt !== undefined && newPrompt !== null) {
        await fetch(`/api/projects/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: newPrompt })
        });
        p.prompt = newPrompt;
      }
    });
    li.appendChild(btn);
    if (p.created) {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'project-date text-gray-400 text-xs ml-2';
      dateSpan.textContent = new Date(p.created).toLocaleDateString();
      li.appendChild(dateSpan);
    }
    li.dataset.id = p.id;
    li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all duration-200';
    if (p.id === currentProject) {
      li.classList.add('selected');
      li.className += ' !bg-cyan-500/20 !text-cyan-300 border border-cyan-500/30';
    }
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
updateMarquee();

function renderSettings() {
  rssOptions.innerHTML = '';
  Object.entries(allFeeds).forEach(([key, feed]) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = key;
    if (selectedFeeds.includes(key)) checkbox.checked = true;
    label.appendChild(checkbox);
    label.append(' ' + feed.name);
    rssOptions.appendChild(label);
  });
  zipInput.value = userZip;
}

async function updateMarquee() {
  const titles = [];
  for (const key of selectedFeeds) {
    const url = allFeeds[key].url;
    try {
      const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      titles.push(...json.titles);
    } catch (err) {
      console.error(err);
    }
  }
  const content = document.createElement('div');
  content.className = 'marquee-content';
  content.innerHTML = titles.map(t => `<span>${t}</span>`).join('');
  rssMarquee.innerHTML = '';
  rssMarquee.appendChild(content);
}

async function updateWeather() {
  if (!userZip) {
    weatherDiv.textContent = '';
    return;
  }
  try {
    const res = await fetch(`https://wttr.in/${userZip}?format=j1`);
    const data = await res.json();
    const current = data.current_condition[0];
    const humidity = parseInt(current.humidity);
    const condition = current.weatherDesc[0].value.toLowerCase();
    let iconClass = 'bi-cloud';
    if (condition.includes('sun') || condition.includes('clear')) iconClass = 'bi-sun-fill';
    else if (condition.includes('rain')) iconClass = 'bi-cloud-rain-fill';
    else if (condition.includes('snow')) iconClass = 'bi-snow';
    else if (condition.includes('thunder') || condition.includes('storm')) iconClass = 'bi-cloud-lightning-rain-fill';
    else if (condition.includes('fog') || condition.includes('mist')) iconClass = 'bi-cloud-fog2-fill';
    weatherDiv.style.color = humidity < 55 ? 'limegreen' : '';
    weatherDiv.innerHTML = `<i class="bi ${iconClass} mr-1"></i>${current.temp_F}\u00B0F ${humidity}%`;
  } catch (e) {
    console.error(e);
    weatherDiv.textContent = '';
  }
}

function showThinking() {
  const div = document.createElement('div');
  div.className = 'message bot flex gap-3';
  const icon = document.createElement('div');
  icon.className = 'flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,240,255,0.15)]';
  icon.textContent = '\ud83e\udd16';
  const bubble = document.createElement('div');
  bubble.className = 'bubble max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/15 text-slate-200 shadow-[0_2px_20px_rgba(0,240,255,0.06)]';
  bubble.classList.add(getFlyInClass());
  const dots = document.createElement('div');
  dots.className = 'flex gap-1.5 items-center py-1';
  dots.innerHTML = '<span class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style="animation-delay:0ms"></span><span class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style="animation-delay:150ms"></span><span class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>';
  bubble.appendChild(dots);
  div.appendChild(icon);
  div.appendChild(bubble);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}
function updateDateTime() {
  datetimeDiv.textContent = new Date().toLocaleString();
}

updateWeather();
updateDateTime();
setInterval(updateDateTime, 60000);
setInterval(updateWeather, 600000);
