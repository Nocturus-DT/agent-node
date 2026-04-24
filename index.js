require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const FlowManager = require('./script/FlowManager');
const CommandParser = require('./script/CommandParser');
const Logger = require('./script/Logger');

const DEV_MODE = process.env.DEV_MODE === 'true';
const APP_VERSION = process.env.APP_VERSION || '0.0.0';

const manager = new FlowManager({ devMode: DEV_MODE, appVersion: APP_VERSION });
const parser = new CommandParser(manager);

function loadFiles(dir) {
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      loadFiles(fullPath); // recursivo
    } else if (/\.ya?ml$/i.test(file)) {
      manager._loadFile(fullPath); // ← arquivo individual, não diretório
    }
  });
}

loadFiles(path.join(__dirname, 'automations'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

Logger.banner(DEV_MODE, APP_VERSION, manager.listFlows());

rl.on('line', (line) => {
  parser.handle(line.trim());
});

rl.on('close', () => {
  Logger.info('Sessão encerrada.');
  process.exit(0);
});
