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

let remainingQueries = parseInt(localStorage.getItem('remainingQueries') || '0');
const queryLimit = document.createElement('div');
queryLimit.id = 'query-limit';
document.getElementById('top-info').appendChild(queryLimit);
updateQueryDisplay();

let currentProject = null;

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
  const prompt = promptInput.value;
  if (!prompt) return;
  if (remainingQueries <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Query limit reached',
      background: '#1f2937',
      color: '#fff'
    });
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
  const thinkingDiv = showThinking();
  try {
    const res = await fetch(`/api/projects/${currentProject}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelSelect.value })
    });
    const json = await res.json();
    messagesDiv.removeChild(thinkingDiv);
    appendMessage('bot', json.response);
  } catch (err) {
    messagesDiv.removeChild(thinkingDiv);
    console.error(err);
  }
  promptInput.value = '';
  remainingQueries--;
  localStorage.setItem('remainingQueries', remainingQueries);
  updateQueryDisplay();
});

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
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
    icon.className = 'icon-bubble';
    icon.textContent = '🤖';
    div.appendChild(icon);
    div.appendChild(bubble);
  } else {
    div.appendChild(bubble);
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
    if (p.id === currentProject) li.classList.add('selected');
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

function updateQueryDisplay() {
  queryLimit.textContent = `Queries left: ${remainingQueries}`;
}

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
  div.className = 'message bot';
  const icon = document.createElement('div');
  icon.className = 'icon-bubble';
  icon.textContent = '🤖';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.classList.add(getFlyInClass());
  const img = document.createElement('img');
  img.src = 'https://media.tenor.com/I6kN-6X7nhAAAAAj/loading-buffering.gif';
  img.alt = 'thinking';
  img.className = 'w-6 h-6';
  bubble.appendChild(img);
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
