const router = require('express').Router();
const { requireSession } = require('../middleware/auth');
const catalogoModel = require('../models/catalogo');
const precoService = require('../services/preco');

router.use(requireSession);

router.get('/catalogo-ativo', async (req, res) => {
  try {
    const itens = await catalogoModel.listarAtivos();
    res.json(itens);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/calcular-item', async (req, res) => {
  try {
    const { catalogo_servico_id, quantidade, opcoes } = req.body;
    const qtdInt = parseInt(quantidade);
    if (!Number.isInteger(qtdInt) || qtdInt <= 0) {
      return res.status(400).json({ erro: 'quantidade deve ser um número inteiro positivo' });
    }
    const valor = await precoService.calcular({ catalogo_servico_id, quantidade: qtdInt, opcoes: opcoes || {} });
    res.json({ valor });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

module.exports = router;
