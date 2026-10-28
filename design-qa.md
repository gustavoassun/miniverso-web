# QA — Abertura imersiva Miniverso

Data: 12/09/2026.

## Alvo e evidências

- Source visual truth: `docs/intro-evidence/astra-reference.png`, capturado de https://openai.com/pt-BR/index/gpt-6-astra/.
- Direção: composição estrelada com palavras laterais e assunto central, adaptada conforme solicitação do usuário para headset, nome e paleta Miniverso.
- Implementation screenshot: `docs/intro-evidence/desktop-opening.png`.
- Full-view comparison evidence: `docs/intro-evidence/reference-comparison.png`, referência à esquerda e implementação à direita no mesmo arquivo, aberto e inspecionado.
- Viewport CSS desktop: 1280×720. Ambas as capturas: 1265×712 pixels, com a mesma normalização do navegador. Não houve redimensionamento de uma captura para simular correspondência; composição apenas lado a lado.
- Estado: primeira dobra, rolagem inicial. A referência anima autonomamente o campo; a implementação usa a narrativa de rolagem solicitada, não um clone quadro a quadro.
- Estados adicionais: `desktop-reveal.png`, `mobile-opening.png` (390×844 CSS), `mobile-reduced.png`, `mobile-small.png` (320×740 CSS).
- Tablet visualmente conferido em 760×900 CSS.
- Comparação focada separada não necessária: os elementos importantes da composição (palavras, assunto central, margens e marca) são grandes e legíveis nas capturas completas. Controles pequenos, menu e estados móveis foram conferidos diretamente no navegador.

## Superfícies de fidelidade

- Tipografia: fonte sans-serif local, palavras minúsculas coerentes com a assinatura da Miniverso, maior escala que a referência como adaptação intencional. Texto principal, serviços e portfólio sem truncamento.
- Layout: assunto central e palavras laterais, bastante espaço negativo, cabeçalho e controles fora do foco principal. Imagens laterais parcialmente cortadas de propósito como fragmentos decorativos; seleção completa vem no portfólio.
- Cores: fundo quase preto/azul para mistério; roxo `#211747` e ciano na revelação, derivados da apresentação pública da Miniverso, não tratados como manual oficial de marca validado.
- Imagens: headset raster real com alpha, fundo raster gerado e imagens originais da Miniverso salvas localmente. Nenhum headset, logo ou thumbnail simulado por desenho CSS/SVG. Imagens dos projetos preservam a proporção 16:9.
- Conteúdo: títulos, descrições e links dos projetos conferidos na página pública; sem indicadores de resultados inventados. Texto-base comercial anterior preservado e sujeito à revisão da empresa antes da publicação.

## Histórico de correções

1. [P2] Headset muito próximo das palavras na primeira composição desktop. Gap ampliado de 32vw para 39vw e headset reduzido de 48vw para 43vw; `desktop-opening.png` e comparação conjunta mostram melhor separação. Pequena sobreposição decorativa com a alça permanece intencional; letras não são ocultadas.
2. [P2] Link de pular conteúdo duplicado no shell e HTML original. Removida a cópia adicionada ao shell; snapshot final contém um único link.
3. [P2] Em viewport CSS de 320px, `body` mínimo 320px excedia os 305px disponíveis com barra vertical. Removida largura mínima; pós-correção `scrollWidth=clientWidth=305`, evidência `mobile-small.png`.
4. [P2] Mudar para movimento reduzido no meio da abertura encurtava a seção e deixava o visitante abaixo da cena. Ajustado o controle para preservar a âncora da introdução; teste mostrou `scrollY=0`, altura estática de 844px e botão pressionado.
5. [P2] Imagens PNG ausentes do padrão original de precache. Acrescentado PNG/WebP ao padrão; build final inclui as seis imagens locais, 13 entradas no precache.

## Interações testadas

- Rolagem inicial → aproximação → revelação, com capturas de estado intermediário e final.
- Menu móvel abre e fecha; Projetos navega para `/#portfolio`, seção a 24px do topo, sem menu aberto.
- Controle Reduzir movimento/Ativar movimento alterna os estados e a altura do trecho.
- Blog navegava para `/blog` com conteúdo anterior; logo retorna à Home e rolagem inicial. (Em 28/10/2026 o Blog foi descartado: página, rota e link do menu removidos.)
- Links dos projetos têm URLs públicas verificadas e aviso de nova aba; contato utiliza mailto, sem envio de mensagem automatizado.
- Console do navegador consultado após navegação e animação: sem erros ou avisos capturados.
- 4 testes automáticos da timeline passaram; compilação passou.

