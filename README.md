# 📌 Automação YAML com Node.js

Sistema de automação de atendimento baseado em fluxos definidos em YAML.

---

## 🚀 Objetivo

Criar um motor de automação que permite definir fluxos de atendimento sem alterar o código, utilizando arquivos `.yml`.

---

## 📂 Estrutura do Projeto

```
├── index.js        # Motor principal
├── flow.yml        # Fluxo de automação
├── .env            # Configurações do ambiente
├── package.json
```

---

## ⚙️ Configuração

### 1. Instalar dependências

```bash
npm install
```

---

### 2. Configurar ambiente

Crie um arquivo `.env`:

```env
DEV_MODE=true
APP_VERSION=0.0.0
CODE_VERSION=0.0.0
FLOW_VERSION=0.0
```

---

## ▶️ Executar o projeto

```bash
node index.js
```

ou

```bash
npm start
```

---

## 🧪 Modo Desenvolvedor

Quando `DEV_MODE=true`:

* O sistema roda apenas no terminal
* Integrações externas ficam desativadas
* Ideal para testes e desenvolvimento

Mensagem exibida:

```
Código carregado com sucesso!
Modo desenvolvedor ativado.
Funções de atendimento travadas para desenvolvimento.

Digite 0 para testar a mensagem.
```

---

## 📖 Estrutura do YAML

### Glossário

* **ID** → Identificador da opção
* **Name** → Nome exibido
* **DI** → Documentação interna
* **MS** → Mensagem exibida ao usuário
* **Options** → Submenus

---

## 🧠 Funcionalidades

* Navegação hierárquica
* Sistema de menus dinâmico
* Separação entre lógica e conteúdo
* Fácil expansão para bots (WhatsApp, Telegram, etc.)

---

## 🔮 Futuras melhorias

* Integração com APIs
* Persistência de usuários
* Variáveis dinâmicas (`{{nome}}`)
* Validação de YAML
* Interface visual para criação de fluxos

---

## 📌 Observações

Digite:

* `0` → Voltar
* `!0` → Voltar ao menu principal

---

## 📄 Licença

Uso livre para estudo e desenvolvimento.
