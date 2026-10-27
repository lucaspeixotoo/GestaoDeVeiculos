const crypto = require('crypto');
const AppError = require('../errors/AppError');
const { validarDadosVeiculo } = require('../validators/veiculo.validator');

const TIPOS_EXCLUSAO = ['logico', 'definitivo'];

class VeiculoService {
  constructor(repository) {
    this.repository = repository;
  }

  async listar() {
    const veiculos = await this.repository.lerTodos();
    return veiculos.filter((veiculo) => !veiculo.excluido);
  }

  async buscarPorId(id) {
    const veiculos = await this.repository.lerTodos();
    return this._encontrarAtivo(veiculos, id);
  }

  async buscarPorModelo(modelo) {
    const termo = typeof modelo === 'string' ? modelo.trim().toLowerCase() : '';
    if (!termo) {
      throw new AppError('Informe o parâmetro "modelo" na busca.', 400);
    }
    const ativos = await this.listar();
    return ativos.filter((veiculo) => veiculo.modelo_veiculo.toLowerCase().includes(termo));
  }

  async criar(dados) {
    const novos = validarDadosVeiculo(dados);
    return this.repository.modificar((veiculos) => {
      this._garantirPlacaLivre(veiculos, novos.placa_veiculo);
      const veiculo = { id: crypto.randomUUID(), ...novos, excluido: false };
      veiculos.push(veiculo);
      return veiculo;
    });
  }

  async atualizar(id, dados) {
    const novos = validarDadosVeiculo(dados);
    return this.repository.modificar((veiculos) => {
      const veiculo = this._encontrarAtivo(veiculos, id);
      this._garantirPlacaLivre(veiculos, novos.placa_veiculo, id);
      Object.assign(veiculo, novos);
      return veiculo;
    });
  }

  async remover(id, tipo = 'logico') {
    if (!TIPOS_EXCLUSAO.includes(tipo)) {
      throw new AppError('Tipo de exclusão inválido. Use "logico" ou "definitivo".', 400);
    }
    return this.repository.modificar((veiculos) => {
      const indice = veiculos.findIndex((veiculo) => veiculo.id === id && !veiculo.excluido);
      if (indice === -1) {
        throw new AppError('Veículo não encontrado.', 404);
      }
      if (tipo === 'definitivo') {
        veiculos.splice(indice, 1);
      } else {
        veiculos[indice].excluido = true;
      }
    });
  }

  _encontrarAtivo(veiculos, id) {
    const veiculo = veiculos.find((item) => item.id === id && !item.excluido);
    if (!veiculo) {
      throw new AppError('Veículo não encontrado.', 404);
    }
    return veiculo;
  }

  _garantirPlacaLivre(veiculos, placa, idIgnorado = null) {
    const duplicada = veiculos.some(
      (veiculo) => !veiculo.excluido && veiculo.placa_veiculo === placa && veiculo.id !== idIgnorado
    );
    if (duplicada) {
      throw new AppError('Já existe um veículo ativo com essa placa.', 409);
    }
  }
}

module.exports = VeiculoService;
