# Gestão de Veículos — API REST em Node.js

API para cadastro de veículos (CRUD), com busca por modelo e exclusão lógica ou definitiva.
Desenvolvida com Express, persistência em arquivo JSON e testes com Jest e Supertest.

## Como rodar

```bash
npm install
npm start        # sobe a API em http://localhost:3000
npm run dev      # mesmo que start, reiniciando ao salvar arquivos
npm test         # executa os testes automatizados
```

Os dados ficam em `data/veiculos.json` (criado automaticamente no primeiro cadastro).

## Modelo de dados

| Campo            | Tipo    | Regra                                                         |
|------------------|---------|---------------------------------------------------------------|
| `id`             | string  | UUID gerado pela API                                          |
| `placa_veiculo`  | string  | Formato antigo (ABC1234) ou Mercosul (ABC1D23); normalizada para maiúsculas |
| `modelo_veiculo` | string  | Obrigatório, não vazio                                        |
| `preco_veiculo`  | number  | Maior que zero                                                |
| `excluido`       | boolean | Controle interno da exclusão lógica                           |

## Endpoints

| Método   | Rota                          | Descrição                                   | Sucesso |
|----------|-------------------------------|---------------------------------------------|---------|
| `POST`   | `/veiculos`                   | Cadastra um veículo                         | 201     |
| `GET`    | `/veiculos`                   | Lista os veículos ativos                    | 200     |
| `GET`    | `/veiculos/busca?modelo=gol`  | Busca por trecho do modelo (sem diferenciar maiúsculas) | 200 |
| `GET`    | `/veiculos/:id`               | Consulta um veículo                         | 200     |
| `PUT`    | `/veiculos/:id`               | Atualiza um veículo (os 3 campos são obrigatórios) | 200 |
| `DELETE` | `/veiculos/:id`               | Exclusão lógica (padrão)                    | 204     |
| `DELETE` | `/veiculos/:id?tipo=definitivo` | Exclusão definitiva                       | 204     |

Exemplo de corpo para `POST` e `PUT`:

```json
{
  "placa_veiculo": "ABC1D23",
  "modelo_veiculo": "Gol G5",
  "preco_veiculo": 30000
}
```

### Erros

Todos os erros respondem em JSON no formato `{ "erro": "mensagem" }`.

| Status | Quando                                                                 |
|--------|------------------------------------------------------------------------|
| 400    | Dados inválidos, JSON malformado, busca sem `modelo`, `tipo` de exclusão desconhecido |
| 404    | Veículo inexistente (ou excluído logicamente) / rota inexistente       |
| 409    | Já existe um veículo ativo com a mesma placa                           |
| 500    | Erro inesperado (detalhes só no log do servidor)                       |

## Regra de negócio: exclusão lógica ou definitiva

- **Lógica (padrão):** o registro continua no arquivo com `excluido: true` e passa a ser tratado como inexistente
  (some da listagem e da busca; consulta por id retorna 404).
- **Definitiva (`?tipo=definitivo`):** o registro é removido do arquivo.
- Cadastrar novamente a placa de um veículo excluído logicamente cria um **registro novo**; o antigo permanece como histórico.
  Por isso a placa é única apenas entre os veículos ativos.

## Arquitetura

```
src/
  routes/        define as rotas e liga cada uma ao controller
  controllers/   camada HTTP: lê a requisição e devolve a resposta
  services/      regras de negócio (validação, unicidade, exclusão)
  validators/    validação e normalização dos dados
  repositories/  persistência em JSON (leitura/escrita assíncronas)
  middlewares/   tratamento centralizado de erros
  errors/        AppError (erro com status HTTP)
  app.js         monta a aplicação ligando as camadas
  server.js      inicia o servidor
tests/           testes unitários (service) e de integração (API)
```

Decisões de projeto:

- **Assincronismo:** toda a E/S usa `async/await` com `fs/promises`.
- **Escrita segura no JSON:** as operações do repositório passam por uma fila, e a checagem de regra
  junto com a gravação acontece numa única tarefa. Isso evita corrupção do arquivo e placas duplicadas
  em requisições simultâneas.
- **Tratamento de exceção:** os erros esperados são lançados como `AppError` e convertidos em resposta
  HTTP em um único lugar (`errorHandler`).
