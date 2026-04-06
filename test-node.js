const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  console.log(`[TEST-NODE] Request: ${req.method} ${req.url}`);
  try {
    fs.appendFileSync("server.log", `[${new Date().toISOString()}] TEST-NODE hit: ${req.method} ${req.url}\n`);
  } catch (e) {}

  if (req.url === '/test-node-ping') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('PONG from pure Node.js test server!\n');
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <h1>Hello from Pure Node.js!</h1>
    <p>If you see this, Node.js is running and reachable.</p>
    <p>Request URL: ${req.url}</p>
    <p>Time: ${new Date().toISOString()}</p>
  `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[TEST-NODE] Server running at http://0.0.0.0:${PORT}/`);
  try {
    fs.appendFileSync("server.log", `[${new Date().toISOString()}] TEST-NODE listening on ${PORT}\n`);
  } catch (e) {}
});