## Limites e refinamentos

- P3: compressão dos PNGs e medição de desempenho em aparelhos físicos antes de produção.
- P3: ampliar a etapa de fragmentos para modelos 3D reais quando a equipe fornecer os modelos e aprovar a biblioteca de renderização.
- Preferência do sistema para movimento reduzido está implementada; alternância manual verificada. Sem auditoria automatizada WCAG completa.
- Offline: precache validado estruturalmente; perda real de rede na PWA instalada não foi simulada nesta verificação.
- Login e dashboard continuam na etapa anterior, fora do escopo desta abertura. O Blog foi descartado em 28/10/2026.

## Checklist final

- [x] Captura da referência e da implementação abertas e comparadas conjuntamente.
- [x] Composição, paleta, imagens e texto conferidos.
- [x] Corrigidas as ocorrências P2 identificadas.
- [x] Menu, navegação, opção estática e seleção de projetos conferidos.
- [x] PNGs incluídos no precache; build e testes aprovados.
- [x] Durante a implementação e o QA, nenhuma publicação, integração na branch principal ou alteração nas fontes sincronizadas.

## Revalidação — novo portal pelo lado dos olhos (14/10/2026)

### Referência e intenção

- Referência visual recebida: `C:/Users/gusta/AppData/Local/Temp/codex-clipboard-044e9db9-ebe0-4324-b889-63a85003f631.jpg`.
- A referência com marca-d'água foi usada somente para orientar silhueta, materiais e recorte do visor. Ela não foi incorporada ao site.
- Foi criado um render original sem marca-d'água em `frontend/public/images/vr-headset-v2.png`, com carcaça branca, visor preto brilhante, encaixe nasal e alças grafite.
- A narrativa validada é: exploração frontal → descida e retorno ao eixo → rotação para o lado interno → alinhamento binocular → clarão ciano → revelação da identidade Miniverso.

### Estados comparados no navegador

- Desktop 1280×720: capa escura com headset frontal, marca dividida e chamada `OLHE ALÉM.`; composição sem cortes inesperados.
- Interação no visor: holograma legível com `OLHE ALÉM.` e `MOVA • DESCUBRA • ENTRE`, maior que a mensagem anterior.
- Estado intermediário: traseira do headset e duas lentes visíveis, com círculos de alinhamento e a mensagem `ALINHANDO A EXPERIÊNCIA AO SEU OLHAR`.
- Limiar: clarão branco/ciano cobre o visor antes da troca de ambiente; não é mais apenas uma ampliação linear do visor frontal.
- Mundo revelado: fundo azul-ciano, grade, circuitos e aurora visualmente distintos da capa estrelada.
- Retorno: ao rolar novamente para o topo, headset, nomes laterais, fundo escuro e conteúdo inicial voltam ao estado original.
- Mobile 390×844: abertura, clarão e mundo revelado conferidos. Headset, chamada, texto e controles permanecem dentro do viewport.

### Correções desta rodada

1. [P2] A chamada de interação encostava no texto inferior em telas estreitas. O bloco de introdução foi reposicionado e o espaçamento foi revalidado em 390×844.
2. [P2] A transição anterior aproximava a câmera do visor frontal. A câmera agora acompanha a rotação do headset e atravessa a região entre as lentes internas, representando o ponto de vista dos olhos.
3. [P2] O headset permanecia deslocado durante a entrada. O deslocamento agora usa uma curva senoidal: desce, retorna ao eixo e só então conclui o portal.
4. [P2] A capa e o conteúdo revelado tinham pouca separação visual. O segundo ambiente recebeu ciano mais luminoso, grade mais presente, aurora e circuitos de borda.

### Verificação técnica desta rodada

- 8/8 testes da timeline aprovados, incluindo reversibilidade, retorno do deslocamento, portal binocular, clarão e movimento reduzido.
- Build de produção aprovado: 79 módulos e PWA com 33 entradas de precache.
- Nenhum erro de aplicação no console. Há somente um aviso de precisão numérica do compilador WebGL/Three.js, sem quebra visual ou funcional.
- [P3] O chunk dinâmico do Three.js permanece com aproximadamente 747 kB; recomenda-se medir desempenho em celulares físicos e considerar divisão adicional antes da publicação final.
- [P3] A validação responsiva foi feita em viewport emulado; ainda convém uma passagem em aparelho físico antes da entrega definitiva.
- Nenhum commit ou push foi realizado nesta rodada de experimentação local.

final result: passed
