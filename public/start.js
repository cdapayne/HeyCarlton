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
  .force('link', d3.forceLink(links).distance(40).strength(0.5))
  .force('charge', d3.forceManyBody().strength(-30))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(d => d.r + 1))
  .on('tick', ticked);

const link = svg.append('g')
  .attr('stroke', 'rgba(255,255,255,0.15)')
  .selectAll('line')
  .data(links)
  .enter().append('line');

const node = svg.append('g')
  .selectAll('circle')
  .data(nodes)
  .enter().append('circle')
  .attr('r', d => d.r)
  .attr('fill', (_, i) => d3.interpolateRainbow(i / nodes.length))
  .call(d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
  );

function ticked() {
  link
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);
  node
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
}

function dragstarted(event) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  event.subject.fx = event.subject.x;
  event.subject.fy = event.subject.y;
}

function dragged(event) {
  event.subject.fx = event.x;
  event.subject.fy = event.y;
}

function dragended(event) {
  if (!event.active) simulation.alphaTarget(0);
  event.subject.fx = null;
  event.subject.fy = null;
}

svg.on('mousemove', (event) => {
  const [x, y] = d3.pointer(event);
  simulation.force('center', d3.forceCenter(x, y));
  simulation.alphaTarget(0.1).restart();
});

d3.interval(() => {
  node.attr('fill', (_, i) => d3.interpolateRainbow((Date.now()/5000 + i/nodes.length) % 1));
}, 100);

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
