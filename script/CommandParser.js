const Renderer = require('./Renderer');
const Logger = require('./Logger');

/**
 * CommandParser
 * Parses raw terminal input and dispatches actions to FlowManager.
 *
 * Global commands (always available):
 *   start <yaml_id>   → start a flow session
 *   stop <yaml_id>    → stop a flow session
 *   list              → list available flows
 *   active            → list active sessions
 *   help              → show help
 *
 * Session commands (when inside a flow):
 *   <number>          → navigate to option (in the LAST active session if only one)
 *   0                 → go back
 *   !0                → go to root
 *
 * Multi-session navigation prefix:
 *   <yaml_id>:<input> → send input to a specific session
 */
class CommandParser {
  /**
   * @param {import('./FlowManager')} manager
   */
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Main entry point for all user input.
   * @param {string} raw
   */
  handle(raw) {
    if (!raw) return;

    const lower = raw.toLowerCase();

    // ── Global commands ──────────────────────────────────
    if (lower === 'help') return this._showHelp();
    if (lower === 'list') return this._listFlows();
    if (lower === 'active') return this._listActive();

    const startMatch = raw.match(/^start\s+(\S+)$/i);
    if (startMatch) return this._start(startMatch[1]);

    const stopMatch = raw.match(/^stop\s+(\S+)$/i);
    if (stopMatch) return this._stop(stopMatch[1]);

    // ── Session input ────────────────────────────────────
    // Prefixed: "000001:01"  or  "000001:0"  etc.
    const prefixed = raw.match(/^(\S+):(.+)$/);
    if (prefixed) return this._routeInput(prefixed[1], prefixed[2].trim());

    // Unprefixed — route to the single active session or warn
    const active = this.manager.listActiveSessions();
    if (active.length === 0) {
      Logger.info('Nenhuma sessão ativa. Use "start <yaml_id>" para iniciar.');
      return;
    }
    if (active.length === 1) {
      return this._routeInput(active[0], raw);
    }

    // Multiple sessions open — require prefix
    Logger.info(`Múltiplas sessões ativas: ${active.join(', ')}\nUse o prefixo "<yaml_id>:<comando>" para direcionar o input.`);
  }

  // ─────────────────────────────────────────────
  // Global command handlers
  // ─────────────────────────────────────────────

  _start(yamlId) {
    const result = this.manager.start(yamlId);
    if (!result.ok) {
      Logger.error(result.message);
      return;
    }

    const node = this.manager.current(yamlId);
    Renderer.showMenu(node, yamlId, this.manager);
  }

  _stop(yamlId) {
    const result = this.manager.stop(yamlId);
    if (!result.ok) {
      Logger.error(result.message);
      return;
    }
    Logger.info(`Sessão [${yamlId}] encerrada.`);
  }

  _listFlows() {
    const flows = this.manager.listFlows();
    if (flows.length === 0) {
      Logger.info('Nenhum fluxo carregado.');
      return;
    }
    Logger.info('Fluxos disponíveis:\n' + flows.map((id) => `  • ${id}`).join('\n'));
  }

  _listActive() {
    const active = this.manager.listActiveSessions();
    if (active.length === 0) {
      Logger.info('Nenhuma sessão ativa.');
      return;
    }
    Logger.info('Sessões ativas:\n' + active.map((id) => `  • ${id}`).join('\n'));
  }

  _showHelp() {
    Logger.raw(`
┌─────────────────────────────────────────────┐
│                    AJUDA                    │
├─────────────────────────────────────────────┤
│  start <yaml_id>   Inicia um fluxo          │
│  stop  <yaml_id>   Encerra um fluxo         │
│  list              Lista fluxos carregados   │
│  active            Lista sessões ativas      │
│  help              Exibe esta ajuda          │
├─────────────────────────────────────────────┤
│  Dentro de uma sessão:                       │
│  <número>          Navega para a opção       │
│  0                 Volta um nível            │
│  !0                Volta ao menu principal   │
├─────────────────────────────────────────────┤
│  Com múltiplas sessões abertas:              │
│  <yaml_id>:<cmd>   Direciona input           │
│  Ex: 000001:01     000002:0                  │
└─────────────────────────────────────────────┘
`);
  }

  // ─────────────────────────────────────────────
  // Session navigation
  // ─────────────────────────────────────────────

  /**
   * Routes a navigation input to a specific session.
   * @param {string} yamlId
   * @param {string} input
   */
  _routeInput(yamlId, input) {
    if (!this.manager.listActiveSessions().includes(yamlId)) {
      Logger.error(`Sessão "${yamlId}" não está ativa. Use "start ${yamlId}".`);
      return;
    }

    // Back to root
    if (input === '!0') {
      const node = this.manager.reset(yamlId);
      return Renderer.showMenu(node, yamlId, this.manager);
    }

    // Back one level
    if (input === '0') {
      const node = this.manager.back(yamlId);
      return Renderer.showMenu(node, yamlId, this.manager);
    }

    // Navigate to option
    const result = this.manager.navigate(yamlId, input);
    if (!result.ok) {
      Logger.warn(result.message);
      return;
    }

    Renderer.showMenu(result.node, yamlId, this.manager);
  }
}

module.exports = CommandParser;
