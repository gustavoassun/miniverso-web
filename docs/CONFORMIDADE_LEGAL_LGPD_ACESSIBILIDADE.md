# Matriz de conformidade — Miniverso

Data da verificação: 26 de outubro de 2026.

Escopo verificado: código local da branch `dev`, incluindo landing page, portfólio, formulário de contato, PWA, login demonstrativo e dashboard local.

> Este documento é uma auditoria técnica e preventiva. Ele não substitui parecer jurídico. Os textos legais e as decisões sobre base legal, retenção, compartilhamento, atendimento de titulares e relações de consumo precisam ser confirmados pela Miniverso e, antes da publicação comercial, revisados por profissional jurídico ou de privacidade.

## Conclusão executiva

O projeto possui uma boa fundação técnica de acessibilidade e transparência no formulário, mas **ainda não deve ser tratado como juridicamente pronto para produção**.

Dos 17 pontos avaliados:

- 2 estão atendidos no protótipo atual;
- 7 estão parcialmente atendidos;
- 7 estão pendentes;
- 1 é condicional, pois só se aplica se houver contratação, pagamento ou venda online.

Os bloqueios principais são: ausência das páginas legais, falta de identificação jurídica da empresa, ausência de inventário formal de dados e mídias, falta de comprovação de autorização das imagens e existência de login demonstrativo com credenciais no frontend e dados de clientes no `localStorage`.

## Os 17 pontos

