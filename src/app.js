const express = require('express');
const VeiculoRepository = require('./repositories/veiculo.repository');
const VeiculoService = require('./services/veiculo.service');
const criarVeiculoController = require('./controllers/veiculo.controller');
const criarVeiculoRoutes = require('./routes/veiculo.routes');
const { errorHandler, rotaNaoEncontrada } = require('./middlewares/errorHandler');

function criarApp(caminhoArquivo) {
  const app = express();
  app.use(express.json());

  const repository = new VeiculoRepository(caminhoArquivo);
  const service = new VeiculoService(repository);
  const controller = criarVeiculoController(service);

  app.use('/veiculos', criarVeiculoRoutes(controller));
  app.use(rotaNaoEncontrada);
  app.use(errorHandler);

  return app;
}

module.exports = criarApp;
