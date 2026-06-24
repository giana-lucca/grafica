const pool = require('../../src/config/db');
const catalogo = require('../../src/models/catalogo');

beforeAll(async () => {
  await pool.query('DELETE FROM catalogo_servicos');
});

afterAll(async () => {
  await pool.query('DELETE FROM catalogo_servicos');
  await pool.end();
});

describe('catalogoModel', () => {
  let itemId;

  it('cria um item no catálogo', async () => {
    const item = await catalogo.criar({
      tipo: 'laser_pb', descricao: 'Laser P&B A4', papel: 'sulfite',
      formato: 'A4', preco_unitario: 0.30, preco_m2: null,
    });
    expect(item.id).toBeDefined();
    expect(item.ativo).toBe(true);
    itemId = item.id;
  });

  it('lista itens e retorna o criado', async () => {
    const itens = await catalogo.listar();
    expect(itens.some(i => i.id === itemId)).toBe(true);
  });

  it('suspende o item', async () => {
    const item = await catalogo.suspender(itemId, { motivo: 'Manutenção', inativo_ate: '2026-07-01' });
    expect(item.ativo).toBe(false);
    expect(item.motivo_inativo).toBe('Manutenção');
  });

  it('reativa o item', async () => {
    const item = await catalogo.reativar(itemId);
    expect(item.ativo).toBe(true);
  });
});
