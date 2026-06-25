const catalogoModel = require('../models/catalogo');

async function calcular({ catalogo_servico_id, quantidade, opcoes = {} }) {
  const item = await catalogoModel.findById(catalogo_servico_id);
  if (!item) throw new Error('Serviço não encontrado');

  if (item.preco_m2) {
    const largura = parseFloat(opcoes.largura || 0);
    const altura = parseFloat(opcoes.altura || 0);
    return parseFloat((largura * altura * item.preco_m2 * quantidade).toFixed(2));
  }
  return parseFloat((item.preco_unitario * quantidade).toFixed(2));
}

module.exports = { calcular };
