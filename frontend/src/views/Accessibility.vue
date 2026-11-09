<template>
  <!-- Página de acessibilidade: o que o site oferece, como navegar sem mouse, limites conhecidos e como relatar
       uma barreira (pedido da documentação de conformidade). -->
  <article class="a11y-page" aria-labelledby="a11y-page-title">
    <p class="eyebrow">Acessibilidade</p>
    <h1 id="a11y-page-title">Um universo para todo mundo</h1>
    <p class="lede">A Miniverso quer que qualquer pessoa consiga conhecer o estúdio, os projetos e o planeta. Este site segue as orientações da WCAG 2.2 (nível AA) e do eMAG, e continua sendo revisado.</p>

    <section aria-labelledby="rec">
      <h2 id="rec">Recursos do painel de acessibilidade</h2>
      <p>O botão <strong>Acessibilidade</strong>, no topo de todas as páginas, abre o painel. As escolhas ficam salvas neste aparelho.</p>
      <ul>
        <li><strong>Texto maior:</strong> aumenta textos e botões das seções.</li>
        <li><strong>Alto contraste:</strong> clareia os textos e reforça bordas.</li>
        <li><strong>Menos movimento:</strong> desliga animações, brilhos e a abertura automática do planeta. O site também respeita a opção de reduzir movimento do sistema.</li>
        <li><strong>Fonte mais legível:</strong> troca por letras mais abertas e espaçadas.</li>
        <li><strong>Destacar links:</strong> sublinha todos os links.</li>
        <li><strong>Tradutor de Libras:</strong> abre o VLibras, ferramenta gratuita do Governo Federal que traduz o texto para a Língua Brasileira de Sinais. Ele só é carregado quando você liga a opção.</li>
      </ul>
    </section>

    <section aria-labelledby="tec">
      <h2 id="tec">Navegação pelo teclado</h2>
      <ul>
        <li><kbd>Tab</kbd> e <kbd>Shift</kbd> + <kbd>Tab</kbd> passam pelos links e botões, sempre com o foco visível.</li>
        <li>O primeiro <kbd>Tab</kbd> mostra o atalho <strong>Pular para o conteúdo</strong>.</li>
        <li><kbd>Esc</kbd> fecha janelas, o painel de acessibilidade e os jogos.</li>
        <li>No planeta, os nomes das áreas e os pontos de interesse são botões; o cartão da área descreve em texto tudo o que aparece em 3D.</li>
      </ul>
    </section>

    <section aria-labelledby="leitor">
      <h2 id="leitor">Leitores de tela</h2>
      <p>As páginas têm idioma definido (português do Brasil), títulos em ordem, regiões nomeadas e textos alternativos nas imagens que trazem informação. Imagens só decorativas ficam ocultas para o leitor de tela. O planeta 3D tem descrição em texto, e todo o conteúdo dele também está nas seções do site.</p>
    </section>

    <section aria-labelledby="lim">
      <h2 id="lim">Limites conhecidos</h2>
      <ul>
        <li>Os minijogos do planeta dependem de visão e de reação rápida. Eles são opcionais e não escondem nenhuma informação do site.</li>
        <li>Vídeos de projetos podem não ter legenda ou audiodescrição; estamos revisando cada um.</li>
      </ul>
    </section>

    <section aria-labelledby="rel">
      <h2 id="rel">Encontrou uma barreira?</h2>
      <p>Conte para a gente o que aconteceu, em que página e com qual aparelho ou tecnologia assistiva. Vamos responder e corrigir.</p>
      <router-link class="btn" :to="{ path: '/', hash: '#contato' }">Relatar uma barreira</router-link>
    </section>

    <p class="updated">Última revisão: novembro de 2026.</p>
  </article>
</template>

<style scoped>
.a11y-page { max-width: 760px; margin: 0 auto; padding: 140px 0 80px; color: #eef1fa; font-family: var(--font-body); }
.eyebrow { margin: 0 0 10px; color: #7cdeef; font: 700 12px/1 var(--font-body); letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: 0 0 18px; font: 500 clamp(34px, 6vw, 56px)/1.05 var(--font-title); }
h2 { margin: 40px 0 12px; font: 700 21px/1.3 var(--font-body); }
.lede { font-size: 18px; line-height: 1.6; color: #d8dcec; }
p, li { font-size: 16px; line-height: 1.7; color: #d8dcec; }
ul { padding-left: 20px; display: grid; gap: 6px; }
strong { color: #fff; }
kbd { display: inline-block; padding: 1px 7px; border: 1px solid rgba(255, 255, 255, .35); border-bottom-width: 2px; border-radius: 6px; font: 600 13px var(--font-body); color: #fff; background: rgba(255, 255, 255, .06); }
.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 22px; border-radius: 999px; background: #f3f4fa; color: #111223; font: 700 14px var(--font-body); text-decoration: none; margin-top: 6px; }
.btn:hover { background: #fff; }
.updated { margin-top: 48px; font-size: 13px; color: #a9afc6; }
@media (max-width: 700px) { .a11y-page { padding: 110px 6% 60px; } }
</style>
