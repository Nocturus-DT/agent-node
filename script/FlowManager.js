const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Logger = require('./Logger');

/**
 * FlowManager
 * Responsible for loading all YAML automations and managing
 * active flow sessions per YAML_ID.
 */
class FlowManager {
  /**
   * @param {{ devMode: boolean, appVersion: string }} options
   */
  constructor({ devMode = false, appVersion = '0.0.0' } = {}) {
    this.devMode = devMode;
    this.appVersion = appVersion;

    /** @type {Map<string, object>} YAML_ID → root node */
    this.flows = new Map();

    /** @type {Map<string, object[]>} YAML_ID → navigation stack */
    this.sessions = new Map();
  }

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  /**
   * Loads all .yaml / .yml files from the given directory.
   * @param {string} dir
   */
  loadAll(dir) {
    if (!fs.existsSync(dir)) {
      Logger.warn(`Diretório "${dir}" não encontrado. Nenhum fluxo carregado.`);
      return;
    }

    const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f));

    if (files.length === 0) {
      Logger.warn(`Nenhum arquivo YAML encontrado em "${dir}".`);
      return;
    }

    for (const file of files) {
      this._loadFile(path.join(dir, file));
    }

    Logger.info(`${this.flows.size} fluxo(s) carregado(s).`);
  }

  /**
   * Loads a single YAML file and registers it.
   * @param {string} filePath
   */
  _loadFile(filePath) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const doc = yaml.load(raw);

      if (!doc || !doc.YAML_ID) {
        Logger.warn(`Arquivo ignorado (sem YAML_ID): ${filePath}`);
        return;
      }

      const id = String(doc.YAML_ID).trim();

      if (this.flows.has(id)) {
        Logger.warn(`YAML_ID duplicado "${id}" — arquivo ignorado: ${filePath}`);
        return;
      }

      this.flows.set(id, doc);
      Logger.debug(this.devMode, `Fluxo carregado: [${id}] ${doc.Name || '(sem nome)'} ← ${filePath}`);
    } catch (err) {
      Logger.error(`Falha ao carregar "${filePath}": ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  // Session lifecycle
  // ─────────────────────────────────────────────

  /**
   * Starts a flow session for the given YAML_ID.
   * @param {string} yamlId
   * @returns {{ ok: boolean, message: string }}
   */
  start(yamlId) {
    const id = String(yamlId).trim();

    if (!this.flows.has(id)) {
      return { ok: false, message: `Fluxo "${id}" não encontrado. IDs disponíveis: ${this.listFlows().join(', ') || 'nenhum'}` };
    }

    if (this.sessions.has(id)) {
      return { ok: false, message: `Fluxo "${id}" já está ativo.` };
    }

    const root = this.flows.get(id);
    this.sessions.set(id, [root]);

    return { ok: true, message: null };
  }

  /**
   * Stops (closes) a flow session.
   * @param {string} yamlId
   * @returns {{ ok: boolean, message: string }}
   */
  stop(yamlId) {
    const id = String(yamlId).trim();

    if (!this.sessions.has(id)) {
      return { ok: false, message: `Fluxo "${id}" não está ativo.` };
    }

    this.sessions.delete(id);
    return { ok: true, message: null };
  }

  // ─────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────

  /**
   * Returns the current node for a session.
   * @param {string} yamlId
   */
  current(yamlId) {
    const stack = this.sessions.get(yamlId);
    return stack ? stack[stack.length - 1] : null;
  }

  /**
   * Navigates into an option by numeric input.
   * @param {string} yamlId
   * @param {string} input
   * @returns {{ ok: boolean, node: object|null, message: string }}
   */
  navigate(yamlId, input) {
    const stack = this.sessions.get(yamlId);
    if (!stack) return { ok: false, node: null, message: `Sessão "${yamlId}" não está ativa.` };

    const current = stack[stack.length - 1];
    const formatted = input.padStart(2, '0');
    const next = (current.Options || []).find((o) => String(o.ID) === formatted);

    if (!next) return { ok: false, node: null, message: 'Opção inválida.' };

    stack.push(next);
    return { ok: true, node: next, message: null };
  }

  /**
   * Goes one level back in the navigation stack.
   * @param {string} yamlId
   * @returns {object|null} the new current node
   */
  back(yamlId) {
    const stack = this.sessions.get(yamlId);
    if (!stack || stack.length <= 1) return stack ? stack[0] : null;
    stack.pop();
    return stack[stack.length - 1];
  }

  /**
   * Resets navigation to the root of the flow.
   * @param {string} yamlId
   * @returns {object|null} root node
   */
  reset(yamlId) {
    const stack = this.sessions.get(yamlId);
    if (!stack) return null;
    const root = stack[0];
    this.sessions.set(yamlId, [root]);
    return root;
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  /** Returns all registered YAML_IDs */
  listFlows() {
    return [...this.flows.keys()];
  }

  /** Returns all active session YAML_IDs */
  listActiveSessions() {
    return [...this.sessions.keys()];
  }

  /** Interpolates dynamic values in a message string */
  interpolate(text) {
    return (text || '')
      .replace(/\{\{APP_VERSION\}\}/g, this.appVersion)
      .replace(/\{\{VERSION\}\}/g, this.appVersion);
  }
}

module.exports = FlowManager;