| # | Critério | Estado | Evidência no projeto | Ação necessária antes de produção |
|---|---|---|---|---|
| 1 | Política de Privacidade | 🔴 Pendente | Não existe rota, página ou link de Política de Privacidade. | Criar texto aprovado pela Miniverso informando controlador, finalidades, dados, bases legais, compartilhamentos, retenção, segurança, direitos e canal do titular. |
| 2 | Termos de Uso/Serviço | 🔴 Pendente | Não existe rota ou página de Termos de Uso. | Definir regras de uso do site, propriedade intelectual, limitações, responsabilidades, links externos e condições do portal restrito. |
| 3 | Aviso e gestão de cookies | 🟡 Parcial | Não foram encontrados cookies nem scripts de publicidade/analytics. A aplicação usa PWA, `localStorage` e `sessionStorage`, que não são cookies, mas são armazenamento no dispositivo. | Manter inventário técnico. Se forem adicionados cookies ou trackers não essenciais, bloquear até a escolha do usuário, oferecer aceitar/rejeitar e permitir alteração posterior. Criar Política de Cookies mesmo que inicialmente declare apenas tecnologias essenciais. |
| 4 | Política de reembolso/cancelamento | ⚪ Condicional | O site atual não vende, cobra ou conclui contratos online. | Não publicar uma política fictícia. Se houver orçamento com aceite, assinatura ou pagamento online, definir cancelamento, arrependimento, prazos, estorno e exceções conforme o modelo comercial e o CDC. |
| 5 | Formulários adequados à LGPD | 🟡 Parcial | `ContactBrief.vue` informa que o formulário prepara a mensagem sem envio automático e sem salvamento no servidor. O usuário escolhe copiar ou abrir o e-mail. | Adicionar link para a Política de Privacidade, identificar a finalidade e o controlador, explicar o que ocorre ao abrir o e-mail e informar o canal de direitos. Não usar caixa genérica de consentimento se a base legal aplicável for outra. |
| 6 | Coleta apenas dos dados necessários | 🟡 Parcial | Contato coleta nome, e-mail, ideia e empresa opcional. É um conjunto relativamente enxuto. | Confirmar se nome e e-mail são indispensáveis, manter empresa opcional e alertar o usuário para não inserir dados sensíveis, segredos comerciais ou dados de terceiros no campo livre. Definir prazo de retenção das mensagens recebidas. |
| 7 | Scripts de tracking | ✅ Atendido atualmente | Não foram encontrados Google Analytics, Tag Manager, Meta Pixel, Hotjar, Clarity, Matomo, Plausible ou ferramentas equivalentes no código. | Revalidar a cada nova integração. Nenhum tracker não essencial deve ser adicionado silenciosamente. Documentar fornecedor, finalidade, dados, prazo e transferência internacional. |
| 8 | Acessibilidade geral | 🟡 Parcial | Há `lang="pt-BR"`, link para pular conteúdo, regiões semânticas, foco visível, suporte a movimento reduzido, rótulos acessíveis e controles com tamanho adequado. | Realizar auditoria WCAG 2.2 nível AA, testes com leitor de tela, zoom a 200%, reflow, ordem de leitura e teste com usuários. Criar uma página de Acessibilidade e canal para relatar barreiras. |
| 9 | Texto alternativo nas imagens | 🟡 Parcial | Logos informativos possuem `alt`; imagens de projetos usam títulos descritivos; elementos decorativos usam `alt=""` ou `aria-hidden`; o canvas 3D possui `aria-label`. | Revisar cada imagem com o conteúdo final. Evitar alt genérico ou repetitivo e fornecer descrição longa quando uma imagem complexa transmitir informação que não aparece no texto. |
| 10 | Contraste e riscos visuais | 🔴 Pendente | O projeto tem foco visível e paleta consistente, mas vários textos decorativos usam 7–9 px, baixa opacidade e azul/cinza sobre fundo escuro. Não há laudo completo de contraste. | Medir todos os estados com meta WCAG AA: 4,5:1 para texto normal, 3:1 para texto grande e componentes. Verificar hover, foco, desabilitado, mensagens de erro, animações, clarões e legibilidade sobre imagens. |
| 11 | Navegação por teclado | 🟡 Parcial | Galeria aceita setas; headset aceita setas e `Home`; links e botões são elementos nativos; há foco visível e `dialog` nativo. | Executar percurso completo somente com teclado em desktop e mobile, verificando menu, modal, fechamento com `Esc`, retorno de foco, dashboard, controle de exclusão e ausência de armadilhas. |
| 12 | Ausência de avaliações falsas | ✅ Atendido atualmente | Não há depoimentos, estrelas, notas de clientes ou avaliações no frontend. | Se depoimentos forem adicionados, obter autorização, preservar texto verdadeiro e guardar evidência da origem. Não criar nomes, cargos, empresas, notas ou falas fictícias. |
| 13 | Ausência de promessas ou resultados falsos | 🟡 Parcial | Não foram encontradas garantias absolutas. Entretanto, projetos e frases comerciais devem ser confirmados pela Miniverso. | Só publicar clientes, métricas, impactos, resultados, prêmios e alegações que possuam aprovação e evidência. Identificar claramente demonstrações, conceitos e protótipos. |
| 14 | Copyright e direito de uso das imagens | 🔴 Pendente | O projeto contém logo, capturas, imagens de projetos, materiais extraídos de páginas públicas e ativos gerados para a abertura. Não existe registro completo de titularidade/licença por arquivo. | Criar inventário de ativos com origem, autor/titular, autorização, licença, data, restrições e crédito. Não publicar imagens de banco com marca-d'água nem copiar materiais de Instagram/site apenas por estarem públicos. Confirmar também direito de imagem de pessoas identificáveis. |
| 15 | Dados e identificação da empresa | 🔴 Pendente | O rodapé mostra apenas `© 2026 Miniverso`; não há razão social, CNPJ, endereço, telefone ou canal formal de privacidade. | Solicitar à Miniverso os dados oficiais que podem ser publicados. Se houver contratação eletrônica, exibir de forma clara identificação do fornecedor, endereço físico/eletrônico e condições da oferta. |
| 16 | Conformidade LGPD e governança | 🔴 Pendente | Não há inventário de tratamento, bases legais, prazos de retenção, operadores, canal de titulares, procedimento de incidentes ou política publicada. | Mapear todo o ciclo de dados, definir controlador/operadores, bases legais, retenção e descarte, direitos, segurança, incidentes e revisão periódica. Incluir fornecedores de hospedagem, e-mail, analytics e armazenamento. |
| 17 | Riscos jurídicos e de segurança relacionados | 🔴 Pendente | `Login.vue` contém credenciais demonstrativas no frontend; a sessão é apenas uma chave em `sessionStorage`; projetos e dados de clientes ficam no `localStorage`. | Não publicar a área demonstrativa como autenticação real. Remover dados reais de clientes, implementar autenticação/autorização no servidor, persistência segura, logs adequados e segregação de ambientes antes de uso empresarial. |

## Pontos positivos já existentes

- O formulário de contato não envia silenciosamente e explica isso antes da ação do usuário.
- O formulário permite revisão antes de copiar ou abrir o aplicativo de e-mail.
- Empresa é um campo opcional e há limites de tamanho nos campos.
- Não existem trackers de marketing identificados no código.
- Não existem avaliações ou depoimentos inventados.
- O HTML declara português do Brasil.
- Há link para pular ao conteúdo, foco visível e estrutura semântica.
- As imagens informativas encontradas possuem textos alternativos; imagens decorativas são ocultadas dos leitores de tela.
- A introdução possui alternativa para movimento reduzido.
- Links que abrem outra aba informam essa mudança no texto acessível.

## Bloqueadores de publicação

### Prioridade crítica — antes de usar dados reais

1. Substituir o login demonstrativo por autenticação e autorização no backend.
2. Impedir armazenamento de nomes de clientes e andamento de projetos no `localStorage` em produção.
3. Não cadastrar dados reais ou sensíveis na demonstração atual.
4. Criar inventário de tratamento de dados e de fornecedores.
5. Definir processo de incidente, exclusão, correção e atendimento ao titular.

