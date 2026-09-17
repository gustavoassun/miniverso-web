# Experimento visual local — Miniverso

Registro histórico da primeira iteração. A abertura, o modelo 3D e a paleta descritos abaixo foram revisados posteriormente; consulte `ENTRADA_VR.md` para a implementação atual e a autorização de publicação na `dev`. Capturas desta iteração foram mantidas apenas localmente; as evidências da revisão publicada ficam em `brand-brief-evidence/`.

Solicitado para avaliação local em 14/09/2026. Não há autorização de commit, push, integração remota ou deploy desta etapa.

## Direção

Ambiente escuro que se abre para violeta profundo, lilás e ciano dessaturado. Nova tipografia apenas no texto animado da introdução; o arquivo da logo oficial foi preservado. A troca de nome para logo ocorre sequencialmente no mesmo centro visual, sem duas marcas legíveis sobrepostas. Em telas móveis, os nomes começam acima do óculos e convergem para o centro final.

## Adaptações dos anexos

- GhostFibers: faixas harmônicas de Canvas 2D, lentas e de baixa opacidade, ativadas após a expansão. É uma adaptação da direção visual, não reprodução pixel a pixel do shader OGL anexado.
- GlowCursor: núcleo preciso, halo pequeno e cauda curta em SVG. Entra depois da expansão, somente para mouse com ponteiro fino. Cursor nativo restaurado ao usar Tab/Esc, sair da janela, reduzir movimento ou acessar outro caminho. Campos de texto preservam o cursor de edição.
- AccordionGallery: seleção expansível com transições CSS, projetos reais já presentes no repositório, links individuais e interação por mouse, toque ou teclado. Sem reprodução automática.
- GooeyNav: dock de navegação que aparece após a entrada no universo, indicador fluido e pequenas partículas. Links para início, estúdio, projetos e contato, com seção atual indicada.
- ScrollExpand: imagem do Reciclaverso abre gradualmente uma janela visual na entrada do portfólio. Sem adicionar uma segunda longa seção de rolagem presa.

As referências React foram adaptadas a Vue sem instalar React, OGL ou GSAP. Three.js já estava declarado no projeto; sua dependência foi instalada para carregar o modelo GLB também já existente. O modelo simples foi iluminado e recolorido em tempo de execução, sem modificar o arquivo original. Rotação amortecida acompanha o mouse; a câmera se aproxima na rolagem. Imagem de apoio permanece se WebGL ou o carregamento falhar.

## Canais sociais

Links enviados pelo usuário: `https://www.instagram.com/meuminiverso/` e `https://linktr.ee/miniverso`. A consulta não permitiu ler publicações; nenhuma postagem, conta de LinkedIn ou conteúdo social foi inventado/importado. A galeria usa Avati, Aliados e Reciclaverso com imagens já locais.

## Verificação e limites

Seis testes da timeline e compilação de produção. Verificação automatizada com Edge isolado: carregamento 3D, ativação tardia do cursor, retorno ao cursor nativo com teclado, navegação, seleção de galeria e telas 320/390/760/1280, além de preferência de movimento reduzido. Capturas e resultado em `docs/visual-experiment-evidence/`.

Loops pausam fora de uso/aba oculta; fibras limitadas a cerca de 20 FPS e DPR 1,25; renderer 3D DPR até 1,5 e importação separada. A compilação avisa sobre o tamanho do chunk Three.js (~747 kB minificado), e o precache total fica em torno de 7,4 MiB. Isso não comprova desempenho em celulares físicos, equivalência aos shaders anexados ou qualidade visual de um modelo 3D final. Requer aprovação visual do usuário.

Para abrir sem cache da versão anterior, preview local na porta 5190. A porta 5188 compartilha os mesmos arquivos compilados e pode exigir aceitar a atualização da PWA. Nenhuma versão anterior foi removida do histórico Git.

Resultado final: verificação visual/interativa concluída sem erros JavaScript ou avisos de console. Marca e links do menu móvel visíveis, galeria testada com toque em 320/390 e teclado em 760. Teste offline repetido com sucesso e evidências separadas em `docs/visual-experiment-evidence/offline/`. O arquivo da logo manteve SHA-256 `29286a4dd43b2117536090e5441f61ce3250de5416363f3ca8847b03be1fe373`.

Referência técnica do carregamento 3D: https://threejs.org/docs/pages/GLTFLoader.html . As cinco direções visuais vieram dos textos anexados pelo usuário; os componentes deste experimento são adaptações em Vue, com mecanismos próprios de Canvas/SVG/CSS.
