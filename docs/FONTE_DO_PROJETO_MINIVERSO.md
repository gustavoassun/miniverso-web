# Fonte do Projeto Miniverso

## Finalidade deste documento

Este documento reúne o contexto conhecido, os requisitos, as decisões técnicas, o estado atual e as pendências do projeto acadêmico Miniverso. Ele deve servir como fonte principal para o chat responsável pela documentação e pelo preenchimento dos relatórios do projeto.

Este arquivo não é o relatório oficial e não substitui o documento anexado pelo usuário. O arquivo oficial anexado ao chat de documentação controla a estrutura, a formatação, as perguntas, os campos que devem ser preenchidos e a versão que será editada e entregue. Esta fonte deve ser consultada apenas para fornecer contexto, fatos, evidências técnicas e histórico ao preencher aquele arquivo.

Se houver qualquer diferença entre esta fonte e o arquivo oficial, o chat deve preservar o modelo e as exigências do arquivo oficial, conferir a informação divergente com o usuário e atualizar somente a versão oficial após receber orientação suficiente.

Ao produzir relatórios, o chat deve separar claramente:

- fatos confirmados pelas fontes ou pelo código;
- funcionalidades já implementadas e verificadas;
- funcionalidades planejadas, mas ainda não desenvolvidas;
- dúvidas que ainda precisam ser respondidas pela Miniverso, pelo professor ou pela equipe.

Última verificação técnica desta fonte: 6 de setembro de 2026.

## Resumo do projeto

O trabalho está sendo desenvolvido para a empresa Miniverso na disciplina de Programação Avançada para Web. A solução proposta é uma aplicação web que apresente a empresa, comunique a essência da marca, mostre seu portfólio e permita que pessoas autorizadas gerenciem projetos em uma área restrita.

A aplicação deve funcionar como uma PWA, ser responsiva, oferecer suporte ao uso offline e considerar acessibilidade. A primeira etapa técnica usa Vue.js com Vite no frontend e Node.js no backend. O escopo tecnológico deve permanecer limitado a Vue.js e Node.js até que a equipe decida e autorize novas tecnologias.

## Contexto da Miniverso

A Miniverso trabalha com experiências imersivas e realidade virtual. As anotações do encontro citam aplicações relacionadas a treinamento profissional, saúde e neurorregulação.

O site deve ajudar a empresa a captar clientes e explicar o valor do seu trabalho. A apresentação de cada projeto deve mostrar o desafio enfrentado pela organização contratante, a solução criada pela Miniverso e o impacto ou resultado alcançado.

