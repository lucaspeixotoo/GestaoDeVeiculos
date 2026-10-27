const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const VeiculoRepository = require('../src/repositories/veiculo.repository');
const VeiculoService = require('../src/services/veiculo.service');

const dadosValidos = { placa_veiculo: 'ABC1D23', modelo_veiculo: 'Gol G5', preco_veiculo: 30000 };

let pasta;
let caminho;
let service;

beforeEach(async () => {
  pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'veiculos-'));
  caminho = path.join(pasta, 'veiculos.json');
  service = new VeiculoService(new VeiculoRepository(caminho));
});

afterEach(async () => {
  await fs.rm(pasta, { recursive: true, force: true });
});

const lerArquivo = async () => JSON.parse(await fs.readFile(caminho, 'utf-8'));

describe('cadastro e validação', () => {
  test('cria veículo com id e normaliza a placa', async () => {
    const veiculo = await service.criar({ ...dadosValidos, placa_veiculo: 'abc-1d23' });

    expect(veiculo.id).toBeDefined();
    expect(veiculo.placa_veiculo).toBe('ABC1D23');
    expect(veiculo.excluido).toBe(false);
  });

  test('aceita placa no formato antigo', async () => {
    const veiculo = await service.criar({ ...dadosValidos, placa_veiculo: 'ABC1234' });
    expect(veiculo.placa_veiculo).toBe('ABC1234');
  });

  test('rejeita placa inválida com 400', async () => {
    await expect(service.criar({ ...dadosValidos, placa_veiculo: 'XX' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test.each([0, -5, '30000', null])('rejeita preço inválido (%p) com 400', async (preco) => {
    await expect(service.criar({ ...dadosValidos, preco_veiculo: preco }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejeita modelo vazio com 400', async () => {
    await expect(service.criar({ ...dadosValidos, modelo_veiculo: '   ' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejeita placa duplicada entre veículos ativos com 409', async () => {
    await service.criar(dadosValidos);
    await expect(service.criar(dadosValidos)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('cadastros simultâneos da mesma placa criam só um registro', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.criar(dadosValidos))
    );
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await lerArquivo()).toHaveLength(1);
  });
});

describe('exclusão lógica e definitiva', () => {
  test('sem informar o tipo, a exclusão é lógica', async () => {
    const veiculo = await service.criar(dadosValidos);
    await service.remover(veiculo.id);

    expect(await service.listar()).toHaveLength(0);
    const arquivo = await lerArquivo();
    expect(arquivo).toHaveLength(1);
    expect(arquivo[0].excluido).toBe(true);
  });

  test('exclusão definitiva remove o registro do arquivo', async () => {
    const veiculo = await service.criar(dadosValidos);
    await service.remover(veiculo.id, 'definitivo');

    expect(await lerArquivo()).toHaveLength(0);
  });

  test('tipo de exclusão desconhecido retorna 400 e não apaga nada', async () => {
    const veiculo = await service.criar(dadosValidos);
    await expect(service.remover(veiculo.id, 'banana')).rejects.toMatchObject({ statusCode: 400 });
    expect(await service.listar()).toHaveLength(1);
  });

  test('veículo excluído logicamente é tratado como inexistente (404)', async () => {
    const veiculo = await service.criar(dadosValidos);
    await service.remover(veiculo.id);

    await expect(service.buscarPorId(veiculo.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.remover(veiculo.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('recadastrar a placa de um veículo excluído cria um registro novo', async () => {
    const antigo = await service.criar(dadosValidos);
    await service.remover(antigo.id);
    const novo = await service.criar(dadosValidos);

    expect(novo.id).not.toBe(antigo.id);
    expect(await lerArquivo()).toHaveLength(2);
    expect(await service.listar()).toHaveLength(1);
  });
});

describe('busca por modelo', () => {
  beforeEach(async () => {
    await service.criar({ ...dadosValidos, placa_veiculo: 'AAA1111', modelo_veiculo: 'Gol G5' });
    await service.criar({ ...dadosValidos, placa_veiculo: 'BBB2222', modelo_veiculo: 'Civic' });
  });

  test('busca parcial, sem diferenciar maiúsculas e minúsculas', async () => {
    const resultado = await service.buscarPorModelo('GOL');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].modelo_veiculo).toBe('Gol G5');
  });

  test('sem resultado devolve lista vazia', async () => {
    expect(await service.buscarPorModelo('fusca')).toEqual([]);
  });

  test('sem informar o modelo retorna 400', async () => {
    await expect(service.buscarPorModelo('')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('não retorna veículos excluídos logicamente', async () => {
    const [gol] = await service.buscarPorModelo('gol');
    await service.remover(gol.id);
    expect(await service.buscarPorModelo('gol')).toEqual([]);
  });
});

describe('atualização', () => {
  test('atualiza os dados e permite manter a própria placa', async () => {
    const veiculo = await service.criar(dadosValidos);
    const atualizado = await service.atualizar(veiculo.id, { ...dadosValidos, preco_veiculo: 35000 });

    expect(atualizado.preco_veiculo).toBe(35000);
    expect(atualizado.id).toBe(veiculo.id);
  });

  test('não permite usar a placa de outro veículo ativo (409)', async () => {
    await service.criar({ ...dadosValidos, placa_veiculo: 'AAA1111' });
    const outro = await service.criar({ ...dadosValidos, placa_veiculo: 'BBB2222' });

    await expect(service.atualizar(outro.id, { ...dadosValidos, placa_veiculo: 'AAA1111' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('atualizar veículo inexistente retorna 404', async () => {
    await expect(service.atualizar('nao-existe', dadosValidos))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
