const request = require('supertest');
const app = require('../../src/server');

// Mock do portal legado para o teste não depender do sistema externo
jest.mock('../../src/services/auth', () => ({
  login: jest.fn().mockResolvedValue({
    matricula: 'smoke001', nome: 'Smoke Test', email: 'smoke@ufsm.br', perfil: 'cliente',
  }),
  _chamarPortal: jest.fn(),
}));

describe('Smoke tests', () => {
  it('GET /login retorna 200', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Gráfica UFSM');
  });

  it('POST /login redireciona para /pedidos', async () => {
    const res = await request(app)
      .post('/login')
      .send('matricula=smoke001&senha=qualquer')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pedidos');
  });

  it('GET /pedidos sem sessão redireciona para /login', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});
