const { spawn } = require('child_process');
const tunnel = spawn('ssh', [
  '-o', 'StrictHostKeyChecking=no',
  '-R', '80:localhost:4000',
  'nokey@localhost.run'
], { stdio: ['ignore', 'pipe', 'pipe'] });

tunnel.stderr.on('data', d => {
  const text = d.toString();
  const m = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
  if (m) {
    require('fs').writeFileSync(
      'C:\\Users\\USER\\AppData\\Local\\Temp\\opencode\\tunnel_url.txt',
      m[0]
    );
    console.log('TUNNEL_URL=' + m[0]);
  }
  process.stderr.write(d);
});

tunnel.on('exit', code => {
  console.error('Tunnel exited with code', code);
  process.exit(code);
});

process.on('SIGTERM', () => tunnel.kill());
process.on('SIGINT', () => tunnel.kill());
