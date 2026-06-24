const nodemailer = require('nodemailer');

function criarTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function enviar({ para, assunto, texto }) {
  const transport = criarTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'grafica@ufsm.br',
    to: para,
    subject: assunto,
    text: texto,
  });
}

module.exports = { enviar };
