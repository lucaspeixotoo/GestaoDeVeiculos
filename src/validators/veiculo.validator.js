const AppError = require('../errors/AppError');

const REGEX_PLACA = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;

function normalizarPlaca(placa) {
  if (typeof placa !== 'string' || placa.trim() === '') {
    throw new AppError('placa_veiculo é obrigatória.', 400);
  }
  const normalizada = placa.trim().toUpperCase().replace('-', '');
  if (!REGEX_PLACA.test(normalizada)) {
    throw new AppError('placa_veiculo inválida. Use o formato ABC1234 ou ABC1D23.', 400);
  }
  return normalizada;
}

function validarModelo(modelo) {
  if (typeof modelo !== 'string' || modelo.trim() === '') {
    throw new AppError('modelo_veiculo é obrigatório.', 400);
  }
  return modelo.trim();
}

function validarPreco(preco) {
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0) {
    throw new AppError('preco_veiculo deve ser um número maior que zero.', 400);
  }
  return preco;
}

function validarDadosVeiculo(dados) {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new AppError('Corpo da requisição inválido.', 400);
  }
  return {
    placa_veiculo: normalizarPlaca(dados.placa_veiculo),
    modelo_veiculo: validarModelo(dados.modelo_veiculo),
    preco_veiculo: validarPreco(dados.preco_veiculo),
  };
}

module.exports = { validarDadosVeiculo };
