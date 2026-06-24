const router = require('express').Router();
const { requireSession } = require('../middleware/auth');
const pedidoModel = require('../models/pedido');
const itemModel = require('../models/item');
const acabamentoModel = require('../models/acabamento');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const arquivoModel = require('../models/arquivo');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.join(process.env.UPLOAD_DIR || '/app/uploads',
      String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extsAceitos = ['.pdf', '.png', '.jpg', '.jpeg', '.ai', '.cdr'];
    if (extsAceitos.includes(ext)) return cb(null, true);
    cb(new Error('Formato não permitido. Use PDF, PNG, JPG, AI ou CDR.'));
  },
});

router.use(requireSession);

router.get('/', async (req, res) => {
  const pedidos = await pedidoModel.listarPorUsuario(req.session.usuario.id);
  res.render('pedidos/lista', { pedidos });
});

router.get('/novo', (req, res) => {
  res.render('pedidos/novo', { erro: null });
});

// Salva rascunho com itens e acabamento recebidos do wizard (JSON no body)
router.post('/', async (req, res) => {
  const { titulo, observacao_cliente, itens, acabamento } = req.body;

  if (!titulo?.trim()) {
    return res.render('pedidos/novo', { erro: 'Título do pedido é obrigatório.' });
  }

  try {
    const pedido = await pedidoModel.criar({
      usuario_id: req.session.usuario.id,
      titulo,
      observacao_cliente,
    });

    // itens é array serializado como JSON string pelo formulário
    const listaItens = typeof itens === 'string' ? JSON.parse(itens) : (itens || []);
    for (const item of listaItens) {
      await itemModel.criar({ pedido_id: pedido.id, ...item });
    }

    if (acabamento) {
      const acab = typeof acabamento === 'string' ? JSON.parse(acabamento) : acabamento;
      await acabamentoModel.salvar({ pedido_id: pedido.id, ...acab });
    }

    res.redirect(`/pedidos/${pedido.id}`);
  } catch (err) {
    res.render('pedidos/novo', { erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  res.render('pedidos/detalhe', { pedido });
});

router.post('/:id/confirmar', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  const todosComArquivo = pedido.itens.every(i => i.arquivo_id);
  if (!todosComArquivo) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Todos os itens precisam de arquivo de arte.' });
  }
  const { numero_transferencia } = req.body;
  if (!numero_transferencia?.trim()) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Número de transferência é obrigatório.' });
  }
  await pedidoModel.atualizarStatus(pedido.id, {
    status: 'aguardando_analise',
    usuario_id: req.session.usuario.id,
    numero_transferencia,
    valor_total: pedido.itens.reduce((acc, i) => acc + Number(i.valor), 0),
  });
  res.redirect(`/pedidos/${pedido.id}`);
});

router.post('/:id/responder', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  await pedidoModel.atualizarStatus(pedido.id, {
    status: 'aguardando_analise',
    usuario_id: req.session.usuario.id,
    comentario: req.body.comentario,
  });
  res.redirect(`/pedidos/${pedido.id}`);
});

router.post('/:id/itens/:itemId/arquivo', upload.single('arquivo'), async (req, res) => {
  try {
    const pedido = await pedidoModel.findById(req.params.id);
    if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const arquivo = await arquivoModel.criar({
      item_id: req.params.itemId,
      nome_original: req.file.originalname,
      nome_arquivo: req.file.filename,
      caminho: req.file.path,
      mime_type: req.file.mimetype,
      tamanho: req.file.size,
    });
    res.json({ arquivo_id: arquivo.id, nome_original: arquivo.nome_original, caminho: arquivo.caminho });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.delete('/:id/itens/:itemId/arquivo/:arquivoId', async (req, res) => {
  try {
    const pedido = await pedidoModel.findById(req.params.id);
    if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const arquivo = await arquivoModel.findById(req.params.arquivoId);
    if (arquivo) {
      fs.rmSync(arquivo.caminho, { force: true });
      await arquivoModel.deletar(arquivo.id);
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/itens/:itemId/arquivo/:arquivoId', async (req, res) => {
  try {
    const pedido = await pedidoModel.findById(req.params.id);
    if (!pedido || pedido.usuario_id !== req.session.usuario.id) return res.status(403).send();
    const arquivo = await arquivoModel.findById(req.params.arquivoId);
    if (!arquivo) return res.status(404).send();
    res.download(arquivo.caminho, arquivo.nome_original);
  } catch (err) {
    res.status(500).send();
  }
});

module.exports = router;
