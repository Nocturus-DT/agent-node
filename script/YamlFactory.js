const fs   = require('fs');
const path = require('path');

const CONTROL_FILE = 'control.json';
const REQUIRED_YAML_SCHEMA = '1.0';

/**
 * YamlFactory
 * Handles creation of new YAML flows and management of control.json.
 */
class YamlFactory {
  /**
   * @param {string} automationsDir - absolute path to automations folder
   */
  constructor(automationsDir) {
    this.automationsDir = automationsDir;
    this.controlPath    = path.join(automationsDir, CONTROL_FILE);
  }

  // ─────────────────────────────────────────────
  // control.json helpers
  // ─────────────────────────────────────────────

  /**
   * Reads control.json. Returns { yamls: [] } if not found or invalid.
   */
  readControl() {
    if (!fs.existsSync(this.controlPath)) return { yamls: [] };
    try {
      return JSON.parse(fs.readFileSync(this.controlPath, 'utf8'));
    } catch {
      return { yamls: [] };
    }
  }

  /**
   * Writes control.json back to disk.
   * @param {object} control
   */
  writeControl(control) {
    fs.writeFileSync(
      this.controlPath,
      JSON.stringify(control, null, 2),
      'utf8'
    );
  }

  // ─────────────────────────────────────────────
  // Next ID
  // ─────────────────────────────────────────────

  /**
   * Determines the next available 6-digit YAML ID.
   * Checks both control.json entries AND existing folders.
   * @returns {string} e.g. "000002"
   */
  nextId() {
    const control  = this.readControl();
    const fromControl = (control.yamls || []).map((y) => parseInt(y.id, 10)).filter(Number.isFinite);

    const fromFolders = fs.existsSync(this.automationsDir)
      ? fs.readdirSync(this.automationsDir)
          .filter((f) => /^\d+$/.test(f) && fs.statSync(path.join(this.automationsDir, f)).isDirectory())
          .map((f) => parseInt(f, 10))
      : [];

    const all = [...fromControl, ...fromFolders];
    const max = all.length > 0 ? Math.max(...all) : -1;
    return String(max + 1).padStart(6, '0');
  }

  // ─────────────────────────────────────────────
  // Create YAML
  // ─────────────────────────────────────────────

  /**
   * Creates a new YAML flow: folder + yaml file + control.json entry.
   * @returns {{ ok: boolean, id: string, message: string }}
   */
  createYaml() {
    const id        = this.nextId();
    const folderPath = path.join(this.automationsDir, id);
    const yamlPath   = path.join(folderPath, `${id}.yaml`);

    // Create folder
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Create YAML file with base template
    const template = this._template(id);
    fs.writeFileSync(yamlPath, template, 'utf8');

    // Register in control.json
    const control = this.readControl();
    if (!control.yamls) control.yamls = [];

    control.yamls.push({
      id,
      path:          `${id}/${id}.yaml`,
      priority:      0,
      schemaVersion: REQUIRED_YAML_SCHEMA,
      description:   `Fluxo ${id}`,
    });

    this.writeControl(control);

    return { ok: true, id, message: `YAML ${id} criado com sucesso.` };
  }

  // ─────────────────────────────────────────────
  // Set Priority
  // ─────────────────────────────────────────────

  /**
   * Updates the priority of a YAML entry in control.json.
   * @param {string} yamlId
   * @param {number} priority
   * @returns {{ ok: boolean, message: string }}
   */
  setPriority(yamlId, priority) {
    const id = String(yamlId).trim();

    if (!Number.isInteger(priority) || priority < 0) {
      return { ok: false, message: `Prioridade inválida: "${priority}". Use um número inteiro >= 0.` };
    }

    const control = this.readControl();
    if (!control.yamls || control.yamls.length === 0) {
      return { ok: false, message: 'control.json vazio ou não encontrado.' };
    }

    const entry = control.yamls.find((y) => String(y.id) === id);
    if (!entry) {
      return { ok: false, message: `YAML "${id}" não encontrado no control.json.` };
    }

    const old = entry.priority;
    entry.priority = priority;
    this.writeControl(control);

    return {
      ok: true,
      message: `Prioridade do YAML "${id}" atualizada: ${old} → ${priority}.`,
    };
  }

  // ─────────────────────────────────────────────
  // Template
  // ─────────────────────────────────────────────

  /**
   * Returns the base YAML template string for a new flow.
   * @param {string} id
   */
  _template(id) {
    return `ID: Flow_${id}
YAML_ID: "${id}"
Name: Novo Fluxo ${id}
DI: Descrição do fluxo ${id}.
MS: >
  Mensagem principal do fluxo ${id}.
  Envie 1 para a primeira opção
  ou 0 para voltar.

Options:
  - ID: "01"
    Name: Primeira Opção
    DI: Descrição da primeira opção.
    MS: >
      Você selecionou a primeira opção.
      Digite 0 para voltar.
`;
  }
}

module.exports = YamlFactory;
