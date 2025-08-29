function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateTitle(prompt) {
  const dateStr = new Date().toISOString().split('T')[0];
  const short = prompt.trim().substring(0, 20) || 'chat';
  const title = `${dateStr} ${short}`;
  const file = slugify(title) + '.json';
  return { title, file };
}

module.exports = { slugify, generateTitle };
