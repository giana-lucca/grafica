// grafica/app/src/routes/auth.js
const router = require('express').Router();

router.get('/login', (req, res) => res.render('login', { erro: null }));
router.post('/login', (req, res) => res.redirect('/'));
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});
router.get('/', (req, res) => res.redirect('/login'));

module.exports = router;
