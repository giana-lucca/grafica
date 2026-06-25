const nodemailer = require('nodemailer');

let _transport = null;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return _transport;
}

async function enviar({ para, assunto, texto }) {
  await getTransport().sendMail({
    from: process.env.EMAIL_FROM || 'grafica@ufsm.br',
    to: para,
    subject: assunto,
    text: texto,
  });
}

module.exports = { enviar };
