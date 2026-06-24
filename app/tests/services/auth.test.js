// grafica/app/tests/services/auth.test.js
const { login } = require('../../src/services/auth');

// Mock da chamada HTTP ao portal legado
jest.mock('../../src/services/auth', () => {
  const original = jest.requireActual('../../src/services/auth');
  return { ...original, _chamarPortal: jest.fn() };
});

const authService = require('../../src/services/auth');

describe('authService.login', () => {
  it('retorna dados do usuário quando portal aceita as credenciais', async () => {
    authService._chamarPortal.mockResolvedValueOnce({
      token: 'tok123',
      user: { matricula: '201812345', nome: 'Ana Silva', email: 'ana@ufsm.br', perfil: 'cliente' },
    });

    const result = await authService.login('201812345', 'senha123');

    expect(result).toMatchObject({ matricula: '201812345', nome: 'Ana Silva' });
  });

  it('lança erro quando o portal rejeita as credenciais', async () => {
    authService._chamarPortal.mockRejectedValueOnce(new Error('Credenciais inválidas'));

    await expect(authService.login('999', 'errada')).rejects.toThrow('Credenciais inválidas');
  });
});
