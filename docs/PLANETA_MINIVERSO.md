# Abertura 3D — Planeta Miniverso

Abertura atual do site, integrada em 28/10/2026 na branch `dev`. Substitui a abertura anterior
(registrada em `ENTRADA_VR.md` e `INTRO_IMERSIVA.md`, mantidos como histórico).

O protótipo foi desenvolvido e aprovado por etapas com o Gustavo antes de entrar no site. A ideia é
que só a abertura seja 3D e interativa; abaixo dela o site segue com estrutura tradicional.

## O que a pessoa vê

1. **Capa:** `mini` e `verso` nas laterais do óculos de realidade virtual, rótulos no topo
   ("Um estúdio. Infinitas possibilidades." / "São Luís, Brasil"), frase "O mundo real é só o começo."
   e barra com Role para entrar, Reduzir movimento, Automática e Ir aos projetos.
2. **Entrada:** rolando um pouco, os nomes se juntam e entram no visor; dali a abertura segue sozinha.
   O óculos gira, vem até o rosto, a poeira passa, um anel de calibragem aparece e as lentes se abrem no
   mundo (trecho rápido, ~4 s).
3. **Formação do planeta** (trecho calmo, ~7 s): partículas chegam girando e formam o planeta, que nasce
   como holograma azul com linhas de latitude; uma faixa de luz ciano varre de cima para baixo revelando as
   cores reais, e o nome de cada área acende quando a faixa passa por ela (legenda "Formando o Miniverso").
4. **Planeta:** pode ser girado em qualquer direção. Clicar numa área aproxima a câmera, abre um cartão com
   o texto da área e um botão de interação.
5. **Saída:** rolando além do planeta, a página continua nas seções normais (Sobre, Projetos, Contato).
   Os efeitos da Home (menu flutuante, molduras, cursor) só entram depois que o planeta sai de cena.

### Áreas e interações

| Área | Interações |
|---|---|
| Centro Histórico | Chamar o boi (público comemora na Praça Maria Aragão) |
| Educação | Abrir o observatório · Tocar o recreio |
| Ecologia | Soltar os guarás |
| Jogos | Caçar as gemas · Acerte os blocos · Corrida de kart (placar na tela) |
| Negócios | Apresentar projeto em VR · Decolar o helicóptero |
| Ferrovia | Descarregar vagão · Ir na cabine do trem |
| Porto | Zarpar o navio |
| Lençóis | Passeio de 4x4 |

Também: clicar em qualquer trem leva para a cabine; balões e blocos voadores pulam quando clicados.

### Controles

- **Planeta:** arrastar gira em 360°; setas do teclado também giram.
- **Dentro de uma área:** arrastar gira em volta e inclina até a vista de cima; roda do mouse aproxima;
  setas e `+`/`−` no teclado. Sai pelo botão "Voltar ao planeta" ou Esc.
- **Óculos na capa:** arrastar gira; Enter ou toque no visor acende a tela.
- **Automática:** ligada por padrão; o botão desliga e a escolha fica salva no navegador
  (`localStorage`, chave `miniverso-abertura-auto`). Rolar para cima devolve o controle.
- **Reduzir movimento:** respeita a preferência do sistema e pode ser trocado no botão.

## Onde editar

```text
frontend/src/
  components/MiniversoIntro.vue   capa, textos, botões, cartão da área, placar (HTML e CSS)
  three/
    engine.js        motor: renderização, rolagem, câmera, cliques; createMiniverso() e dispose()
    games.js         minigames da área Jogos e cliques nos brinquedos
    zoneNames.js     nomes das áreas para os rótulos (mesma ordem de world/zones.js)
    intro/headset.js óculos da capa, tela do visor e lentes
    core/            matemática comum (math.js) e qualidade por aparelho (quality.js)
    world/
      palette.js     TODAS as cores do planeta, com comentário de onde cada uma aparece
      reveal.js      holograma e faixa de luz da formação do planeta
      zones.js       nome, texto e botões de cada área
      terrain.js     relevo, mar e platôs das áreas
      rail.js        traçado da ferrovia
      planet.js      monta o planeta, os trens, árvores, nuvens, ilhas e balões
      vehicles.js    carros, ônibus, locomotivas, vagões, navios, rebocador, veleiros e 4x4
      people.js      público e pedestres
      build.js, props.js, textures.js   peças, enfeites e texturas pintadas
      zones/         um arquivo por área (centro, educacao, ecologia, jogos, negocios,
                     ferrovia, porto, lencois)
```

- **Cores:** troque o código em `world/palette.js`. Com `npm run dev:frontend` rodando, basta recarregar.
- **Textos das áreas:** `world/zones.js` (e o nome também em `zoneNames.js`; o teste avisa se divergirem).
- **Textos da capa e botões:** `components/MiniversoIntro.vue`.

## Decisões técnicas

- Three.js já usado pelo site; tudo é gerado no código, sem modelos ou imagens para baixar.
- O 3D vem num pacote separado (`engine-*.js`, ~688 KB, ~187 KB compactado), carregado depois que a
  página aparece. O pacote fica no cache offline da PWA.
- Ao sair da Home (por exemplo, para o login), `dispose()` para a animação, remove os eventos e libera
  a placa de vídeo. Voltar à Home monta de novo.
- Sem WebGL, a capa continua legível e o site segue normalmente.
- Renderização pausa fora da tela e com a aba em segundo plano. Aparelhos com tela estreita ou poucos
  núcleos usam uma versão mais leve (menos detalhe no relevo e menos partículas).
- Fontes da marca: Thunder nos títulos e Random Grotesque nos textos (`assets/styles/fonts.css`).

## Verificação (28/10/2026)

- `npm test`: 5 testes do planeta (suavização, nomes das áreas, ferrovia fechada e rente ao chão,
  terra entre 65% e 85% com áreas no platô, paleta só com cores válidas).
- `npm run build`: aprovado; cache offline com 29 entradas (~5,9 MB).
- Teste de fumaça do motor em Node (fora do repositório): abertura completa, as 8 áreas com suas
  interações, minigames, cabine do trem e `dispose()` removendo todos os eventos da janela.
- Navegador (servidor local, 1024×768 e 375×812): capa, abertura automática até o planeta, Centro
  Histórico aberto, volta ao planeta, passagem para as seções, ida ao login e volta à Home sem erros.

## Pendências e limites

- **Desempenho em celular físico** ainda não medido (o painel de testes estava em segundo plano, o que
  invalida a contagem de quadros). O planeta tem cerca de 148 mil triângulos.
- **Licença da Thunder:** a pasta do kit da marca não traz arquivo de licença; confirmar com a Miniverso.
  Random Grotesque Standard é gratuita para uso comercial (licença no kit).
- **Marcas de terceiros:** os nomes das áreas são genéricos. A logo da Vale na locomotiva (há uma placa
  lisa reservada no capô) só entra com o arquivo oficial e autorização.
- Não é WebXR nem visão estereoscópica real: é uma experiência 3D numa página convencional.
