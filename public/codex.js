const codexInput = document.getElementById('codex-input');
const codexOutput = document.getElementById('codex-output');
const codexSubmit = document.getElementById('codex-submit');
const repoInput = document.getElementById('repo-url');
const tokenInput = document.getElementById('github-token');
const loadRepoBtn = document.getElementById('load-repo');
const fileSelect = document.getElementById('file-select');

let currentFile = '';

loadRepoBtn.addEventListener('click', async () => {
  const repo = repoInput.value.trim();
  if (!repo) return;
  const headers = tokenInput.value ? { Authorization: `token ${tokenInput.value}` } : {};
  const res = await fetch(`https://api.github.com/repos/${repo}/contents`, { headers });
  const files = await res.json();
  fileSelect.innerHTML = '<option value="">Select file</option>';
  files.filter(f => f.type === 'file').forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.path;
    opt.textContent = f.path;
    fileSelect.appendChild(opt);
  });
});

fileSelect.addEventListener('change', async () => {
  const repo = repoInput.value.trim();
  const path = fileSelect.value;
  if (!repo || !path) return;
  const headers = tokenInput.value ? { Authorization: `token ${tokenInput.value}` } : {};
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers });
  const file = await res.json();
  currentFile = atob(file.content);
});

codexSubmit.addEventListener('click', async () => {
  const prompt = codexInput.value;
  if (!prompt) return;
  const fullPrompt = currentFile ? `${currentFile}\n\n${prompt}` : prompt;
  const res = await fetch('/api/codex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt })
  });
  const json = await res.json();
  codexOutput.textContent = json.response || json.error || '';
  hljs.highlightElement(codexOutput);
});
