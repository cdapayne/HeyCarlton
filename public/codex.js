const codexInput = document.getElementById('codex-input');
const codexOutput = document.getElementById('codex-output');
const codexSubmit = document.getElementById('codex-submit');

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
  hljs.highlightElement(codexOutput);
});
