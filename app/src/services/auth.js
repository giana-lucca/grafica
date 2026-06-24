// grafica/app/src/services/auth.js
const https = require('https');
const http = require('http');

async function _chamarPortal(matricula, senha) {
  const portalUrl = process.env.PORTAL_URL;
  const url = new URL('/auth', portalUrl);
  const body = JSON.stringify({ matricula, senha });
  const lib = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('Credenciais inválidas'));
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Resposta inválida do portal')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function login(matricula, senha) {
  // Require self so jest.mock can replace _chamarPortal
  const self = require('./auth');
  const dados = await self._chamarPortal(matricula, senha);
  return dados.user;
}

module.exports = { login, _chamarPortal };
