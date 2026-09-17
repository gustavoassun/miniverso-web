# Entrada VR — revisão experimental local

Direção: aproximar o visor do visitante e apresentar o conteúdo dentro de uma interface visual de realidade virtual, evitando uma abertura de logo isolada. Os dois vídeos fornecidos pelo Gustavo foram examinados localmente em quatro momentos de cada vídeo, sem envio para serviços externos.

## Implementação

- Modelo procedural Three.js: carcaça com recorte nasal, visor escuro arqueado, acabamento metálico, sensores, alças retangulares e lentes traseiras. Não representa um equipamento comercial específico.
- Arraste horizontal para rotação completa; arraste vertical limitado para inclinação. Setas do teclado e Home oferecem controles equivalentes.
- Holograma no próprio visor, com pixels próximos ao mouse e a frase “OUTRA DIMENSÃO.”. O efeito diminui antes da aproximação final.
- A rolagem alinha gradualmente o óculos para a frente e aproxima a câmera. Mini e Verso se juntam no centro; a logo oficial aparece no mesmo eixo e sobe suavemente antes da apresentação do estúdio.
- Moldura holográfica acompanha a navegação após a entrada. Fundo azul, fibras discretas e grade de perspectiva de baixa intensidade.
- Imagens soltas de projetos removidas. A passagem para a logo foi restaurada após esclarecimento do Gustavo, com centro compartilhado e deslocamento contínuo. Logo original preservada também no cabeçalho e rodapé.
- Nova referência de 30 segundos examinada localmente em `docs/design-reference-evidence/`. Ondas do fundo com maior presença; pixels e circuitos laterais sem flashes rápidos; painéis de serviços translúcidos e arte geométrica própria nas seções Sobre e Contato. Não foram copiadas métricas, textos, formulários nem funções fictícias da referência.
- Movimento reduzido apresenta conteúdo estático; link direto permite ir aos projetos. Renderização 3D pausada fora da área visível ou com a página em segundo plano. Cursor personalizado conserva as alternativas de teclado/Escape da experiência anterior.

## Arquivos principais

- `frontend/src/utils/premiumHeadset.js`: geometria, materiais, reflexos e holograma.
- `frontend/src/components/HeadsetScene.vue`: câmera, arraste, teclado, detecção do visor e ciclo de renderização.
- `frontend/src/components/ImmersiveIntro.vue` e `frontend/src/utils/introMotion.js`: composição e transição pela rolagem.
- `frontend/src/components/HoloViewport.vue`: moldura da visão interna.
- `frontend/src/views/Home.vue`: integração na apresentação e portfólio.

## Verificação e limites

Evidências desta revisão em `docs/vr-entrance-evidence/`; quadros de referência em `docs/vr-reference-evidence/`. Esses quadros são material local de consulta, não conteúdo destinado à publicação do site. Consulte os recibos JSON para os resultados efetivamente executados.

É uma experiência visual em uma página convencional, não uma aplicação WebXR nem visão estereoscópica real. O modelo interativo é renderizado em tempo real: não se afirma equivalência com a qualidade cinematográfica dos vídeos. Desempenho em aparelhos físicos e aprovação estética do Gustavo permanecem pendentes. O compilador pode sinalizar o tamanho do módulo Three.js; ele é carregado sob demanda. O navegador de teste também pode registrar avisos de precisão do compilador gráfico, conservados no recibo.

Inicialmente, esta etapa foi mantida como experimento local. Em 14 de setembro de 2026, Gustavo autorizou publicar o código na branch `dev` do repositório existente para revisão do Murilo. Esta autorização não inclui integrar a `main`. `EXPERIMENTO_VISUAL.md` documenta a iteração anterior; esta revisão substitui sua abertura, não a documentação oficial do trabalho. Quadros de referência e capturas intermediárias ficam fora deste commit; as evidências publicadas desta revisão estão em `docs/brand-brief-evidence/`.

## Revisão de marca, efeitos e briefing

- Cubo central de Sobre e Contato substituído pela logo original, cercada por ícones de jogos, negócios e criação 3D. A composição inclina e ilumina discretamente com o mouse; foco de teclado também destaca a marca. Movimento reduzido elimina a inclinação.
- As partes “mini” e “verso” da abertura exibem recortes por viewport SVG do próprio arquivo original da marca. Nenhum bitmap novo foi criado e nenhuma fonte foi presumida; a junção conserva o desenho exato das letras.
- Palavras-chave dos benefícios em azul-ciano, com peso maior e pequeno acento luminoso no cabeçalho dos cartões.
- Circuitos e acentos dos cantos com fade lento de 6–9 segundos e reação à proximidade do mouse, sem bloquear os controles da página. Movimento reduzido desativa as animações.
- `frontend/src/components/ContactBrief.vue`: diálogo na própria página com nome, empresa opcional, e-mail e descrição da ideia; validação, revisão, cópia e opção explícita de abrir e-mail. Não existe envio automático ou armazenamento no servidor. Valores permanecem apenas no estado da página até recarregar. Fechamento por botão, Escape e fundo; foco contido pelo diálogo nativo, cursor convencional no formulário e foco encaminhado na revisão.
- Evidências específicas em `docs/brand-brief-evidence/`: navegador isolado com dados fictícios, sem mensagem enviada a qualquer destinatário. O JSON registra as verificações executadas e seus limites.

O projeto foi copiado para a pasta de trabalho `Documentos/Projetos/Miniverso`, preservando `.git`, branch `dev`, alterações locais e a conexão com o mesmo repositório. Foram conferidos 358 arquivos de conteúdo idêntico; dependências reinstaladas, compilação e execução do frontend e backend verificadas no novo local. A pasta antiga foi preservada como backup e não deve ser usada para novas edições. Esta mudança local não cria outro repositório no GitHub.
