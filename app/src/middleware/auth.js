// grafica/app/src/middleware/auth.js
function requireSession(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.redirect('/login');
  }
  next();
}

function requireOperador(req, res, next) {
  const perfil = req.session?.usuario?.perfil;
  if (perfil !== 'operador' && perfil !== 'admin') {
    return res.status(403).render('erro', { mensagem: 'Acesso restrito.' });
  }
  next();
}

module.exports = { requireSession, requireOperador };
