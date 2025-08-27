const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const nodes = d3.range(100).map(() => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  vx: (Math.random() - 0.5) * 2,
  vy: (Math.random() - 0.5) * 2,
  r: Math.random() * 3 + 2,
  color: d3.interpolateRainbow(Math.random())
}));

d3.timer(() => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  nodes.forEach(n => {
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < n.r || n.x > canvas.width - n.r) n.vx *= -1;
    if (n.y < n.r || n.y > canvas.height - n.r) n.vy *= -1;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, 2 * Math.PI);
    ctx.fillStyle = n.color;
    ctx.fill();
  });
});

function login(user) {
  localStorage.setItem('user', user);
  localStorage.setItem('remainingQueries', '20');
  window.location.href = 'chat.html';
}

document.getElementById('loginbtn').addEventListener('click', () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  if (u === 'admin' && p === 'admin123') {
    login('admin');
  } else {
    alert('Invalid credentials');
  }
});

document.getElementById('guestbtn').addEventListener('click', () => {
  login('guest');
});
