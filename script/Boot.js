const fs   = require('fs');
const path = require('path');

// ── Versão mínima de esquema YAML aceita pelo runtime ──
const REQUIRED_YAML_SCHEMA = '1.0';

// ── Módulos que serão verificados na inicialização ──
const REQUIRED_MODULES = [
  'CommandParser.js',
  'FlowManager.js',
  'Logger.js',
  'Renderer.js',
];

// ── Cores ANSI ──
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  white:  '\x1b[97m',
};

// ── Helpers de output ──
const print  = (msg) => process.stdout.write(msg + '\n');
const ok     = (msg) => print(`  ${C.green}✔${C.reset}  ${msg}`);
const warn   = (msg) => print(`  ${C.yellow}⚠${C.reset}  ${msg}`);
const err    = (msg) => print(`  ${C.red}✖${C.reset}  ${msg}`);
const step   = (msg) => print(`${C.cyan}${msg}${C.reset}`);
const detail = (msg) => print(`${C.gray}     ${msg}${C.reset}`);

/**
 * Pausa artificial para dar ritmo visual à inicialização.
 * @param {number} ms
 */
function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Compara duas versões semânticas simples (major.minor).
 * Retorna true se `actual` atende ao mínimo requerido.
 * @param {string} actual
 * @param {string} required
 */
function versionMeets(actual, required) {
  if (!actual) return true; // sem versão declarada, aceita
  
  const parse = (v) => String(v).split('.').map(Number);
  const [aMaj, aMin = 0] = parse(actual);
  const [rMaj, rMin = 0] = parse(required);
  
  if (aMaj !== rMaj) return aMaj > rMaj;  // major diferente: precisa ser maior
  return aMin >= rMin;                     // mesmo major: minor precisa ser >=
}

/**
 * Executa a sequência completa de boot.
 *
 * @param {{
 *   srcDir: string,
 *   automationsDir: string,
 *   appVersion: string,
 *   devMode: boolean,
 *   manager: import('./FlowManager'),
 * }} opts
 *
 * @returns {Promise<{ ok: boolean, loadedYamls: string[] }>}
 */
