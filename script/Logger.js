const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const RED   = '\x1b[31m';
const GRAY  = '\x1b[90m';

class Logger {
  static info(msg)  { console.log(`${CYAN}ℹ${RESET}  ${msg}`); }
  static warn(msg)  { console.log(`${YELLOW}⚠${RESET}  ${msg}`); }
  static error(msg) { console.log(`${RED}✖${RESET}  ${msg}`); }
  static raw(msg)   { console.log(msg); }

  static debug(devMode, msg) {
    if (devMode) console.log(`${GRAY}[DEV] ${msg}${RESET}`);
  }

  static banner(devMode, appVersion, flowIds) {
    const flows = flowIds.length > 0
      ? flowIds.map((id) => `  • ${id}`).join('\n')
      : '  (nenhum)';

    console.log(`
${BOLD}${CYAN}╔══════════════════════════════════════════════╗
║           AUTOMATION FLOW RUNNER             ║
╚══════════════════════════════════════════════╝${RESET}
  Versão: ${appVersion}${devMode ? `  ${YELLOW}[DEV MODE]${RESET}` : ''}

${BOLD}Fluxos carregados:${RESET}
${flows}

${BOLD}Comandos:${RESET}
  start <yaml_id>   Inicia um fluxo
  stop  <yaml_id>   Encerra um fluxo
  list              Lista fluxos disponíveis
  active            Lista sessões ativas
  help              Exibe ajuda completa
`);
  }
}

module.exports = Logger;
