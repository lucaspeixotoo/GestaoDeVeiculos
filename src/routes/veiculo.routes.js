const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');

function criarVeiculoRoutes(controller) {
  const router = Router();

  router.get('/', asyncHandler(controller.listar));
  router.get('/busca', asyncHandler(controller.buscarPorModelo));
  router.get('/:id', asyncHandler(controller.buscarPorId));
  router.post('/', asyncHandler(controller.criar));
  router.put('/:id', asyncHandler(controller.atualizar));
  router.delete('/:id', asyncHandler(controller.remover));

  return router;
}

module.exports = criarVeiculoRoutes;
