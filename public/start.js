const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select('#bg')
  .attr('width', width)
  .attr('height', height);

const nodes = d3.range(40).map(() => ({ r: Math.random() * 6 + 4 }));
const links = d3.range(nodes.length).map(() => ({
  source: Math.floor(Math.random() * nodes.length),
  target: Math.floor(Math.random() * nodes.length)
}));

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).distance(60).strength(0.5))
  .force('charge', d3.forceManyBody().strength(-30))
  .force('center', d3.forceCenter(width / 2, height / 2));

const link = svg.append('g')
  .attr('stroke', 'rgba(255,255,255,0.2)')
  .selectAll('line')
  .data(links)
  .join('line');

const node = svg.append('g')
  .selectAll('circle')
  .data(nodes)
  .join('circle')
  .attr('r', d => d.r)
  .attr('fill', () => d3.interpolateRainbow(Math.random()))
  .call(d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended));

simulation.on('tick', () => {
  link
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);
  node
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
});

svg.on('mousemove', event => {
  const [x, y] = d3.pointer(event);
  simulation.alphaTarget(0.3).restart();
  nodes.forEach(n => {
    n.vx += (x - n.x) * 0.001;
    n.vy += (y - n.y) * 0.001;
  });
});

function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}
function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}
function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
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
