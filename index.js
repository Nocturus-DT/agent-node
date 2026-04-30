require('dotenv').config();

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const FlowManager   = require('./script/FlowManager');
const CommandParser  = require('./script/CommandParser');
const Logger        = require('./script/Logger');
const { boot }      = require('./script/Boot');

// ── Configuração ────────────────────────────────────────────
const DEV_MODE        = process.env.DEV_MODE === 'true';
const APP_VERSION     = process.env.APP_VERSION || '0.0.0';
const SRC_DIR         = path.join(__dirname, 'script');
const AUTOMATIONS_DIR = path.join(__dirname, 'automations');

// ── Instâncias ──────────────────────────────────────────────
const manager = new FlowManager({ devMode: DEV_MODE, appVersion: APP_VERSION });
const parser  = new CommandParser(manager, AUTOMATIONS_DIR);

// ── Boot ────────────────────────────────────────────────────
(async () => {
  const result = await boot({
    srcDir:         SRC_DIR,
    automationsDir: AUTOMATIONS_DIR,
    appVersion:     APP_VERSION,
    devMode:        DEV_MODE,
    manager,
  });

  if (!result.ok) process.exit(1);

  // ── Terminal ──────────────────────────────────────────────
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  rl.on('line', (line) => parser.handle(line.trim()));
  rl.on('close', () => {
    Logger.info('Sessão encerrada.');
    process.exit(0);
  });
})();
