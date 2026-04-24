const Logger = require('./Logger');

const DIVIDER = '─'.repeat(48);

/**
 * Renderer
 * Handles all terminal output for flow menus.
 */
class Renderer {
  /**
   * Renders a flow node as a menu.
   * @param {object} node
   * @param {string} yamlId
   * @param {import('./FlowManager')} manager
   */
  static showMenu(node, yamlId, manager) {
    if (!node) return;

    console.clear();

    // Header
    console.log(`\n${DIVIDER}`);
    console.log(` Sessão: [${yamlId}]  Fluxo: ${node.Name || '—'}`);
    console.log(`${DIVIDER}`);

    // Message
    const message = manager.interpolate(node.MS || '');
    console.log(`\n${message.trim()}\n`);

    // Options
    if (node.Options && node.Options.length > 0) {
      console.log(`${DIVIDER}`);
      node.Options.forEach((opt) => {
        console.log(`  ${opt.ID}  ${opt.Name}`);
      });
      console.log(`${DIVIDER}`);
      console.log('  0   Voltar  |  !0  Menu principal  |  stop <id>  Encerrar\n');
    } else {
      console.log(`${DIVIDER}`);
      console.log('  0   Voltar  |  !0  Menu principal  |  stop <id>  Encerrar\n');
    }
  }
}

module.exports = Renderer;