async function boot({ srcDir, automationsDir, appVersion, devMode, manager }) {
  let fatalError = false;
  const loadedYamls = [];

  // ── Banner ───────────────────────────────────────────
  print('');
  print(`${C.bold}${C.white}  Iniciando...${C.reset}`);
  await wait(300);

  // ────────────────────────────────────────────────────
  // 1. INTEGRIDADE DOS MÓDULOS
  // ────────────────────────────────────────────────────
  step('\n  Iniciando scripts...');
  await wait(200);

  let modulesFailed = 0;
  for (const mod of REQUIRED_MODULES) {
    const filePath = path.join(srcDir, mod);
    process.stdout.write(`  ${C.dim}Conferindo integridade do ${mod}...${C.reset}`);
    await wait(120);

    if (fs.existsSync(filePath)) {
      process.stdout.write(`\r${C.green}  ✔${C.reset}  Conferindo integridade do ${mod}... ${C.green}OK${C.reset}\n`);
    } else {
      process.stdout.write(`\r${C.red}  ✖${C.reset}  Conferindo integridade do ${mod}... ${C.red}NÃO ENCONTRADO${C.reset}\n`);
      modulesFailed++;
    }
  }

  if (modulesFailed === 0) {
    ok('Scripts prontos!');
  } else {
    err(`${modulesFailed} módulo(s) ausente(s) — o sistema pode ser instável.`);
  }

  await wait(300);

  // ────────────────────────────────────────────────────
  // 2. LEITURA DO ARQUIVO DE CONTROLE
  // ────────────────────────────────────────────────────
  const controlPath = path.join(automationsDir, 'control.json');
  let control = { yamls: [] };

  if (fs.existsSync(controlPath)) {
    try {
      control = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
    } catch (e) {
      warn(`control.json inválido: ${e.message} — usando padrão.`);
    }
  } else {
    warn('control.json não encontrado — carregando todos os YAMLs em ordem numérica.');
  }

  // ────────────────────────────────────────────────────
  // 3. CARREGAMENTO DOS YAMLS
  // ────────────────────────────────────────────────────
  step('\n  Iniciando YAMLs...');
  await wait(200);

  // Constrói a lista de entradas a carregar, respeitando prioridade
  const entries = _resolveLoadOrder(automationsDir, control);

  let yamlErrors = 0;

  for (const entry of entries) {
    const label  = entry.id || path.basename(entry.path);
    const prefix = `  Localizado o YAML ${label}`;

    process.stdout.write(`${C.dim}${prefix}...${C.reset}`);
    await wait(150);

    // Validação de versão de esquema
    if (entry.schemaVersion) {
      if (!versionMeets(entry.schemaVersion, REQUIRED_YAML_SCHEMA)) {
        process.stdout.write(
          `\r${C.red}  ✖${C.reset}  YAML ${label} ${C.red}DESATUALIZADO${C.reset}` +
          ` (schema ${entry.schemaVersion} < requerido ${REQUIRED_YAML_SCHEMA})\n`
        );
        warn(`   YAML "${label}" não será carregado.`);
        yamlErrors++;
        continue;
      }
    }

    // Tenta carregar
    const before = manager.listFlows().length;
    manager._loadFile(entry.path);
    const after  = manager.listFlows().length;

    if (after > before) {
      process.stdout.write(`\r${C.green}  ✔${C.reset}  Localizado o YAML ${label}... ${C.green}OK${C.reset}\n`);
      loadedYamls.push(label);
    } else {
      process.stdout.write(`\r${C.yellow}  ⚠${C.reset}  YAML ${label} não pôde ser carregado (verifique o arquivo).\n`);
      yamlErrors++;
    }
  }

  if (loadedYamls.length > 0 && yamlErrors === 0) {
    ok('YAMLs prontos!');
  } else if (loadedYamls.length > 0) {
    warn(`YAMLs prontos! (${yamlErrors} ignorado(s))`);
  } else {
    err('Nenhum YAML carregado.');
    fatalError = true;
  }

  await wait(300);

  // ────────────────────────────────────────────────────
  // 4. FINALIZAÇÃO
  // ────────────────────────────────────────────────────
  step('\n  Finalizando inicialização...');
  await wait(400);

  print('');

  if (!fatalError) {
    print(`${C.bold}${C.green}  Código está online${C.reset}`);
    print(`  Versão: ${C.cyan}${appVersion}${C.reset}`);
    if (devMode) print(`  ${C.yellow}[DEV MODE ATIVO]${C.reset}`);
  } else {
    print(`${C.bold}${C.red}  Inicialização falhou.${C.reset}`);
    print(`  Verifique os erros acima e reinicie.`);
  }

  print('');
  return { ok: !fatalError, loadedYamls };
}

// ────────────────────────────────────────────────────────────
// Helpers internos
// ────────────────────────────────────────────────────────────

/**
 * Monta a lista de arquivos YAML a carregar, ordenada por prioridade
 * (maior prioridade primeiro) e, dentro da mesma prioridade, por ID numérico.
 *
 * Se não houver control.json, escaneia o diretório automaticamente.
 *
 * @param {string} automationsDir
 * @param {{ yamls: Array }} control
 * @returns {Array<{ id: string, path: string, priority: number, schemaVersion?: string }>}
 */
function _resolveLoadOrder(automationsDir, control) {
  let entries = [];

  if (control.yamls && control.yamls.length > 0) {
    entries = control.yamls.map((entry) => ({
      id:            String(entry.id || ''),
      // Caminho: automations/000000/000000.yaml
      path:          path.isAbsolute(entry.path)
                       ? entry.path
                       : path.join(automationsDir, entry.path),
      priority:      Number(entry.priority ?? 0),
      schemaVersion: entry.schemaVersion || null,
    }));
  } else {
    // Fallback: escaneia subpastas automaticamente
    if (!fs.existsSync(automationsDir)) return [];

    const folders = fs.readdirSync(automationsDir).filter((f) => {
      return fs.statSync(path.join(automationsDir, f)).isDirectory();
    });

    for (const folder of folders.sort()) {
      const folderPath = path.join(automationsDir, folder);
      const yamlFile   = path.join(folderPath, `${folder}.yaml`);
      const ymlFile    = path.join(folderPath, `${folder}.yml`);
      const found      = fs.existsSync(yamlFile) ? yamlFile
                       : fs.existsSync(ymlFile)  ? ymlFile
                       : null;

      if (found) {
        entries.push({ id: folder, path: found, priority: 0, schemaVersion: null });
      }
    }
  }

  return entries.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

module.exports = { boot, REQUIRED_YAML_SCHEMA };
