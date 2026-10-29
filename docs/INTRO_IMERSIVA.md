# Abertura imersiva da Miniverso

> **Histórico.** Esta abertura foi substituída em 28/10/2026 pela abertura 3D do planeta Miniverso
> (ver [`PLANETA_MINIVERSO.md`](PLANETA_MINIVERSO.md)). Os arquivos citados abaixo foram removidos do
> projeto no commit `051c410` e continuam disponíveis no histórico do Git. O texto foi mantido como registro.

Protótipo desenvolvido e verificado localmente em 12/09/2026. O envio desta versão
em uma branch no GitHub registra o trabalho, mas não publica o site nem integra a versão principal.

## Direção escolhida

A referência visual é a abertura estrelada de https://openai.com/pt-BR/index/gpt-6-astra/.
É uma adaptação autoral para Miniverso, não uma reprodução do site da OpenAI.

1. Fundo escuro estrelado, `mini` à esquerda, `verso` à direita e headset central.
2. Aproximação do headset e fechamento do espaço entre as palavras, acompanhando a rolagem.
3. Dissipação visual por opacidade e passagem suave para roxo com detalhes ciano.
4. Logo original e imagens reais de Avati e Reciclaverso com perspectiva.
5. Continuação para as seções da landing page e uma seleção de projetos reais.

## Onde editar

- `frontend/src/components/ImmersiveIntro.vue`: camadas visuais, composição responsiva, efeitos e controles.
- `frontend/src/utils/introMotion.js`: marcos e curvas da sequência de rolagem.
- `frontend/src/views/Home.vue`: conteúdo e estilos das seções após a abertura.
- `frontend/src/App.vue`: cabeçalho, menu móvel, estilos básicos e rodapé.
- `frontend/public/images/`: arquivos locais das imagens.

Mantidos Vue.js e Node.js, sem nova biblioteca de animação ou renderização 3D.
O headset é um render raster transparente; as peças dos projetos são imagens com perspectiva CSS,
não modelos 3D interativos. Modelos GLB/GLTF reais e uma biblioteca de renderização seriam uma próxima etapa.

## Materiais e procedência

Logo, imagens, títulos e descrições dos três projetos foram reutilizados do site público
https://miniversotech.base44.app/ em 12/09/2026.
Os links de detalhes abrem no site atual, em outra aba; não há páginas novas de projetos nesta versão.
O contato usa o e-mail público do site: `contato@meuminiverso.com`.
O restante do texto-base das seções foi preservado, com uma nova apresentação visual.
Antes da entrega oficial, revisar as afirmações comerciais já existentes com a empresa.

Imagens geradas com a ferramenta integrada de geração de imagens, não CLI:

- `frontend/public/images/vr-headset.png`: 1536×1024, RGBA com transparência real, 1.748.877 bytes.
- `frontend/public/images/cosmic-field.png`: 1536×1024, 1.660.635 bytes.

### Prompt final do headset

```text
Use case: product-mockup
Asset type: transparent raster hero cutout for Miniverso immersive website, intended display 450 by 310 pixels.
Scene/backdrop: genuinely transparent background with real alpha channel, no scenery, no backdrop, no ground plane and no cast shadow on background.
Subject: ONE generic premium virtual reality headset floating, no person, full headset and complete head strap visible. Primarily front-facing, with only a subtle three-quarter turn revealing its right side. Large reflective dark blue smoked-glass front faceplate, rounded charcoal-black casing, believable padded fabric head strap and fine engineered seams.
Style/medium: high-quality photorealistic 3D product render, refined industrial design, physically plausible materials, sharp detailed silhouette.
Composition/framing: landscape 1536x1024, centered headset occupying approximately 80 percent of image width; generous clean transparent margin around entire silhouette, no cropping. Eye-level camera, front panel dominant, head strap arches visibly behind it.
Lighting/mood: soft premium studio lighting, restrained cyan rim light on left edges and violet rim light on right edges, legible charcoal surfaces, mysterious but not underexposed. Highlights remain attached to product, not an ambient background glow.
Constraints: genuine transparent alpha background, one headset only, no brand logos or trademarks, no text, no stars or particles, no controllers, no cables, no watermark, no framing, no checkerboard pattern baked into image.
```

### Prompt final do campo estrelado

```text
Use case: stylized-concept. Asset type: subtle landscape starfield background for a premium immersive Miniverso website intro. Generate a 1536x1024 landscape raster image. Near-black navy background #060710, mysterious quiet dark space. Sparse finely sized tiny white and pale blue stars scattered across entire scene, varying extremely subtly in sharpness and brightness to create depth. Very understated diffuse violet/blue nebula near the center, barely visible; middle must retain generous dark negative space for a foreground VR headset. Elegant restrained art direction, seamless-feeling full viewport backdrop, not gaming wallpaper or dense astrophotography. No spiral, vortex, galaxy object, planets, moon, headset, characters, text, letters, logos or watermark. No large starbursts, no colorful saturation, no dense noise. The stars are sparse light accents, darkness occupies most of the image.
```

## Comportamento e verificação

- Rolagem nativa: não captura roda, não trava a página e não exige esperar um vídeo.
- Sequência reversível ao rolar para cima.
- Atalhos para sobre, projetos e contato; menu funcional no celular.
- Preferência do sistema `prefers-reduced-motion` e controle manual de movimento reduzido.
- Modo reduzido mostra a marca estaticamente e remove o trecho longo de rolagem.
- Partículas limitadas a 32 no celular e 72 no desktop, com densidade máxima 1,5 e desenho a cerca de 30 fps.
- Animação pausada fora da introdução e quando a aba está em segundo plano.
- Imagens locais incluídas no precache da PWA, sem depender do Base44 para renderizar a landing.
- Build aprovado: 13 arquivos no precache, aproximadamente 5,87 MB antes de compressão HTTP.
- Testes: `node --test frontend/src/utils/introMotion.test.js` (4 testes).
- Prévia: `npm run dev --workspace frontend -- --host 127.0.0.1 --port 5187 --strictPort`.

Não foram implementados login, dashboard ou blog: suas rotas existentes continuam na etapa anterior.
Não foi feito teste de perda real de rede na PWA instalada nem medição em aparelho físico.
Os links externos de detalhes e o envio por aplicativo de e-mail dependem de rede/aplicativo externo.
O pacote PNG é adequado ao protótipo; otimização de formato e testes em aparelhos modestos seguem recomendados antes de produção.