O objetivo central registrado pela equipe é captar a essência da marca e vender com clareza a ideia da empresa. O site [Melted Studio](https://melted.studio) foi citado pela Miniverso como referência visual. Essa referência deve orientar estudos de direção estética e interação, sem ser copiada literalmente.

## Objetivos

### Objetivo geral

Desenvolver uma aplicação web dinâmica que apresente a Miniverso, comunique sua proposta de valor, exiba seus projetos e ofereça uma área segura para gerenciamento do portfólio.

### Objetivos específicos

- Criar uma landing page que apresente a identidade e a atuação da Miniverso.
- Organizar um portfólio de projetos com desafio, solução e resultado.
- Permitir que a equipe da Miniverso cadastre e gerencie projetos por meio de login e dashboard.
- Entregar uma interface responsiva para celular, tablet e computador.
- Disponibilizar recursos essenciais offline por meio de uma PWA instalável.
- Aplicar práticas de acessibilidade, incluindo navegação por teclado, foco visível e compatibilidade semântica com tecnologias assistivas.

## Públicos previstos

### Visitantes e potenciais clientes

Precisam conhecer a empresa, entender os tipos de solução oferecidos e consultar projetos realizados. Esse público acessa a parte pública do site.

### Equipe autorizada da Miniverso

Precisa entrar em uma área restrita para cadastrar, editar, organizar e possivelmente publicar projetos. As permissões e os detalhes desse fluxo ainda precisam ser definidos.

### Professor e avaliadores

Precisam verificar o atendimento aos requisitos acadêmicos, a organização do código, a separação entre frontend e backend, o uso de Git, o funcionamento da PWA, a responsividade e a acessibilidade.

## Escopo funcional

### Parte pública

- cabeçalho com marca e navegação;
- seção principal de apresentação;
- seção sobre a essência e a proposta da Miniverso;
- portfólio de projetos;
- apresentação do desafio, da solução e do resultado de cada projeto;
- chamada para contato ou conversão, a ser definida;
- acesso à área de login.

### Parte restrita planejada

- autenticação de usuários autorizados;
- dashboard de projetos;
- cadastro de projetos;
- edição e exclusão de projetos;
- controle de publicação ou visibilidade dos projetos;
- encerramento seguro da sessão.

O login, o banco de dados e o dashboard ainda não estão implementados. Relatórios não devem apresentar essas funcionalidades como concluídas.

## Requisitos não funcionais

### Responsividade

A interface deve se adaptar a diferentes tamanhos de tela. A base atual já possui pontos de quebra para reorganizar a seção principal, o portfólio, a navegação e o rodapé em telas menores.

### PWA e funcionamento offline

A aplicação deve ser instalável e manter os recursos essenciais disponíveis sem conexão. A configuração atual usa `vite-plugin-pwa`, registro automático do service worker, manifesto em português e precache dos arquivos produzidos pelo frontend.

O funcionamento offline deve ser validado usando uma versão de produção gerada com `npm run build` e executada com `npm run preview`. O modo de desenvolvimento não é a evidência final do comportamento offline.

### Acessibilidade

A base atual inclui:

- idioma da página definido como português do Brasil;
- link para pular diretamente ao conteúdo principal;
- regiões semânticas como cabeçalho, navegação, conteúdo principal e rodapé;
- nomes acessíveis para a navegação e para seções principais;
- foco visível para navegação por teclado;
- suporte à preferência por movimento reduzido;
- indicação textual de que o botão da área restrita está desativado.

As anotações do projeto também citam alto contraste e leitor de tela como oportunidades de pontuação adicional. Ainda é necessário realizar uma auditoria completa de contraste, teclado, leitor de tela, formulários e textos alternativos quando o conteúdo final for inserido.

### Organização e manutenção

Frontend e backend ficam em pastas separadas dentro do mesmo repositório. Componentes Vue e estilos foram separados para facilitar manutenção. Credenciais, arquivos `.env`, dependências instaladas e resultados de compilação não devem ser enviados ao Git.

## Tecnologias e decisões atuais

| Área | Decisão atual | Estado |
| --- | --- | --- |
| Frontend | Vue.js 3 com Vite | Implementado |
| Backend | Node.js com servidor HTTP nativo | Implementado como base |
| PWA | `vite-plugin-pwa` e Workbox | Configurado e compilado |
| Editor principal | Visual Studio Code | Definido |
| Versionamento | Git e GitHub | Configurado |
| Banco de dados | Não definido | Pendente |
| Autenticação | Não definida | Pendente |
| Hospedagem | Não definida | Pendente |

Nenhuma tecnologia adicional deve ser tratada como escolhida sem decisão explícita da equipe.

## Estrutura atual do repositório

```text
miniverso/
|-- .vscode/
|-- backend/
|   |-- package.json
|   `-- src/server.js
|-- docs/
|   `-- FONTE_DO_PROJETO_MINIVERSO.md
|-- frontend/
|   |-- public/miniverso-icon.svg
|   |-- src/
|   |   |-- assets/styles/
|   |   |-- components/
|   |   |-- App.vue
|   |   `-- main.js
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- .gitignore
|-- package.json
|-- package-lock.json
`-- README.md
```

## Arquitetura atual

O projeto usa uma organização simples de frontend e backend no mesmo repositório.

```text
Navegador
   |
   |  interface Vue e arquivos da PWA
   v
Frontend Vite em localhost 5187
   |
   |  requisicoes com prefixo api
   v
Backend Node em localhost 3000
   |
   `-- dados temporarios em memoria ou respostas vazias
```

Durante o desenvolvimento, o Vite encaminha requisições iniciadas por `/api` para o backend em `http://localhost:3000`. Ainda não há banco de dados nem persistência de projetos.

## Componentes implementados

### Aplicação principal

O arquivo `frontend/src/App.vue` organiza o cabeçalho, a apresentação da essência, o portfólio, a área restrita futura e o rodapé. Os projetos exibidos atualmente são exemplos temporários e não podem ser tratados como casos reais confirmados da empresa.

### HeroSection

O componente `HeroSection.vue` apresenta a mensagem principal, uma chamada para conhecer os projetos e uma composição visual de órbitas. O texto atual comunica experiências imersivas ligadas a treinamento, cuidado e inovação.

### ProjectCard

O componente `ProjectCard.vue` recebe área, título e descrição por propriedades. Ele serve como base visual para os itens do portfólio.

### Estilos

Os estilos globais, da seção principal e dos cartões estão separados em arquivos CSS. A direção visual atual usa fundo azul muito escuro, texto claro, verde e coral como destaques. Essa identidade é provisória e precisa ser validada com a marca Miniverso.

## API atual

O backend usa o módulo HTTP nativo do Node.js e disponibiliza duas rotas de leitura.

| Método e rota | Resposta atual | Finalidade |
| --- | --- | --- |
| `GET /api/health` | `status: ok` e `service: miniverso-api` | Confirmar que a API está funcionando |
| `GET /api/projects` | Lista vazia de projetos | Base para futura integração do portfólio |

Rotas desconhecidas retornam o status 404 com a mensagem `Rota não encontrada`. O CORS está configurado para o frontend local na porta 5187.

## Estado técnico verificado

Em 6 de setembro de 2026, a compilação de produção do frontend foi executada com sucesso. O processo transformou 17 módulos e gerou o manifesto, o service worker e os arquivos do Workbox. A PWA registrou sete entradas no precache.

Na mesma verificação, o arquivo do backend passou pela checagem de sintaxe. O servidor foi iniciado localmente e respondeu:

```json
{"status":"ok","service":"miniverso-api"}
```

A rota de projetos respondeu com uma lista vazia, comportamento esperado para a fundação atual:

```json
{"projects":[]}
```

Essas verificações comprovam que a base compila e que a API mínima funciona. Elas não comprovam que login, dashboard, persistência, publicação na internet ou todos os cenários offline estejam concluídos.

## Execução no Visual Studio Code

Abrir a pasta `miniverso` no Visual Studio Code e usar o terminal integrado.

Na primeira execução:

```bash
npm install
```

Executar o frontend em um terminal:

```bash
npm run dev:frontend
```

Executar o backend em outro terminal:

```bash
npm run dev:backend
```

Endereços locais:

- frontend: `http://localhost:5187`;
- backend: `http://localhost:3000`;
- saúde da API: `http://localhost:3000/api/health`.

Para verificar a versão de produção da PWA:

```bash
npm run build
npm run preview
```

O projeto exige Node.js 20.19 ou superior.

## Git e colaboração

O repositório remoto privado é [gustavoassun/miniverso-web](https://github.com/gustavoassun/miniverso-web). A branch principal é `main` e acompanha `origin/main`.

O primeiro commit publicado foi:

- identificador completo: `bf3697967df18a3bc4166ee214f4939a9f40f3ff`;
- mensagem: `chore: estrutura inicial do projeto Miniverso`;
- data: 1 de setembro de 2026.

No último registro disponível sobre colaboração, o convite para Murilo ainda dependia do nome de usuário exato dele no GitHub. Esse estado deve ser verificado no GitHub antes de ser apresentado como atual.

Fluxo recomendado para cada integrante:

1. aceitar o convite do repositório;
2. clonar o projeto pelo Visual Studio Code;
3. instalar as dependências com `npm install`;
4. criar uma branch para a própria tarefa;
5. fazer alterações pequenas e identificáveis;
6. criar um commit com uma mensagem clara;
7. enviar a branch ao GitHub;
8. abrir um Pull Request para revisão antes de juntar o trabalho à `main`.

Exemplo de nome de branch:

```bash
git switch -c feature/nome-da-tarefa
```

## Estado por área

| Área | Estado atual | Evidência ou observação |
| --- | --- | --- |
| Estrutura Vue e Node | Concluída como fundação | Pastas frontend e backend organizadas |
| Landing page inicial | Implementada como protótipo | Seções de hero, essência, projetos e acesso |
| Portfólio | Estrutura visual implementada | Conteúdo ainda é temporário |
| Responsividade | Implementada na base | Regras CSS para telas menores |
| Acessibilidade inicial | Parcial | Semântica, skip link, foco e movimento reduzido |
| Manifesto PWA | Implementado | Gerado na compilação de produção |
| Service worker | Implementado | Gerado com precache |
| Teste offline completo | Pendente | Precisa ser validado no fluxo de produção |
| API mínima | Implementada | Rotas de saúde e projetos verificadas |
| Integração frontend e API | Pendente | Portfólio ainda usa dados locais no Vue |
| Login | Pendente | Apenas seção visual de acesso futuro |
| Dashboard | Pendente | Requisitos detalhados ainda não definidos |
| Banco de dados | Pendente | Tecnologia e modelo ainda não definidos |
| Conteúdo real dos projetos | Pendente | Necessita dados aprovados pela Miniverso |
| Identidade visual final | Pendente | Direção atual precisa de validação |
| Publicação na internet | Pendente | Hospedagem ainda não definida |
| Colaboração com Murilo | A confirmar | Verificar convite e acesso no GitHub |

## Decisões registradas

- A empresa atendida pelo trabalho é a Miniverso.
- O produto combina landing page, portfólio e dashboard de projetos.
- A solução precisa ser dinâmica, responsiva e instalável como PWA.
- O funcionamento offline faz parte dos requisitos.
- Acessibilidade deve ser considerada desde o início.
- O site Melted Studio é referência visual declarada.
- A primeira etapa usa Vue.js no frontend e Node.js no backend.
- O Visual Studio Code é o editor principal da equipe.
- O código está em um repositório privado no GitHub.
- Login, banco de dados e dashboard ainda não devem ser tratados como implementados.

## Pendências de requisitos

As perguntas abaixo precisam de resposta antes da implementação completa:

### Conteúdo e marca

- Qual é a identidade visual oficial da Miniverso?
- Existem logo, manual de marca, fontes, cores e materiais aprovados?
- Qual texto institucional pode ser publicado?
- Quais projetos reais podem aparecer no portfólio?
- Para cada projeto, quais são o desafio, a solução, as imagens e os resultados autorizados?
- Qual ação principal o visitante deve realizar: solicitar orçamento, marcar reunião, enviar mensagem ou outra?

### Login e permissões

- Quem pode criar contas?
- Haverá um único tipo de usuário ou papéis diferentes?
- Quais campos formam um projeto?
- Um projeto precisa passar por rascunho, revisão e publicação?
- Quem pode editar, excluir e publicar?
- Será necessário recuperar senha?

### Dados e infraestrutura

- Qual banco de dados será usado?
- Onde frontend e backend serão hospedados?
- Quais dados realmente precisam funcionar offline?
- Alterações feitas offline deverão ser sincronizadas depois?
- Haverá armazenamento de imagens e vídeos?
- Existem requisitos de privacidade ou consentimento para dados pessoais?

### Avaliação acadêmica

- Qual é a rubrica completa do professor?
- Frontend e backend podem ficar em um único repositório com pastas separadas ou devem ser repositórios independentes?
- Quais evidências precisam entrar no relatório final?
- Quais datas e entregas intermediárias devem ser acompanhadas?

## Riscos e cuidados

### Conteúdo temporário parecer definitivo

Os dois projetos exibidos na tela são exemplos estruturais. O relatório deve identificá-los como protótipos até que a Miniverso forneça casos reais aprovados.

### Escopo do dashboard ainda aberto

Implementar autenticação ou banco antes de definir usuários, permissões e dados pode gerar retrabalho. A equipe deve fechar esses requisitos antes da próxima grande etapa técnica.

### PWA ser considerada pronta apenas porque compilou

A geração do service worker confirma a configuração, mas o comportamento offline precisa ser testado em produção, incluindo atualização de cache, navegação sem rede e reinstalação.

### Referência visual virar cópia

O Melted Studio deve ajudar a discutir ritmo, tipografia, composição e interação. A interface final precisa preservar a identidade própria da Miniverso.

### Relatório misturar plano com entrega

Cada texto de acompanhamento deve informar a data, a evidência observada e o estado real. Expressões como implementado, validado e publicado só devem ser usadas quando houver prova correspondente.

## Próximas etapas recomendadas

1. Confirmar o acesso de todos os integrantes ao repositório.
2. Reunir o conteúdo real e os materiais de marca da Miniverso.
3. Transformar as perguntas pendentes em uma lista para a próxima conversa com o cliente.
4. Definir os campos do projeto e o fluxo do dashboard.
5. Conectar o frontend à rota `/api/projects`.
6. Escolher autenticação, persistência e hospedagem somente após os requisitos estarem claros.
7. Criar testes de responsividade, teclado, contraste e leitor de tela.
8. Executar e registrar um teste offline completo da PWA.
9. Atualizar esta fonte após cada decisão ou entrega relevante.

## Orientação para preencher relatórios

O chat responsável pela documentação deve usar a seguinte estrutura quando preparar um relatório:

1. identificação da etapa e da data;
2. objetivo da atividade;
3. requisitos relacionados;
4. trabalho realizado;
5. decisões tomadas e justificativas;
6. arquivos ou componentes alterados;
7. evidências de execução e testes;
8. dificuldades encontradas;
9. soluções aplicadas;
10. pendências e próxima ação concreta.

Quando houver código, registrar o nome do arquivo, a finalidade da mudança e o resultado observado. Quando houver Git, registrar a branch, o commit e o Pull Request correspondente. Quando houver validação visual, registrar dispositivo ou largura de tela, navegador e comportamento conferido.

## Registro cronológico inicial

### 1 de setembro de 2026

- Fundação do projeto criada com Vue.js, Vite e Node.js.
- Landing page inicial, componentes, estilos e configuração PWA adicionados.
- API mínima criada com rotas de saúde e projetos.
- Porta do frontend fixada em 5187 para evitar conflito com outro projeto em cache.
- Dependência `workbox-window` adicionada para corrigir falha de compilação.
- Compilação de produção validada.
- Repositório privado `gustavoassun/miniverso-web` criado.
- Primeiro commit enviado à branch `main`.
- Página de colaboradores preparada, mas o convite para Murilo ficou pendente do usuário exato do GitHub.

### 6 de setembro de 2026

- Código e estrutura revisados para produzir esta fonte.
- Compilação do frontend executada novamente com sucesso.
- Manifesto, service worker e arquivos Workbox gerados.
- Sintaxe do backend validada.
- Rotas `/api/health` e `/api/projects` verificadas localmente.

## Fontes e links

- Guia do professor: [Programação Avançada para Web](https://app.notion.com/p/PROGRAMA-O-AVA-ADA-PARA-WEB-3c7588b8d1c08044a97df20259e38399)
- Referência visual: [Melted Studio](https://melted.studio)
- Repositório privado: [gustavoassun/miniverso-web](https://github.com/gustavoassun/miniverso-web)
- Fonte local do encontro: anotações e gravações armazenadas na pasta sincronizada `sources` do projeto ChatGPT.

As gravações da reunião devem ser consultadas novamente caso seja necessário confirmar falas, nomes, requisitos detalhados ou compromissos que não aparecem nas anotações textuais.

## Regra de atualização desta fonte

Após cada etapa relevante, acrescentar ao registro cronológico:

- data;
- mudança realizada;
- decisão tomada;
- evidência de validação;
- pendência criada ou resolvida.

Também atualizar a tabela de estado, as decisões e as pendências afetadas. Não apagar decisões antigas sem registrar por que foram substituídas.
