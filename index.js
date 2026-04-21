require('dotenv').config();

const fs = require('fs');
const yaml = require('js-yaml');
const readline = require('readline');

// ENV
const DEV_MODE = process.env.DEV_MODE === 'true';
const APP_VERSION = process.env.APP_VERSION || '0.0.0';

// Leitura do YAML
let flow;

try {
  const file = fs.readFileSync('./flow.yml', 'utf8');
  flow = yaml.load(file);
} catch (err) {
  console.error('Erro ao carregar o YAML:', err.message);
  process.exit(1);
}

// Terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Estado
let stack = [flow];
let isActive = false;

// Mensagem inicial
if (DEV_MODE) {
  console.log(`
Código carregado com sucesso!
Modo desenvolvedor ativado.

Digite 0 para iniciar o menu.
Digite ?0 para encerrar o menu.
`);
} else {
  console.log(`
Sistema iniciado.
Aguardando interação...
`);
}

// Mostrar menu
function showMenu(node) {
  console.clear();

  console.log(node.MS);

  if (node.Options) {
    node.Options.forEach(opt => {
      console.log(`${opt.ID} - ${opt.Name}`);
    });
  }
}

// Entrada do usuário
function handleInput(input) {
  input = input.trim();

  // Ativar menu
  if (input === '0' && !isActive) {
    isActive = true;
    stack = [flow];
    return showMenu(flow);
  }

  // Desativar menu
  if (input === '?0') {
    isActive = false;
    console.clear();
    console.log('Menu encerrado. Aguardando novo comando...');
    return;
  }

  // Se não estiver ativo, ignora tudo
  if (!isActive) {
    return;
  }

  let current = stack[stack.length - 1];

  // Voltar
  if (input === '0') {
    if (stack.length > 1) {
      stack.pop();
    }
    return showMenu(stack[stack.length - 1]);
  }

  // Voltar ao início
  if (input === '!0') {
    stack = [flow];
    return showMenu(flow);
  }

  // Navegação
  if (current.Options) {
    const formattedInput = input.padStart(2, '0');
    const next = current.Options.find(o => o.ID === formattedInput);

    if (next) {
      stack.push(next);
      return showMenu(next);
    }
  }

  console.log('Opção inválida');
}

// Loop contínuo
rl.on('line', handleInput);

