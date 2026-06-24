const { calcular } = require('../../src/services/preco');

// Mock do model para não precisar de banco
jest.mock('../../src/models/catalogo', () => ({
  findById: jest.fn(),
}));
const catalogoModel = require('../../src/models/catalogo');

describe('precoService.calcular', () => {
  it('calcula laser P&B: preco_unitario × quantidade', async () => {
    catalogoModel.findById.mockResolvedValue({ preco_unitario: 0.30, preco_m2: null });
    const valor = await calcular({ catalogo_servico_id: 'abc', quantidade: 100, opcoes: {} });
    expect(valor).toBeCloseTo(30.00);
  });

  it('calcula banner: largura × altura × preco_m2 × quantidade', async () => {
    catalogoModel.findById.mockResolvedValue({ preco_unitario: null, preco_m2: 50.00 });
    const valor = await calcular({
      catalogo_servico_id: 'abc', quantidade: 2,
      opcoes: { largura: 2, altura: 1.5 },
    });
    expect(valor).toBeCloseTo(300.00); // 2 × 1.5 × 50 × 2
  });
});
