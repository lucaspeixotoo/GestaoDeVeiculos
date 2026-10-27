function criarVeiculoController(service) {
  return {
    async listar(req, res) {
      res.status(200).json(await service.listar());
    },

    async buscarPorModelo(req, res) {
      res.status(200).json(await service.buscarPorModelo(req.query.modelo));
    },

    async buscarPorId(req, res) {
      res.status(200).json(await service.buscarPorId(req.params.id));
    },

    async criar(req, res) {
      const veiculo = await service.criar(req.body);
      res.status(201).json(veiculo);
    },

    async atualizar(req, res) {
      const veiculo = await service.atualizar(req.params.id, req.body);
      res.status(200).json(veiculo);
    },

    async remover(req, res) {
      await service.remover(req.params.id, req.query.tipo);
      res.status(204).send();
    },
  };
}

module.exports = criarVeiculoController;
