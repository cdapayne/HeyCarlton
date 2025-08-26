const svg = d3.select('#bg')
  .attr('width', window.innerWidth)
  .attr('height', window.innerHeight);

const nodes = d3.range(30).map(() => ({ r: Math.random() * 10 + 5 }));

const simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(5))
  .force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
  .force('collision', d3.forceCollide().radius(d => d.r + 1))
  .on('tick', ticked);

const circles = svg.selectAll('circle')
  .data(nodes)
  .enter()
  .append('circle')
  .attr('r', d => d.r)
  .attr('fill', 'rgba(255,255,255,0.5)');

function ticked() {
  circles.attr('cx', d => d.x)
    .attr('cy', d => d.y);
}

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
