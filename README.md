# Miniverso

Base do projeto acadêmico de Programação Avançada para Web.

O projeto apresenta a essência da Miniverso, seu portfólio e, futuramente, uma área restrita para gerenciamento de projetos. A aplicação será responsiva, acessível, dinâmica e instalável como PWA.

## Tecnologias desta primeira etapa

- Vue.js com Vite no frontend
- Three.js na abertura 3D (planeta Miniverso)
- Node.js no backend
- Git para versionamento
- Visual Studio Code como editor

## Estrutura

```text
miniverso/
├── frontend/    # Landing page, portfólio e PWA
├── backend/     # API em Node.js
└── .vscode/     # Recomendações para o VS Code
```

## Como executar no Visual Studio Code

Antes de começar, instale uma versão LTS atual do Node.js. Depois, abra **a pasta `miniverso`** no Visual Studio Code e use o terminal integrado.

Na primeira vez:

```bash
npm install
```

Em um terminal, execute o frontend:

```bash
npm run dev:frontend
```

Em outro terminal, execute o backend:

```bash
npm run dev:backend
```

- Frontend: `http://localhost:5187`
- Backend: `http://localhost:3000`
- Verificação da API: `http://localhost:3000/api/health`

## Testes

```bash
npm test --workspace frontend
```

## Abertura 3D (planeta Miniverso)

A Home começa com uma abertura 3D: o óculos de realidade virtual, a entrada pelo visor e um pequeno planeta com áreas de São Luís e do Maranhão, cada uma com uma interação. O código fica em `frontend/src/three` e o componente em `frontend/src/components/MiniversoIntro.vue`.

Para mudar as cores do planeta, edite `frontend/src/three/world/palette.js`. Guia completo, estrutura dos arquivos e pendências em [`docs/PLANETA_MINIVERSO.md`](docs/PLANETA_MINIVERSO.md).

As fontes da marca (Thunder nos títulos e Random Grotesque nos textos) ficam em `frontend/src/assets/fonts` e são declaradas em `frontend/src/assets/styles/fonts.css`.

## Conferir o PWA em produção

```bash
npm run build
npm run preview
```

O modo de desenvolvimento é suficiente durante a implementação. O funcionamento offline deve ser conferido após gerar a versão de produção.

## Escopo atual

Esta é somente a fundação do projeto. Login real, banco de dados e dashboard serão implementados quando os requisitos dessas etapas estiverem definidos.

## Conformidade, LGPD e acessibilidade

A avaliação preventiva dos 17 critérios jurídicos, de privacidade, conteúdo e acessibilidade está registrada em [`docs/CONFORMIDADE_LEGAL_LGPD_ACESSIBILIDADE.md`](docs/CONFORMIDADE_LEGAL_LGPD_ACESSIBILIDADE.md).

O login e o dashboard atuais são demonstrações locais. Eles não devem receber dados reais de clientes nem ser apresentados como autenticação segura de produção.