### Prioridade alta — antes de abrir o site comercialmente

1. Criar Política de Privacidade e Termos de Uso aprovados.
2. Confirmar razão social, CNPJ, endereço e canais oficiais da Miniverso.
3. Criar registro de licença/autorização de todas as imagens, vídeos, logos e depoimentos.
4. Revisar as alegações comerciais e os resultados de cada projeto com a empresa.
5. Executar auditoria WCAG 2.2 AA, especialmente contraste, teclado, modal e textos pequenos.
6. Decidir se haverá analytics. Se houver, implementar consentimento e gestão de preferências antes do carregamento não essencial.

### Prioridade condicional — se houver venda ou contratação online

1. Política de cancelamento, arrependimento e reembolso.
2. Informações completas da oferta, preço, prazo, entrega e atendimento.
3. Registro do aceite contratual e entrega de cópia ao cliente.
4. Fluxo de arrependimento e estorno compatível com o CDC e com o serviço contratado.

## Dados que precisam ser solicitados à Miniverso

- razão social e nome fantasia corretos;
- CNPJ e endereço empresarial que podem ser publicados;
- e-mail e/ou canal oficial para privacidade e direitos dos titulares;
- responsável interno por privacidade e segurança;
- lista de fornecedores: hospedagem, e-mail, domínio, analytics, CRM, banco, armazenamento e autenticação;
- finalidades e prazo de retenção dos contatos recebidos;
- público-alvo e possibilidade de coleta de dados de crianças/adolescentes;
- decisão sobre analytics, pixels e campanhas;
- modelo de contratação e existência ou não de pagamento online;
- autorizações de uso de logos de clientes, imagens, vídeos, marcas, pessoas e resultados;
- quais dados de clientes/projetos podem aparecer no dashboard;
- procedimento para solicitações de acesso, correção, oposição, portabilidade e eliminação;
- procedimento de resposta a incidentes de segurança.

## Arquitetura documental recomendada

Quando as informações forem confirmadas, criar no site:

- `/privacidade` — Política de Privacidade;
- `/termos` — Termos de Uso;
- `/cookies` — Política de Cookies e gestão de preferências;
- `/acessibilidade` — recursos disponíveis e canal para relatar barreiras;
- `/reembolso` — somente se houver contratação/pagamento online e após validação jurídica.

O rodapé deve apresentar links para essas páginas e os dados oficiais aplicáveis. As páginas legais precisam estar disponíveis também na PWA e ter data/versão, responsável pela aprovação e histórico de atualização.

## Regras para novas funcionalidades

Antes de aprovar qualquer nova biblioteca, formulário ou integração, responder:

1. Quais dados serão coletados?
2. Qual é a finalidade específica?
3. Qual é a base legal?
4. O dado é realmente necessário?
5. Onde será armazenado e por quanto tempo?
6. Quem terá acesso?
7. Haverá transferência para terceiro ou para outro país?
8. Como o titular exerce seus direitos?
9. Como o dado será protegido, corrigido e eliminado?
10. A funcionalidade funciona por teclado, leitor de tela, zoom e movimento reduzido?
11. Imagens, textos, marcas e resultados têm autorização comprovável?
12. A comunicação pode ser interpretada como promessa, garantia ou publicidade enganosa?

## Fontes normativas e técnicas

- [Lei Geral de Proteção de Dados — Lei nº 13.709/2018, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Guia Orientativo da ANPD — Cookies e Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf)
- [Código de Defesa do Consumidor — Lei nº 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- [Decreto nº 7.962/2013 — contratação no comércio eletrônico](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)
- [Lei de Direitos Autorais — Lei nº 9.610/1998](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm)
- [Lei Brasileira de Inclusão — Lei nº 13.146/2015, art. 63](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm)
- [WCAG 2.2 — W3C](https://www.w3.org/TR/WCAG22/)
- [eMAG — Modelo de Acessibilidade em Governo Eletrônico](https://emag.governoeletronico.gov.br/)
- [Guia rápido de texto alternativo — Governo Digital](https://www.gov.br/gestaodeconteudo/pt-br/manuais-e-tutoriais/acessibilidade-em-imagens/guia-rapido-texto-alternativo)

## Decisão de aceite para produção

O projeto só deve receber o status “pronto para produção” quando:

- todos os itens vermelhos tiverem responsável, evidência e aprovação;
- os itens amarelos tiverem teste documentado;
- a empresa tiver aprovado conteúdo, imagens, alegações e dados cadastrais;
- autenticação e armazenamento deixarem de ser apenas demonstrativos;
- políticas publicadas corresponderem ao funcionamento real do sistema;
- a equipe tiver registrado build, acessibilidade, privacidade, segurança e revisão jurídica.

