const AppError = require('../errors/AppError');

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

function errorHandler(erro, req, res, next) {
  if (erro instanceof AppError) {
    return res.status(erro.statusCode).json({ erro: erro.message });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(erro); // erro inesperado: registra no servidor, não vaza detalhes ao cliente
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { errorHandler, rotaNaoEncontrada };
