const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const nodes = d3.range(500).map(() => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  vx: (Math.random() - 0.5) * 2,
  vy: (Math.random() - 0.5) * 2,
  r: Math.random() * 3 + 2,
  color: d3.interpolateRainbow(Math.random()),
  tx: null,
  ty: null
}));
nodes.forEach(n => { n.tx = n.x; n.ty = n.y; });

const letterCanvas = document.createElement('canvas');
const letterCtx = letterCanvas.getContext('2d');

function formLetter(letter) {
  letterCanvas.width = 200;
  letterCanvas.height = 200;
  letterCtx.clearRect(0, 0, 200, 200);
  letterCtx.fillStyle = '#fff';
  letterCtx.font = 'bold 160px sans-serif';
  letterCtx.textAlign = 'center';
  letterCtx.textBaseline = 'middle';
  letterCtx.fillText(letter, 100, 100);
  const data = letterCtx.getImageData(0, 0, 200, 200).data;
  const pts = [];
  for (let y = 0; y < 200; y += 4) {
    for (let x = 0; x < 200; x += 4) {
      if (data[(y * 200 + x) * 4 + 3] > 128) pts.push({ x, y });
    }
  }
  if (!pts.length) return;
  const scale = Math.min(canvas.width, canvas.height) / 200;
  const offsetX = canvas.width / 2 - 100 * scale;
  const offsetY = canvas.height / 2 - 100 * scale;
  nodes.forEach((n, i) => {
    const p = pts[i % pts.length];
    n.tx = p.x * scale + offsetX;
    n.ty = p.y * scale + offsetY;
  });
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  nodes.forEach(n => {
    const dx = n.x - x;
    const dy = n.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = 100 / (dist * dist);
    n.vx += (dx / dist) * force;
    n.vy += (dy / dist) * force;
  });
});

document.addEventListener('keypress', e => {
  if (e.target.tagName !== 'INPUT' && e.key && e.key.length === 1) {
    formLetter(e.key);
  }
});

d3.timer(() => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  nodes.forEach(n => {
    n.vx *= 0.98;
    n.vy *= 0.98;
    n.x += n.vx + (n.tx - n.x) * 0.05;
    n.y += n.vy + (n.ty - n.y) * 0.05;
    if (n.x < n.r || n.x > canvas.width - n.r) {
      n.vx *= -1;
      n.x = Math.max(n.r, Math.min(canvas.width - n.r, n.x));
    }
    if (n.y < n.r || n.y > canvas.height - n.r) {
      n.vy *= -1;
      n.y = Math.max(n.r, Math.min(canvas.height - n.r, n.y));
    }
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, 2 * Math.PI);
    ctx.fillStyle = n.color;
    ctx.fill();
  });
});

function login(user) {
  localStorage.setItem('user', user);
  window.location.href = 'chat.html';
}

document.getElementById('loginbtn').addEventListener('click', () => {
  const val = document.getElementById('heyInput').value.trim().toLowerCase();
  if (val === 'hey') {
    login('user');
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Please type "Hey"',
      background: '#1f2937',
      color: '#fff'
    });
  }
});

document.getElementById('guestbtn').addEventListener('click', () => {
  login('guest');
});
