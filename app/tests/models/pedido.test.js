const pool = require('../../src/config/db');
const pedidoModel = require('../../src/models/pedido');
const usuarioModel = require('../../src/models/usuario');

let usuarioId;

beforeAll(async () => {
  await pool.query('DELETE FROM pedidos');
  await pool.query('DELETE FROM usuarios WHERE matricula = $1', ['test001']);
  const u = await usuarioModel.upsert({ matricula: 'test001', nome: 'Teste', email: 't@t.com', perfil: 'cliente' });
  usuarioId = u.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM pedidos');
  await pool.query('DELETE FROM usuarios WHERE matricula = $1', ['test001']);
  await pool.end();
});

describe('pedidoModel', () => {
  let pedidoId;

  it('cria pedido com número no formato AAAA-NNNN', async () => {
    const pedido = await pedidoModel.criar({ usuario_id: usuarioId, titulo: 'Teste' });
    expect(pedido.numero).toMatch(/^\d{4}-\d{4}$/);
    expect(pedido.status).toBe('rascunho');
    pedidoId = pedido.id;
  });

  it('lista pedidos do usuário', async () => {
    const pedidos = await pedidoModel.listarPorUsuario(usuarioId);
    expect(pedidos.length).toBeGreaterThan(0);
  });

  it('atualiza status e registra histórico', async () => {
    await pedidoModel.atualizarStatus(pedidoId, {
      status: 'aguardando_analise',
      usuario_id: usuarioId,
      comentario: null,
      numero_transferencia: '12345',
    });
    const pedido = await pedidoModel.findById(pedidoId);
    expect(pedido.status).toBe('aguardando_analise');
    expect(pedido.historico.length).toBe(1);
  });
});
