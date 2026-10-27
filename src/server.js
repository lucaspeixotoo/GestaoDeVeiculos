const criarApp = require('./app');

const PORTA = process.env.PORT || 3000;

criarApp().listen(PORTA, () => {
  console.log(`API de veículos rodando em http://localhost:${PORTA}`);
});
