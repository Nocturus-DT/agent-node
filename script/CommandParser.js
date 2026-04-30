const path      = require('path');
const Renderer  = require('./Renderer');
const Logger    = require('./Logger');
const YamlFactory = require('./YamlFactory');

/**
 * CommandParser
 * Parses raw terminal input and dispatches actions to FlowManager.
 *
 * Global commands (always available):
 *   start <yaml_id>                     → start a flow session
 *   stop  <yaml_id>                     → stop a flow session
 *   list                                → list available flows
 *   active                              → list active sessions
 *   help                                → show help
 *   create yaml                         → create next numbered YAML
 *   priority yaml set <id> <número>     → set YAML priority in control.json
 *
 * Session commands (when inside a flow):
 *   <number>          → navigate to option
 *   0                 → go back
 *   !0                → go to root
 *
 * Multi-session navigation prefix:
 *   <yaml_id>:<input> → send input to a specific session
 */
class CommandParser {
  /**
   * @param {import('./FlowManager')} manager
   * @param {string} automationsDir
   */
  constructor(manager, automationsDir) {
    this.manager  = manager;
    this.factory  = new YamlFactory(
      automationsDir || path.join(__dirname, '..', 'automations')
    );
  }

  /**
   * Main entry point for all user input.
   * @param {string} raw
   */
  handle(raw) {
    if (!raw) return;

    const lower = raw.toLowerCase().trim();

    // ── Global commands ──────────────────────────────────
    if (lower === 'help')   return this._showHelp();
    if (lower === 'list')   return this._listFlows();
    if (lower === 'active') return this._listActive();

    // create yaml
    if (lower === 'create yaml') return this._createYaml();

    // priority yaml set <id> <número>
    const priorityMatch = raw.match(/^priority\s+yaml\s+set\s+(\S+)\s+(\d+)$/i);
    if (priorityMatch) return this._setPriority(priorityMatch[1], parseInt(priorityMatch[2], 10));

    // start <id>
    const startMatch = raw.match(/^start\s+(\S+)$/i);
    if (startMatch) return this._start(startMatch[1]);

    // stop <id>
    const stopMatch = raw.match(/^stop\s+(\S+)$/i);
    if (stopMatch) return this._stop(stopMatch[1]);

    // ── Session input ────────────────────────────────────
    // Prefixed: "000001:01"
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

    Logger.info(`Múltiplas sessões ativas: ${active.join(', ')}\nUse o prefixo "<yaml_id>:<comando>" para direcionar o input.`);
  }

  // ─────────────────────────────────────────────
  // Global command handlers
  // ─────────────────────────────────────────────

  _start(yamlId) {
    const result = this.manager.start(yamlId);
    if (!result.ok) { Logger.error(result.message); return; }
    const node = this.manager.current(yamlId);
    Renderer.showMenu(node, yamlId, this.manager);
  }

  _stop(yamlId) {
    const result = this.manager.stop(yamlId);
    if (!result.ok) { Logger.error(result.message); return; }
    Logger.info(`Sessão [${yamlId}] encerrada.`);
  }

  _listFlows() {
    const flows = this.manager.listFlows();
    if (flows.length === 0) { Logger.info('Nenhum fluxo carregado.'); return; }
    Logger.info('Fluxos disponíveis:\n' + flows.map((id) => `  • ${id}`).join('\n'));
  }

  _listActive() {
    const active = this.manager.listActiveSessions();
    if (active.length === 0) { Logger.info('Nenhuma sessão ativa.'); return; }
    Logger.info('Sessões ativas:\n' + active.map((id) => `  • ${id}`).join('\n'));
  }

  _createYaml() {
    Logger.info('Criando novo YAML...');
    const result = this.factory.createYaml();
    if (!result.ok) {
      Logger.error(result.message);
      return;
    }
    Logger.info(`✔  YAML ${result.id} criado em automations/${result.id}/${result.id}.yaml`);
    Logger.info(`   Registrado no control.json com prioridade 0.`);
    Logger.info(`   Use "start ${result.id}" após reiniciar para executá-lo.`);
  }

  _setPriority(yamlId, priority) {
    const result = this.factory.setPriority(yamlId, priority);
    if (!result.ok) {
      Logger.error(result.message);
      return;
    }
    Logger.info(result.message);
    Logger.info(`   A nova ordem entrará em vigor no próximo reinício.`);
  }

  _showHelp() {
    Logger.raw(`
┌──────────────────────────────────────────────────────┐
│                       AJUDA                          │
├──────────────────────────────────────────────────────┤
│  start <yaml_id>               Inicia um fluxo       │
│  stop  <yaml_id>               Encerra um fluxo      │
│  list                          Lista fluxos           │
│  active                        Lista sessões ativas   │
│  help                          Exibe esta ajuda       │
├──────────────────────────────────────────────────────┤
│  create yaml                   Cria próximo YAML      │
│  priority yaml set <id> <n>    Define prioridade      │
│    Ex: priority yaml set 000001 2                     │
├──────────────────────────────────────────────────────┤
│  Dentro de uma sessão:                                │
│  <número>      Navega para a opção                    │
│  0             Volta um nível                         │
│  !0            Volta ao menu principal                │
├──────────────────────────────────────────────────────┤
│  Com múltiplas sessões abertas:                       │
│  <yaml_id>:<cmd>   Direciona input                    │
│  Ex: 000001:01     000002:0                           │
└──────────────────────────────────────────────────────┘
`);
  }

  // ─────────────────────────────────────────────
  // Session navigation
  // ─────────────────────────────────────────────

  _routeInput(yamlId, input) {
    if (!this.manager.listActiveSessions().includes(yamlId)) {
      Logger.error(`Sessão "${yamlId}" não está ativa. Use "start ${yamlId}".`);
      return;
    }

    if (input === '!0') {
      const node = this.manager.reset(yamlId);
      return Renderer.showMenu(node, yamlId, this.manager);
    }

    if (input === '0') {
      const node = this.manager.back(yamlId);
      return Renderer.showMenu(node, yamlId, this.manager);
    }

    const result = this.manager.navigate(yamlId, input);
    if (!result.ok) { Logger.warn(result.message); return; }

    Renderer.showMenu(result.node, yamlId, this.manager);
  }
}

module.exports = CommandParser;
