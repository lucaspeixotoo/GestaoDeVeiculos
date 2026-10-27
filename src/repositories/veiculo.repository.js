const fs = require('fs/promises');
const path = require('path');

const CAMINHO_PADRAO = path.join(__dirname, '..', '..', 'data', 'veiculos.json');

class VeiculoRepository {
  constructor(caminhoArquivo = CAMINHO_PADRAO) {
    this.caminhoArquivo = caminhoArquivo;
    this.fila = Promise.resolve();
  }

  async _ler() {
    try {
      const conteudo = await fs.readFile(this.caminhoArquivo, 'utf-8');
      return JSON.parse(conteudo);
    } catch (erro) {
      if (erro.code === 'ENOENT') return [];
      throw erro;
    }
  }

  async _gravar(veiculos) {
    await fs.mkdir(path.dirname(this.caminhoArquivo), { recursive: true });
    await fs.writeFile(this.caminhoArquivo, JSON.stringify(veiculos, null, 2), 'utf-8');
  }

  _enfileirar(tarefa) {
    const execucao = this.fila.then(tarefa);
    this.fila = execucao.catch(() => {});
    return execucao;
  }

  lerTodos() {
    return this._enfileirar(() => this._ler());
  }

  modificar(fn) {
    return this._enfileirar(async () => {
      const veiculos = await this._ler();
      const resultado = await fn(veiculos);
      await this._gravar(veiculos);
      return resultado;
    });
  }
}

module.exports = VeiculoRepository;
