const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');
const criarApp = require('../src/app');

const dadosValidos = { placa_veiculo: 'ABC1D23', modelo_veiculo: 'Gol G5', preco_veiculo: 30000 };

let pasta;
let app;

beforeEach(async () => {
  pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'veiculos-api-'));
  app = criarApp(path.join(pasta, 'veiculos.json'));
});

afterEach(async () => {
  await fs.rm(pasta, { recursive: true, force: true });
});

describe('POST /veiculos', () => {
  test('cria veículo e responde 201', async () => {
    const resposta = await request(app).post('/veiculos').send(dadosValidos);

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBeDefined();
    expect(resposta.body.modelo_veiculo).toBe('Gol G5');
  });

  test('dados inválidos respondem 400', async () => {
    const resposta = await request(app).post('/veiculos').send({ ...dadosValidos, preco_veiculo: 0 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBeDefined();
  });

  test('placa duplicada responde 409', async () => {
    await request(app).post('/veiculos').send(dadosValidos);
    const resposta = await request(app).post('/veiculos').send(dadosValidos);
    expect(resposta.status).toBe(409);
  });

  test('JSON malformado responde 400', async () => {
    const resposta = await request(app)
      .post('/veiculos')
      .set('Content-Type', 'application/json')
      .send('{"placa');
    expect(resposta.status).toBe(400);
  });
});

describe('GET /veiculos', () => {
  test('lista vazia no início', async () => {
    const resposta = await request(app).get('/veiculos');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  test('busca por id existente e inexistente', async () => {
    const { body } = await request(app).post('/veiculos').send(dadosValidos);

    const achou = await request(app).get(`/veiculos/${body.id}`);
    expect(achou.status).toBe(200);
    expect(achou.body.placa_veiculo).toBe('ABC1D23');

    const naoAchou = await request(app).get('/veiculos/nao-existe');
    expect(naoAchou.status).toBe(404);
  });

  test('GET /veiculos/busca?modelo= encontra por trecho do modelo', async () => {
    await request(app).post('/veiculos').send(dadosValidos);

    const resposta = await request(app).get('/veiculos/busca').query({ modelo: 'gol' });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
  });

  test('busca sem o parâmetro modelo responde 400', async () => {
    const resposta = await request(app).get('/veiculos/busca');
    expect(resposta.status).toBe(400);
  });
});

describe('PUT /veiculos/:id', () => {
  test('atualiza e responde 200', async () => {
    const { body } = await request(app).post('/veiculos').send(dadosValidos);
    const resposta = await request(app)
      .put(`/veiculos/${body.id}`)
      .send({ ...dadosValidos, modelo_veiculo: 'Gol G6' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.modelo_veiculo).toBe('Gol G6');
  });
});

describe('DELETE /veiculos/:id', () => {
  test('sem tipo faz exclusão lógica: responde 204 e depois 404', async () => {
    const { body } = await request(app).post('/veiculos').send(dadosValidos);

    const exclusao = await request(app).delete(`/veiculos/${body.id}`);
    expect(exclusao.status).toBe(204);

    const consulta = await request(app).get(`/veiculos/${body.id}`);
    expect(consulta.status).toBe(404);
  });

  test('?tipo=definitivo responde 204', async () => {
    const { body } = await request(app).post('/veiculos').send(dadosValidos);
    const resposta = await request(app).delete(`/veiculos/${body.id}`).query({ tipo: 'definitivo' });
    expect(resposta.status).toBe(204);
  });

  test('?tipo=banana responde 400', async () => {
    const { body } = await request(app).post('/veiculos').send(dadosValidos);
    const resposta = await request(app).delete(`/veiculos/${body.id}`).query({ tipo: 'banana' });
    expect(resposta.status).toBe(400);
  });
});

describe('rotas inexistentes', () => {
  test('responde 404 em JSON', async () => {
    const resposta = await request(app).get('/abc');
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toBeDefined();
  });
});
