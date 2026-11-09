<template>
  <div class="dashboard-shell">
    <aside class="admin-sidebar">
      <router-link to="/" class="admin-brand" aria-label="Ir para o site"><img src="/images/miniverso-logo.png" alt="Miniverso"></router-link>
      <nav class="side-nav" aria-label="Seções do painel">
        <button v-for="item in nav" :key="item.id" :class="{ active: tab === item.id }" :aria-current="tab === item.id ? 'page' : null" @click="tab = item.id">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="item.icon" /></svg>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
      <div class="side-foot">
        <a class="site-link" href="/#portfolio" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>Ver o site
        </a>
        <button class="site-link out" type="button" @click="logout">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></svg>Sair
        </button>
      </div>
    </aside>

    <main class="admin-main">
      <header class="main-head">
        <div>
          <p class="eyebrow">{{ today }}</p>
          <h1>{{ tab === 'overview' ? greeting : currentTitle }}</h1>
          <p class="lede">{{ lede }}</p>
        </div>
        <button v-if="tab === 'projects'" class="primary" type="button" @click="newProject"><span aria-hidden="true">+</span> Novo projeto</button>
        <button v-else-if="tab === 'clients'" class="primary" type="button" @click="newClient"><span aria-hidden="true">+</span> Novo projeto de cliente</button>
        <button v-else-if="tab === 'news'" class="primary" type="button" @click="newNews"><span aria-hidden="true">+</span> Nova novidade</button>
      </header>

      <Transition name="swap" mode="out-in">
        <!-- Visão geral -->
        <section v-if="tab === 'overview'" key="overview">
          <div class="metrics">
            <button class="metric" type="button" style="--d:0ms" @click="tab = 'projects'">
              <span class="m-label">No site agora</span>
              <strong><CountUp :value="publishedCount" /><em>/ {{ projects.length }}</em></strong>
              <small>projetos publicados no portfólio</small>
            </button>
            <button class="metric ring-metric" type="button" style="--d:80ms" @click="tab = 'clients'">
              <div>
                <span class="m-label">Em andamento</span>
                <strong><CountUp :value="activeClients.length" /></strong>
                <small>projetos de clientes</small>
              </div>
              <span class="ring" :aria-label="`Avanço médio de ${averageProgress}%`">
                <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" class="r-track" /><circle cx="32" cy="32" r="27" class="r-fill" :style="{ strokeDashoffset: 169.6 * (1 - averageProgress / 100) }" /></svg>
                <b><CountUp :value="averageProgress" />%</b>
              </span>
            </button>
            <button class="metric accent" type="button" style="--d:160ms" @click="nextDue && editClient(nextDue.client)">
              <span class="m-label">Próxima entrega</span>
              <template v-if="nextDue">
                <strong><CountUp :value="Math.max(0, nextDue.days)" /><em>{{ nextDue.days === 1 ? 'dia' : 'dias' }}</em></strong>
                <small>{{ nextDue.client.cliente }} · {{ formatDate(nextDue.client.prazo) }}</small>
              </template>
              <template v-else><strong>—</strong><small>Nenhuma entrega marcada</small></template>
            </button>
          </div>

          <div class="grid-2">
            <article class="panel">
              <div class="panel-head"><h2>Projetos em andamento</h2><button class="link" type="button" @click="tab = 'clients'">Ver todos</button></div>
              <button v-for="client in byDeadline" :key="client.id" class="row" type="button" @click="editClient(client)">
                <span class="row-name"><b>{{ client.cliente }}</b><small>{{ client.projeto }}</small></span>
                <span class="row-stage">
                  <span class="dots" aria-hidden="true"><i v-for="(s, i) in STAGES" :key="s" :class="{ on: i <= stageIndex(client.progresso) }" /></span>
                  <small>{{ client.status === 'Concluído' ? 'Entregue' : STAGES[stageIndex(client.progresso)] }}</small>
                </span>
                <span class="badge" :class="dueClass(client)">{{ dueText(client) }}</span>
              </button>
            </article>
            <article class="panel">
              <div class="panel-head"><h2>Mais vistos no site</h2><button class="link" type="button" @click="tab = 'projects'">Portfólio</button></div>
              <div v-for="r in topViewed" :key="r.p.id" class="row static">
                <span class="row-name"><b>{{ r.p.titulo }}</b><small>{{ r.views }} {{ r.views === 1 ? 'visita' : 'visitas' }} · {{ r.leads }} {{ r.leads === 1 ? 'contato' : 'contatos' }}</small></span>
                <span class="bar-mini" aria-hidden="true"><i :style="{ width: (topViewed[0].views ? r.views / topViewed[0].views * 100 : 0) + '%' }" /></span>
              </div>
              <p v-if="!topViewed.length || !topViewed[0].views" class="empty small">As visitas às páginas dos projetos aparecem aqui.</p>
            </article>
            <article class="panel feed">
              <div class="panel-head"><h2>Atividade recente</h2></div>
              <TransitionGroup tag="ol" name="feed">
                <li v-for="a in activity.slice(0, 5)" :key="a.id">
                  <span class="feed-ico" :class="a.icon" aria-hidden="true">{{ icons[a.icon] || '•' }}</span>
                  <span class="feed-text">{{ a.text }}<small>{{ relTime(a.at) }}</small></span>
                </li>
              </TransitionGroup>
            </article>
          </div>
        </section>

        <!-- Portfólio -->
        <section v-else-if="tab === 'projects'" key="projects">
          <div class="toolbar">
            <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg><input v-model="query" type="search" placeholder="Buscar projeto" aria-label="Buscar projeto"></label>
            <div class="chips" role="group" aria-label="Filtrar por setor">
              <button v-for="s in sectorFilters" :key="s" type="button" :class="{ on: sector === s }" @click="sector = s">{{ s }}</button>
            </div>
          </div>
          <p class="tip">Arraste os cartões (ou use as setas) para mudar a ordem em que aparecem no site.</p>
          <TransitionGroup tag="div" name="list" class="project-grid">
            <article v-for="project in filteredProjects" :key="project.id" class="project" :class="{ draft: !project.publicado, dragging: dragId === project.id, over: overId === project.id }"
              draggable="true" @dragstart="dragStart(project, $event)" @dragover.prevent="overId = project.id" @dragleave="overId === project.id && (overId = null)" @drop.prevent="dropOn(project)" @dragend="dragId = overId = null">
              <button class="thumb" type="button" :aria-label="`Editar ${project.titulo}`" @click="editProject(project)">
                <img :src="project.url_imagem" alt="" loading="lazy">
                <span class="state" :class="{ live: isLive(project), sched: project.publicado && !isLive(project) }">{{ stateText(project) }}</span>
                <span v-if="project.vitrine === false" class="state off-home">Fora da página inicial</span>
                <span class="edit-hint" aria-hidden="true">Editar</span>
              </button>
              <div class="project-body">
                <span class="kicker">{{ project.setor }}<template v-if="project.tags?.length"> · {{ project.tags.slice(0, 2).join(' · ') }}</template></span>
                <h3>{{ project.titulo }}</h3>
                <p class="p-stats"><span title="Visitas à página do projeto">👁 {{ stats[project.id]?.views || 0 }}</span><span title="Cliques em Conte sua ideia">✉ {{ stats[project.id]?.leads || 0 }}</span><span v-if="project.galeria?.length" title="Itens na galeria">🖼 {{ project.galeria.length }}</span></p>
                <div class="project-actions">
                  <label class="switch" :title="project.publicado ? 'Tirar do site' : 'Publicar no site'">
                    <input v-model="project.publicado" type="checkbox" @change="togglePublish(project)"><span class="knob" aria-hidden="true" />{{ project.publicado ? 'Publicado' : 'Publicar' }}
                  </label>
                  <button class="icon-btn star" :class="{ on: project.destaque }" type="button" :aria-pressed="project.destaque" :title="project.destaque ? 'Tirar dos destaques' : 'Destacar'" @click="toggleFeature(project)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg>
                  </button>
                  <button class="icon-btn" type="button" title="Editar" :aria-label="`Editar ${project.titulo}`" @click="editProject(project)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>
                  </button>
                  <span class="order-btns">
                    <button class="icon-btn" type="button" title="Mover para antes" :aria-label="`Mover ${project.titulo} para antes`" @click="move(project, -1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
                    <button class="icon-btn" type="button" title="Mover para depois" :aria-label="`Mover ${project.titulo} para depois`" @click="move(project, 1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
                  </span>
                </div>
              </div>
            </article>
          </TransitionGroup>
          <p v-if="!filteredProjects.length" class="empty">Nenhum projeto encontrado.</p>
        </section>

        <!-- Novidades: avisos curtos numa faixa da página inicial -->
        <section v-else-if="tab === 'news'" key="news">
          <p class="tip">Avisos curtos que passam numa faixa da página inicial (sem virar blog). Arraste para mudar a ordem.</p>
          <TransitionGroup tag="div" name="list" class="news-list">
            <article v-for="n in news" :key="n.id" class="news-item" :class="{ draft: !n.publicado }" draggable="true" @dragstart="newsDrag = n" @dragover.prevent @drop.prevent="dropNews(n)">
              <span class="news-date">{{ formatDate(n.data) }}</span>
              <p class="news-text">{{ n.texto }}<a v-if="n.link" class="news-link" :href="n.link" target="_blank" rel="noopener">{{ n.link }}</a></p>
              <label class="switch"><input v-model="n.publicado" type="checkbox" @change="saveNewsAndToast(n)"><span class="knob" aria-hidden="true" />{{ n.publicado ? 'No site' : 'Oculta' }}</label>
              <button class="icon-btn" type="button" title="Editar" @click="editNews(n)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg></button>
            </article>
          </TransitionGroup>
          <p v-if="!news.length" class="empty">Nenhuma novidade ainda. Toque em Nova novidade.</p>
        </section>

        <!-- Projetos de clientes -->
        <section v-else key="clients">
          <div class="status-board" role="group" aria-label="Filtrar por status">
            <button v-for="s in statusCards" :key="s.name" type="button" :class="[s.cls, { on: status === s.name }]" :aria-pressed="status === s.name" @click="status = status === s.name ? 'Todos' : s.name">
              <span class="sb-label">{{ s.name }}</span>
              <strong><CountUp :value="s.count" /></strong>
              <span class="sb-bar"><i :style="{ width: (clients.length ? s.count / clients.length * 100 : 0) + '%' }" /></span>
            </button>
          </div>
          <p class="tip">
            <span v-if="status === 'Todos'">Toque numa etapa para mover o projeto. Toque num status para filtrar.</span>
            <span v-else>Mostrando: {{ status }}</span>
            <button v-if="status !== 'Todos'" class="link" type="button" @click="status = 'Todos'">Mostrar todos</button>
          </p>
          <TransitionGroup tag="div" name="list" class="client-list">
            <article v-for="client in filteredClients" :key="client.id" class="client-card" :class="[statusClass(client.status), { late: dueClass(client) === 'late' }]">
              <div class="client-head">
                <span class="mono" aria-hidden="true">{{ initials(client.cliente) }}</span>
                <div class="ch-title">
                  <h3>{{ client.cliente }}</h3>
                  <p>{{ client.projeto }}</p>
                </div>
                <span class="pct" :aria-label="`${client.progresso}% concluído`">
                  <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="r-track" /><circle cx="24" cy="24" r="20" class="r-fill" :style="{ strokeDashoffset: 125.7 * (1 - client.progresso / 100) }" /></svg>
                  <b>{{ client.progresso }}<small>%</small></b>
                </span>
              </div>
              <div class="client-meta">
                <span class="status-chip" :class="statusClass(client.status)">{{ client.status }}</span>
                <span v-if="client.atualizado" class="updated">Atualizado {{ relTime(client.atualizado) }}</span>
              </div>
              <ol class="timeline" :style="{ '--p': stageProgress(client) }">
                <li v-for="(s, i) in STAGES" :key="s" :class="{ done: i < stageIndex(client.progresso) || client.progresso >= 100, now: i === stageIndex(client.progresso) && client.progresso < 100 }">
                  <button type="button" :aria-label="`Mover ${client.cliente} para ${s}`" @click="setStage(client, i)">
                    <span class="node"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="stageIcons[i]" /></svg></span>
                    <span class="st-name">{{ s }}</span>
                  </button>
                </li>
              </ol>
              <p class="now-line">
                <template v-if="client.progresso >= 100">✓ Projeto entregue ao cliente</template>
                <template v-else><span>Agora</span> {{ STAGES[stageIndex(client.progresso)] }}<template v-if="client.etapa"> · {{ client.etapa }}</template></template>
              </p>
              <div class="client-foot">
                <span class="date"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>Entrega <b>{{ formatDate(client.prazo) }}</b></span>
                <span class="badge" :class="dueClass(client)">{{ dueText(client) }}</span>
                <button class="icon-btn" type="button" title="Editar" :aria-label="`Editar ${client.cliente}`" @click="editClient(client)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>
                </button>
              </div>
            </article>
          </TransitionGroup>
          <p v-if="!filteredClients.length" class="empty">Nenhum projeto com esse status.</p>
        </section>
      </Transition>

      <div class="demo-foot">
        <span v-if="!cloudOn"><i /> Modo demonstração: as mudanças ficam salvas neste navegador. Ligue a nuvem (docs/SUPABASE.md) para todo mundo ver.</span>
        <span v-else :class="['cloud', sync.state]"><i /> {{ ({ loading: 'Conectando à nuvem…', ok: 'Salvo na nuvem: o site mostra para todo mundo.', saving: 'Salvando na nuvem…', error: 'Não consegui falar com a nuvem. As mudanças estão neste navegador; tente de novo.' })[sync.state] || '' }}</span>
        <button v-if="!cloudOn" class="link" type="button" @click="resetAll">Restaurar dados de exemplo</button>
      </div>
    </main>

    <!-- Gaveta de edição: projeto do portfólio (abas: básico, página, galeria, resultados e publicação) -->
    <dialog ref="projectDialog" class="drawer wide" @close="editingProject = null" @click.self="projectDialog.close()">
      <form @submit.prevent="saveProject">
        <header><h2>{{ editingProject?.id ? 'Editar projeto' : 'Novo projeto' }}</h2><button type="button" class="close" aria-label="Fechar" @click="projectDialog.close()">×</button></header>
        <nav class="d-tabs" role="tablist">
          <button v-for="t in DRAWER_TABS" :key="t.id" type="button" role="tab" :aria-selected="dtab === t.id" :class="{ on: dtab === t.id }" @click="dtab = t.id">{{ t.label }}</button>
        </nav>

        <div v-show="dtab === 'basic'" class="d-pane">
          <div class="preview"><img :src="projectDraft.url_imagem" alt="" @error="$event.target.style.opacity = .15" @load="$event.target.style.opacity = 1"></div>
          <label>Título<input v-model="projectDraft.titulo" required placeholder="Nome do projeto"></label>
          <div class="fields"><label>Setor<input v-model="projectDraft.setor" required list="sector-list" placeholder="Ex.: Educação"></label><label>Categoria<input v-model="projectDraft.categoria" required placeholder="Ex.: Realidade virtual"></label></div>
          <datalist id="sector-list"><option v-for="s in sectorFilters.slice(1)" :key="s" :value="s" /></datalist>
          <label>Descrição<textarea v-model="projectDraft.descricao" required rows="3" placeholder="Uma frase sobre o projeto" /></label>
          <div class="img-pick">
            <label>Imagem de capa<input v-model="projectDraft.url_imagem" required placeholder="Link da imagem ou envie um arquivo"></label>
            <label class="file-btn">Enviar imagem<input type="file" accept="image/*" @change="pickCover"></label>
          </div>
          <label>Link do projeto<input v-model="projectDraft.url" placeholder="https://"></label>
          <label>Categorias (tags)<input v-model="tagsText" placeholder="Realidade virtual, Educação, Gamificação"><small class="hint">Separe por vírgula. Viram filtros na página de projetos.</small></label>
          <div class="tag-suggest"><button v-for="t in tagSuggestions" :key="t" type="button" @click="addTag(t)">+ {{ t }}</button></div>
        </div>

        <div v-show="dtab === 'page'" class="d-pane">
          <p class="hint">O que aparece na página do projeto no site.</p>
          <div class="fields"><label>Cliente<input v-model="detailDraft.cliente" placeholder="Ex.: SEBRAE-Maranhão"></label><label>Onde / quando<input v-model="detailDraft.ocasiao" placeholder="Ex.: Feira do Empreendedor 2024"></label></div>
          <label>Tecnologia<input v-model="detailDraft.plataforma" placeholder="Ex.: Realidade virtual"></label>
          <label>Resumo<textarea v-model="detailDraft.resumo" rows="3" placeholder="Duas ou três frases contando o projeto" /></label>
          <label>O desafio (título)<input v-model="detailDraft.desafio.titulo"></label>
          <label>O desafio (texto)<textarea v-model="detailDraft.desafio.texto" rows="3" /></label>
          <label>A solução (título)<input v-model="detailDraft.solucao.titulo"></label>
          <label>A solução (texto)<textarea v-model="detailDraft.solucao.texto" rows="3" /></label>
          <span class="sub-h">Destaques (número e legenda)</span>
          <div v-for="(d, k) in detailDraft.destaques" :key="k" class="fields pair"><input v-model="d[0]" placeholder="Ex.: 12" aria-label="Número"><input v-model="d[1]" placeholder="Ex.: paradas na trilha" aria-label="Legenda"></div>
        </div>

        <div v-show="dtab === 'gallery'" class="d-pane">
          <p class="hint">Fotos e vídeos da página do projeto. Arraste arquivos aqui ou cole um link (imagem, YouTube ou vídeo).</p>
          <label class="dropzone" :class="{ over: dropOver }" @dragover.prevent="dropOver = true" @dragleave="dropOver = false" @drop.prevent="dropFiles">
            <input type="file" accept="image/*,video/*" multiple @change="pickFiles($event.target.files)">
            <span>{{ uploading ? 'Enviando…' : 'Arraste fotos ou vídeos aqui, ou toque para escolher' }}</span>
          </label>
          <div class="img-pick"><input v-model="galleryLink" placeholder="https://youtube.com/watch?v=… ou link de imagem"><button type="button" class="ghost-btn" @click="addLink">Adicionar</button></div>
          <ul class="gal-grid">
            <li v-for="(m, k) in projectDraft.galeria" :key="m.url + k" :class="{ cover: m.url === projectDraft.url_imagem }">
              <img v-if="m.type === 'img'" :src="m.url" alt="">
              <span v-else class="vid">▶ {{ m.type === 'youtube' ? 'YouTube' : 'Vídeo' }}</span>
              <div class="gal-acts">
                <button v-if="m.type === 'img'" type="button" title="Usar como capa" @click="projectDraft.url_imagem = m.url">★</button>
                <button type="button" title="Mover para antes" @click="moveMedia(k, -1)">‹</button>
                <button type="button" title="Mover para depois" @click="moveMedia(k, 1)">›</button>
                <button type="button" title="Remover" @click="projectDraft.galeria.splice(k, 1)">×</button>
              </div>
            </li>
          </ul>
        </div>

        <div v-show="dtab === 'results'" class="d-pane">
          <span class="sub-h">Resultados em números</span>
          <div v-for="(r, k) in projectDraft.resultados" :key="k" class="fields pair"><input v-model="r[0]" placeholder="Ex.: 3.200" aria-label="Número"><input v-model="r[1]" placeholder="Ex.: pessoas jogaram" aria-label="O quê"><button type="button" class="ghost-btn" aria-label="Remover" @click="projectDraft.resultados.splice(k, 1)">×</button></div>
          <button type="button" class="ghost-btn" @click="projectDraft.resultados.push(['', ''])">+ Resultado</button>
          <span class="sub-h">Depoimento do cliente</span>
          <label>Frase<textarea v-model="projectDraft.depoimento.texto" rows="3" placeholder="O que o cliente disse sobre o projeto" /></label>
          <div class="fields"><label>Nome<input v-model="projectDraft.depoimento.autor"></label><label>Cargo e empresa<input v-model="projectDraft.depoimento.cargo"></label></div>
        </div>

        <div v-show="dtab === 'publish'" class="d-pane">
          <div class="toggles col">
            <label class="switch"><input v-model="projectDraft.publicado" type="checkbox"><span class="knob" aria-hidden="true" />Mostrar no site</label>
            <label class="switch"><input v-model="projectDraft.vitrine" type="checkbox"><span class="knob" aria-hidden="true" />Aparecer na página inicial (carrossel e portais)</label>
            <label class="switch"><input v-model="projectDraft.destaque" type="checkbox"><span class="knob" aria-hidden="true" />Destaque</label>
          </div>
          <label>Entrar no ar em (opcional)<input v-model="projectDraft.publicarEm" type="datetime-local"><small class="hint">Com data, o projeto publicado só aparece no site a partir dela.</small></label>
          <button type="button" class="ghost-btn wide" @click="preview">Pré-visualizar a página do projeto ↗</button>
        </div>

        <div class="drawer-actions"><HoldButton v-if="editingProject?.id" @confirm="removeProject" /><button class="primary" type="submit">Salvar</button></div>
      </form>
    </dialog>

    <!-- Gaveta: novidade -->
    <dialog ref="newsDialog" class="drawer" @close="editingNews = null" @click.self="newsDialog.close()">
      <form @submit.prevent="saveOneNews">
        <header><h2>{{ editingNews?.id ? 'Editar novidade' : 'Nova novidade' }}</h2><button type="button" class="close" aria-label="Fechar" @click="newsDialog.close()">×</button></header>
        <label>Texto <small class="hint">({{ newsDraft.texto.length }}/140)</small><textarea v-model="newsDraft.texto" required maxlength="140" rows="3" placeholder="Ex.: Acabamos de entregar o simulador do Projeto Horizonte!" /></label>
        <label>Link (opcional)<input v-model="newsDraft.link" placeholder="/projetos/reciclaverso ou https://"></label>
        <label>Data<input v-model="newsDraft.data" type="date" required></label>
        <label class="switch"><input v-model="newsDraft.publicado" type="checkbox"><span class="knob" aria-hidden="true" />Mostrar no site</label>
        <div class="drawer-actions"><HoldButton v-if="editingNews?.id" @confirm="removeNews" /><button class="primary" type="submit">Salvar</button></div>
      </form>
    </dialog>

    <!-- Gaveta de edição: projeto de cliente -->
    <dialog ref="clientDialog" class="drawer" @close="editingClient = null" @click.self="clientDialog.close()">
      <form @submit.prevent="saveClient">
        <header><h2>{{ editingClient?.id ? editingClient.cliente : 'Novo projeto de cliente' }}</h2><button type="button" class="close" aria-label="Fechar" @click="clientDialog.close()">×</button></header>
        <label>Cliente<input v-model="clientDraft.cliente" required placeholder="Nome do cliente ou projeto"></label>
        <label>Projeto<input v-model="clientDraft.projeto" required placeholder="O que está sendo feito"></label>
        <div class="stage-pick">
          <span>Etapa</span>
          <div class="seg">
            <button v-for="(s, i) in STAGES" :key="s" type="button" :class="{ on: stageIndex(clientDraft.progresso) === i }" @click="pickStage(i)">{{ s }}</button>
          </div>
        </div>
        <label class="range"><span>Progresso <b>{{ clientDraft.progresso }}%</b></span>
          <input v-model.number="clientDraft.progresso" type="range" min="0" max="100" step="5" :style="{ '--p': clientDraft.progresso + '%' }" @input="syncStatus">
        </label>
        <div class="fields"><label>Data de entrega<input v-model="clientDraft.prazo" type="date" required></label><label>Status<select v-model="clientDraft.status"><option v-for="s in STATUSES" :key="s">{{ s }}</option></select></label></div>
        <label>Observação da etapa<input v-model="clientDraft.etapa" placeholder="Ex.: Validação do protótipo"></label>
        <div class="drawer-actions"><HoldButton v-if="editingClient?.id" @confirm="removeClient" /><button class="primary" type="submit">Salvar</button></div>
      </form>
    </dialog>

    <TransitionGroup tag="div" name="toast" class="toasts" aria-live="polite">
      <p v-for="t in toasts" :key="t.id" class="toast"><span aria-hidden="true">{{ t.icon }}</span>{{ t.text }}</p>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import HoldButton from '../components/HoldButton.vue';
import { SESSION_KEY, STAGES, detailOf, emptyDetail, isLive, normalizeProject, stageIndex, useProjectStore } from '../utils/projectStore.js';
import { cloud, cloudOn } from '../utils/cloud.js';

const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Número que conta até o valor (e anima quando o valor muda).
const CountUp = defineComponent({
  props: { value: { type: Number, default: 0 } },
  setup(props) {
    const shown = ref(reduced ? props.value : 0); let raf = 0;
    const run = (to) => {
      cancelAnimationFrame(raf); const from = shown.value, t0 = performance.now(), dur = 900;
      if (reduced || from === to) { shown.value = to; return; }
      const step = (n) => { const k = Math.min(1, (n - t0) / dur), e = 1 - (1 - k) ** 3; shown.value = Math.round(from + (to - from) * e); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    onMounted(() => run(props.value)); watch(() => props.value, run); onUnmounted(() => cancelAnimationFrame(raf));
    return () => h('span', shown.value);
  }
});

const router = useRouter();
const { projects, clients, activity, news, stats, sync, saveProjects, deleteProject, saveNews, deleteNews, saveClients, log, resetDemo, loadStats } = useProjectStore();
loadStats();
const tab = ref('overview');
const STATUSES = ['Planejamento', 'Em produção', 'Em validação', 'Concluído'];
// Progresso e status de cada etapa quando o projeto é movido para ela.
const STAGE_PROGRESS = [5, 25, 50, 80, 100];
const STAGE_STATUS = ['Planejamento', 'Planejamento', 'Em produção', 'Em validação', 'Concluído'];

const publishedCount = computed(() => projects.value.filter(p => isLive(p)).length);
const topViewed = computed(() => projects.value.map(p => ({ p, views: stats.value[p.id]?.views || 0, leads: stats.value[p.id]?.leads || 0 })).sort((a, b) => b.views - a.views).slice(0, 4));
const activeClients = computed(() => clients.value.filter(c => c.status !== 'Concluído'));
const averageProgress = computed(() => { const list = activeClients.value; return list.length ? Math.round(list.reduce((s, c) => s + Number(c.progresso || 0), 0) / list.length) : 0; });

const nav = [
  { id: 'overview', label: 'Visão geral', icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z' },
  { id: 'projects', label: 'Portfólio', icon: 'M4 6h16v12H4zM4 14l4.5-4 4 3.5 2.5-2 5 4.5' },
  { id: 'clients', label: 'Clientes', icon: 'M5 19V9M12 19V5M19 19v-7' },
  { id: 'news', label: 'Novidades', icon: 'M4 10v4h3l6 4V6L7 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11' }
];
const currentTitle = computed(() => ({ overview: 'Visão geral', projects: 'Portfólio', clients: 'Projetos de clientes', news: 'Novidades' })[tab.value]);
const hour = new Date().getHours();
const greeting = hour < 12 ? 'Bom dia, equipe.' : hour < 18 ? 'Boa tarde, equipe.' : 'Boa noite, equipe.';
const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const lede = computed(() => ({
  overview: 'Um resumo do estúdio hoje.',
  projects: 'O que estiver publicado aparece na seção Projetos do site.',
  clients: 'Cada projeto passa por cinco etapas, do briefing à entrega.',
  news: 'Avisos curtos que aparecem numa faixa da página inicial.'
})[tab.value]);

// Datas e prazos
const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const daysLeft = (iso) => { if (!isISO(iso)) return null; const [y, m, d] = iso.split('-').map(Number); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - t) / 86400000); };
const formatDate = (v) => { if (!isISO(v)) return v || '—'; const [y, m, d] = v.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d)).replace(/\./g, ''); };
const dueText = (c) => { if (c.status === 'Concluído') return 'Entregue'; const d = daysLeft(c.prazo); if (d === null) return 'Sem data'; if (d < 0) return `${-d} ${-d === 1 ? 'dia' : 'dias'} de atraso`; if (d === 0) return 'Hoje'; if (d === 1) return 'Amanhã'; return `Em ${d} dias`; };
const dueClass = (c) => { if (c.status === 'Concluído') return 'ok'; const d = daysLeft(c.prazo); if (d === null) return ''; return d < 0 ? 'late' : d <= 7 ? 'soon' : ''; };
const byDeadline = computed(() => [...clients.value].sort((a, b) => (a.status === 'Concluído') - (b.status === 'Concluído') || (daysLeft(a.prazo) ?? 1e9) - (daysLeft(b.prazo) ?? 1e9)).slice(0, 4));
const nextDue = computed(() => activeClients.value.map(c => ({ client: c, days: daysLeft(c.prazo) })).filter(x => x.days !== null).sort((a, b) => a.days - b.days)[0] || null);
const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const now = ref(Date.now()); const clock = setInterval(() => { now.value = Date.now(); }, 30000);
const relTime = (t) => { const s = Math.round((t - now.value) / 1000); if (s > -60) return 'agora mesmo'; const m = Math.round(s / 60); if (m > -60) return rtf.format(m, 'minute'); const hh = Math.round(m / 60); if (hh > -24) return rtf.format(hh, 'hour'); return rtf.format(Math.round(hh / 24), 'day'); };
const stageProgress = (c) => (c.progresso >= 100 ? 1 : stageIndex(c.progresso) / (STAGES.length - 1));
const statusCards = computed(() => STATUSES.map(name => ({ name, cls: statusClass(name), count: clients.value.filter(c => c.status === name).length })));
const initials = (name) => (name || '?').replace(/^projeto\s+/i, '').split(/\s+/).filter(Boolean).reduce((acc, w, i, all) => acc + (all.length === 1 ? w.slice(0, 2) : i < 2 ? w[0] : ''), '').toUpperCase();
// Ícones das etapas: conversa (briefing), documento (roteiro), cubo (produção), visto (validação), bandeira (entrega).
const stageIcons = ['M5 5h14v10H9l-4 4z', 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5', 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5', 'M5 12.5l4.5 4.5L19 7', 'M6 21V4M6 4h11l-2.5 4L17 12H6'];
const statusClass = (s) => ({ 'Planejamento': 'plan', 'Em produção': 'prod', 'Em validação': 'valid', 'Concluído': 'done' })[s] || 'plan';
const icons = { publish: '↗', unpublish: '↘', star: '★', progress: '▲', done: '✓', edit: '✎', add: '+', remove: '×', reset: '↺' };

// Filtros
const query = ref(''); const sector = ref('Todos');
const sectorFilters = computed(() => ['Todos', ...[...new Set(projects.value.map(p => p.setor))].sort()]);
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filteredProjects = computed(() => projects.value.filter(p => (sector.value === 'Todos' || p.setor === sector.value) && (!query.value || norm(`${p.titulo} ${p.categoria} ${p.setor}`).includes(norm(query.value)))));
const status = ref('Todos');
const statusFilters = computed(() => [{ name: 'Todos', count: clients.value.length }, ...STATUSES.map(name => ({ name, count: clients.value.filter(c => c.status === name).length }))]);
const filteredClients = computed(() => clients.value.filter(c => status.value === 'Todos' || c.status === status.value));

// Avisos
const toasts = ref([]);
const toast = (icon, text) => { const id = Date.now() + Math.random(); toasts.value.push({ id, icon, text }); setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 2800); };

// Portfólio
const stateText = (p) => (!p.publicado ? 'Rascunho' : isLive(p) ? 'No site' : `Agendado · ${new Date(p.publicarEm).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`);
const togglePublish = (p) => { saveProjects(); log(p.publicado ? 'publish' : 'unpublish', p.publicado ? `${p.titulo} foi publicado no site` : `${p.titulo} saiu do site`); toast(p.publicado ? '↗' : '↘', p.publicado ? (isLive(p) ? `${p.titulo} agora aparece no site` : `${p.titulo} entra no ar na data marcada`) : `${p.titulo} saiu do site`); };
const toggleFeature = (p) => { p.destaque = !p.destaque; saveProjects(); if (p.destaque) { log('star', `${p.titulo} entrou nos destaques`); toast('★', `${p.titulo} está em destaque`); } else toast('☆', `${p.titulo} saiu dos destaques`); };
// Ordem do site: arrastar um cartão sobre outro ou usar as setas.
const dragId = ref(null), overId = ref(null);
const dragStart = (p, e) => { dragId.value = p.id; e.dataTransfer.effectAllowed = 'move'; };
const reorder = (from, to) => { if (from < 0 || to < 0 || from === to) return; const list = [...projects.value]; const [it] = list.splice(from, 1); list.splice(to, 0, it); projects.value = list; saveProjects(); toast('↕', 'Ordem do site atualizada'); };
const dropOn = (target) => { const ids = projects.value.map(p => p.id); reorder(ids.indexOf(dragId.value), ids.indexOf(target.id)); dragId.value = overId.value = null; };
const move = (p, d) => { const i = projects.value.indexOf(p); reorder(i, Math.max(0, Math.min(projects.value.length - 1, i + d))); };
const projectDialog = ref(); const clientDialog = ref(); const newsDialog = ref(); const editingProject = ref(null); const editingClient = ref(null); const editingNews = ref(null);
const DRAWER_TABS = [{ id: 'basic', label: 'Básico' }, { id: 'page', label: 'Página' }, { id: 'gallery', label: 'Galeria' }, { id: 'results', label: 'Resultados' }, { id: 'publish', label: 'Publicação' }];
const dtab = ref('basic');
const emptyProject = () => normalizeProject({ vitrine: true });
const isoIn = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const emptyClient = () => ({ cliente: '', projeto: '', etapa: '', progresso: 5, prazo: isoIn(30), status: 'Planejamento' });
const projectDraft = reactive(emptyProject()); const clientDraft = reactive(emptyClient());
const detailDraft = reactive(emptyDetail());
const tagsText = ref('');
const tagSuggestions = computed(() => { const have = new Set(tagsText.value.split(',').map(t => t.trim().toLowerCase())); return [...new Set(projects.value.flatMap(p => p.tags || []))].filter(t => !have.has(t.toLowerCase())).slice(0, 8); });
const addTag = (t) => { tagsText.value = [...tagsText.value.split(',').map(x => x.trim()).filter(Boolean), t].join(', '); };
const fillDraft = (p) => {
  const n = normalizeProject(structuredClone(toRawDeep(p)));
  Object.assign(projectDraft, n);
  const d = structuredClone(toRawDeep(detailOf(p) || emptyDetail()));
  Object.assign(detailDraft, emptyDetail(), d, { desafio: { titulo: '', texto: '', ...(d.desafio || {}) }, solucao: { titulo: '', texto: '', ...(d.solucao || {}) }, destaques: [0, 1, 2].map(k => [...(d.destaques?.[k] || ['', ''])]) });
  tagsText.value = (n.tags || []).join(', '); dtab.value = 'basic';
};
const toRawDeep = (o) => JSON.parse(JSON.stringify(o));
const newProject = () => { editingProject.value = {}; fillDraft(emptyProject()); projectDialog.value.showModal(); };
const editProject = (project) => { editingProject.value = project; fillDraft(project); projectDialog.value.showModal(); };
const collect = () => {
  const out = toRawDeep(projectDraft);
  out.tags = tagsText.value.split(',').map(t => t.trim()).filter(Boolean);
  out.resultados = (out.resultados || []).filter(r => r[0] || r[1]);
  const d = toRawDeep(detailDraft); d.destaques = d.destaques.filter(x => x[0] || x[1]);
  out.detail = d;
  return out;
};
const saveProject = () => {
  const data = collect();
  if (editingProject.value?.id) { Object.assign(editingProject.value, data); log('edit', `${data.titulo} foi atualizado`); toast('✎', 'Projeto salvo'); }
  else { projects.value.unshift({ ...data, id: `project-${Date.now()}` }); log('add', `${data.titulo} entrou no portfólio`); toast('+', data.publicado ? 'Projeto criado e publicado no site' : 'Projeto criado como rascunho'); }
  saveProjects(); projectDialog.value.close();
};
const removeProject = () => { const t = editingProject.value.titulo; deleteProject(editingProject.value.id); log('remove', `${t} foi removido do portfólio`); toast('×', `${t} removido`); projectDialog.value.close(); };
// Pré-visualização: salva o rascunho temporário e abre a página do projeto como ela vai ficar.
const preview = () => {
  const data = collect(), id = editingProject.value?.id || 'previa';
  try { sessionStorage.setItem('miniverso:preview', JSON.stringify({ ...data, id })); } catch { /* sem armazenamento */ }
  window.open(`/projetos/${id}?previa=1`, '_blank', 'noopener');
};
// Imagens: com a nuvem, vão para o armazenamento do Supabase; no modo demonstração, viram uma imagem reduzida
// guardada no navegador (até ~1200 px, JPEG), para não estourar o espaço.
const uploading = ref(false), dropOver = ref(false), galleryLink = ref('');
const shrink = (file) => new Promise((res, rej) => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); URL.revokeObjectURL(img.src); }; img.onerror = rej; img.src = URL.createObjectURL(file); });
const storeFile = async (file) => {
  if (cloudOn && cloud.signedIn()) return cloud.upload(file);
  if (file.type.startsWith('video/')) { toast('!', 'Vídeos precisam da nuvem ligada; use um link do YouTube'); return null; }
  return shrink(file);
};
const pickCover = async (e) => { const f = e.target.files?.[0]; if (!f) return; uploading.value = true; try { const url = await storeFile(f); if (url) projectDraft.url_imagem = url; } catch { toast('!', 'Não consegui enviar a imagem'); } uploading.value = false; e.target.value = ''; };
const pickFiles = async (files) => {
  uploading.value = true;
  for (const f of [...files]) { try { const url = await storeFile(f); if (url) projectDraft.galeria.push({ type: f.type.startsWith('video/') ? 'video' : 'img', url }); } catch { toast('!', `Não consegui enviar ${f.name}`); } }
  uploading.value = false;
};
const dropFiles = (e) => { dropOver.value = false; pickFiles(e.dataTransfer.files); };
const ytId = (u) => (u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1];
const addLink = () => {
  const u = galleryLink.value.trim(); if (!u) return;
  projectDraft.galeria.push(ytId(u) ? { type: 'youtube', url: u } : /\.(mp4|webm|mov)(\?|$)/i.test(u) ? { type: 'video', url: u } : { type: 'img', url: u });
  galleryLink.value = '';
};
const moveMedia = (k, d) => { const g = projectDraft.galeria, j = k + d; if (j < 0 || j >= g.length) return; [g[k], g[j]] = [g[j], g[k]]; };
// Novidades
const newsDraft = reactive({ texto: '', link: '', data: isoIn(0), publicado: true });
const newNews = () => { editingNews.value = {}; Object.assign(newsDraft, { texto: '', link: '', data: isoIn(0), publicado: true }); newsDialog.value.showModal(); };
const editNews = (n) => { editingNews.value = n; Object.assign(newsDraft, n); newsDialog.value.showModal(); };
const saveOneNews = () => {
  if (editingNews.value?.id) Object.assign(editingNews.value, toRawDeep(newsDraft)); else news.value.unshift({ ...toRawDeep(newsDraft), id: `n${Date.now()}` });
  saveNews(); toast('📣', newsDraft.publicado ? 'Novidade no site' : 'Novidade salva (oculta)'); newsDialog.value.close();
};
const removeNews = () => { deleteNews(editingNews.value.id); toast('×', 'Novidade removida'); newsDialog.value.close(); };
const saveNewsAndToast = (n) => { saveNews(); toast(n.publicado ? '↗' : '↘', n.publicado ? 'Novidade no site' : 'Novidade oculta'); };
let newsDrag = null;
const dropNews = (target) => { const list = [...news.value], a = list.indexOf(newsDrag), b = list.indexOf(target); if (a < 0 || b < 0 || a === b) return; const [it] = list.splice(a, 1); list.splice(b, 0, it); news.value = list; saveNews(); newsDrag = null; };

// Clientes
const announceStage = (c, before, wasDone) => {
  const i = stageIndex(c.progresso);
  if (c.status === 'Concluído' && !wasDone) { log('done', `${c.cliente} foi entregue ao cliente`); toast('✓', `${c.cliente} entregue!`); return true; }
  if (i !== before) { log('progress', `${c.cliente} ${i > before ? 'avançou' : 'voltou'} para ${STAGES[i]}`); toast('▲', `${c.cliente} agora está em ${STAGES[i]}`); return true; }
  return false;
};
const setStage = (c, i) => {
  const before = stageIndex(c.progresso), wasDone = c.status === 'Concluído';
  if (i === before && !(i === 4 && !wasDone)) return;
  c.progresso = STAGE_PROGRESS[i]; c.status = STAGE_STATUS[i]; c.atualizado = Date.now();
  announceStage(c, before, wasDone); saveClients();
};
const pickStage = (i) => { clientDraft.progresso = STAGE_PROGRESS[i]; clientDraft.status = STAGE_STATUS[i]; };
const syncStatus = () => { clientDraft.status = STAGE_STATUS[stageIndex(clientDraft.progresso)]; if (clientDraft.progresso < 100 && clientDraft.status === 'Concluído') clientDraft.status = 'Em validação'; };
const newClient = () => { editingClient.value = {}; Object.assign(clientDraft, emptyClient()); clientDialog.value.showModal(); };
const editClient = (client) => { editingClient.value = client; Object.assign(clientDraft, emptyClient(), client, { prazo: isISO(client.prazo) ? client.prazo : isoIn(14) }); clientDialog.value.showModal(); };
const saveClient = () => {
  const c = editingClient.value;
  if (c?.id) {
    const before = stageIndex(c.progresso), wasDone = c.status === 'Concluído';
    Object.assign(c, clientDraft, { atualizado: Date.now() });
    if (!announceStage(c, before, wasDone)) { log('edit', `${c.cliente} foi atualizado`); toast('✎', 'Projeto salvo'); }
  } else { clients.value.unshift({ ...clientDraft, id: `client-${Date.now()}`, atualizado: Date.now() }); log('add', `${clientDraft.cliente} começou a ser acompanhado`); toast('+', 'Projeto de cliente criado'); }
  saveClients(); clientDialog.value.close();
};
const removeClient = () => { const t = editingClient.value.cliente; clients.value = clients.value.filter(c => c.id !== editingClient.value.id); saveClients(); log('remove', `${t} foi removido`); toast('×', `${t} removido`); clientDialog.value.close(); };

const resetAll = () => { resetDemo(); query.value = ''; sector.value = 'Todos'; status.value = 'Todos'; toast('↺', 'Dados de exemplo restaurados'); };
const logout = () => { sessionStorage.removeItem(SESSION_KEY); cloud.signOut(); router.push('/login'); };
onUnmounted(() => clearInterval(clock));
</script>

<style scoped>
.dashboard-shell{--cyan:#00b7e3;--blue:#1e4488;--indigo:#1e1645;--ink:#eef8fc;--muted:#a3bccb;--faint:#7c97a7;--line:#ffffff14;min-height:100vh;display:grid;font-family:var(--font-body);grid-template-columns:248px minmax(0,1fr);color:var(--ink);font-size:16px;background:linear-gradient(90deg,#0a1024 247px,var(--line) 247px 248px,transparent 248px),radial-gradient(ellipse at 90% -10%,#1e448855,transparent 50%),radial-gradient(ellipse at 20% 120%,#1e1645,transparent 55%),#080d1c;overflow-x:hidden}
@keyframes shell-in{from{opacity:0}}
.admin-sidebar,.admin-main{animation:shell-in .7s cubic-bezier(.2,.8,.2,1) both}
.eyebrow{margin:0;color:var(--cyan);font-size:13px;font-weight:500;letter-spacing:.16em;text-transform:uppercase}
/* Barra lateral */
.admin-sidebar{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:34px 18px 22px}
.admin-brand img{width:150px;height:auto;margin:0 0 48px 10px}
.side-nav{display:grid;gap:6px}
.side-nav button{position:relative;display:flex;gap:14px;align-items:center;min-height:52px;border:0;border-radius:14px;padding:0 14px;color:var(--muted);background:transparent;cursor:pointer;text-align:left;font-size:16px;font-weight:500;transition:color .2s,background .2s}
.side-nav button:hover{color:#fff;background:#ffffff08}
.side-nav button.active{color:#fff;background:linear-gradient(90deg,#00b7e326,#1e448814)}
.side-nav button.active::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--cyan);box-shadow:0 0 14px var(--cyan)}
.side-nav svg,.site-link svg{flex:none;width:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}
.side-foot{display:grid;gap:4px;margin-top:auto}
.site-link{display:flex;align-items:center;gap:14px;min-height:46px;padding:0 14px;border:0;border-radius:12px;color:var(--muted);background:none;font-size:15px;text-decoration:none;cursor:pointer;text-align:left}
.site-link:hover{color:#fff;background:#ffffff08}
.site-link.out:hover{color:#ffb3b3}
/* Topo */
.admin-main{min-width:0;padding:44px clamp(22px,4.5vw,64px) 32px;display:flex;flex-direction:column;min-height:100vh}
.main-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-bottom:34px}
.main-head h1{margin:10px 0 0;font-family:var(--font-title);font-size:clamp(56px,6.4vw,88px);font-weight:500;line-height:.92;letter-spacing:.01em}
.lede{margin:12px 0 0;color:var(--muted);font-size:17px}
/* Botões */
.primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 26px;border:0;border-radius:999px;color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));cursor:pointer;font-size:16px;font-weight:700;white-space:nowrap;box-shadow:0 12px 30px #00b7e330;transition:transform .2s,box-shadow .2s}
.primary span{font-size:22px;line-height:0;font-weight:400}
.primary:hover{transform:translateY(-2px);box-shadow:0 16px 36px #00b7e344}
.link{border:0;padding:4px 0;color:#8fd6ea;background:none;cursor:pointer;font-size:15px}
.link:hover{color:#fff;text-decoration:underline;text-underline-offset:4px}
.icon-btn{display:grid;place-items:center;flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:14px;color:var(--muted);background:#ffffff06;cursor:pointer;transition:.2s}
.icon-btn:hover{color:#fff;border-color:#ffffff33;background:#ffffff0d}
.icon-btn svg{width:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}
.icon-btn.star.on{color:#ffd166;border-color:#ffd16655;background:#ffd16614}
.icon-btn.star.on svg{fill:currentColor;animation:pop .4s}
@keyframes pop{50%{transform:scale(1.35)}}
/* Cartões */
.metric,.panel,.client-card,.project{border:1px solid var(--line);border-radius:24px;background:linear-gradient(160deg,#121b38,#0c1328)}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.metric{position:relative;overflow:hidden;display:grid;gap:8px;align-content:start;padding:26px 28px;color:inherit;font:inherit;text-align:left;cursor:pointer;animation:rise .6s var(--d) both cubic-bezier(.2,.8,.2,1);transition:transform .25s,border-color .25s}
.metric::after{content:'';position:absolute;inset:auto 0 0;height:2px;background:linear-gradient(90deg,var(--cyan),var(--blue));transform:scaleX(0);transform-origin:left;transition:transform .4s}
.metric:hover{transform:translateY(-3px);border-color:#00b7e344}
.metric:hover::after{transform:scaleX(1)}
.metric.accent{background:linear-gradient(150deg,#163a68,#121b44 60%,#1e1645)}
@keyframes rise{from{opacity:0;transform:translateY(14px)}}
.m-label{color:var(--muted);font-size:15px;font-weight:500}
.metric strong{display:flex;align-items:baseline;gap:8px;font-family:var(--font-title);font-size:72px;font-weight:500;line-height:1;letter-spacing:.01em}
.metric strong em{font-family:var(--font-body);font-size:18px;font-style:normal;color:var(--muted)}
.metric small{color:var(--faint);font-size:14px}
.ring-metric{grid-template-columns:1fr auto;align-items:center}
.ring-metric>div{display:grid;gap:8px}
.ring{position:relative;display:grid;place-items:center;width:92px;height:92px}
.ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:6}
.r-track{stroke:#ffffff12}
.r-fill{stroke:var(--cyan);stroke-linecap:round;stroke-dasharray:169.6;transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)}
/* O brilho fica no desenho inteiro (e não no círculo), senão o navegador corta o brilho num quadrado. */
.ring svg{overflow:visible;filter:drop-shadow(0 0 5px #00b7e370)}
.ring b{font-size:18px;font-weight:700}
.grid-2{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;margin-top:18px}
.panel{padding:26px 28px;animation:rise .6s .2s both cubic-bezier(.2,.8,.2,1)}
.panel-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px}
.panel h2,.drawer h2{max-width:none}
.panel h2{margin:0;font-family:var(--font-title);font-size:38px;font-weight:500;letter-spacing:.01em}
/* Linhas de projeto */
.row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:16px;align-items:center;width:calc(100% + 24px);padding:16px 12px;margin:0 -12px;border:0;border-top:1px solid var(--line);border-radius:14px;color:inherit;background:none;font:inherit;text-align:left;cursor:pointer;transition:background .2s}
.row:hover{background:#ffffff07}
.row-name{display:grid;gap:3px;min-width:0}
.row-name b{font-size:17px;font-weight:700}
.row-name small,.row-stage small{color:var(--faint);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row-stage{display:grid;gap:7px}
.dots{display:flex;gap:5px}
.dots i{flex:1;max-width:30px;height:5px;border-radius:9px;background:#ffffff14;transition:background .4s}
.dots i.on{background:linear-gradient(90deg,var(--cyan),#5f9bea)}
.badge{justify-self:end;padding:7px 13px;border-radius:99px;border:1px solid #ffffff1f;color:#c4dce6;font-size:13px;font-weight:500;white-space:nowrap}
.badge.soon{border-color:#ffd16666;color:#ffdc8a;background:#ffd16612}
.badge.late{border-color:#ff8b8b66;color:#ffb3b3;background:#ff8b8b14}
.badge.ok{border-color:#79e7ba55;color:#9ef0cc;background:#79e7ba12}
/* Atividade */
.feed ol{display:grid;margin:0;padding:0;list-style:none}
.feed li{display:flex;gap:14px;align-items:flex-start;padding:12px 0}
.feed-ico{display:grid;place-items:center;flex:none;width:36px;height:36px;border-radius:12px;background:#00b7e31a;color:var(--cyan);font-size:15px}
.feed-ico.publish,.feed-ico.add,.feed-ico.done{color:#79e7ba;background:#79e7ba18}.feed-ico.star{color:#ffd166;background:#ffd16616}.feed-ico.remove,.feed-ico.unpublish{color:#ffb3b3;background:#ff8b8b14}
.feed-text{display:grid;gap:4px;font-size:15px;line-height:1.4;color:#dcecf3}
.feed-text small{color:var(--faint);font-size:13px}
/* Barra de ferramentas */
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:22px}
.search{display:flex;align-items:center;gap:10px;flex:0 1 300px;padding:0 18px;min-height:50px;border:1px solid var(--line);border-radius:999px;background:#0a1124}
.search:focus-within{border-color:var(--cyan);box-shadow:0 0 0 4px #00b7e31f}
.search svg{width:19px;fill:none;stroke:var(--faint);stroke-width:1.8;stroke-linecap:round}
.search input{flex:1;min-width:0;border:0;outline:0;color:var(--ink);background:transparent;font:inherit;font-size:16px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips button{min-height:44px;padding:0 18px;border:1px solid var(--line);border-radius:99px;color:var(--muted);background:transparent;cursor:pointer;font:inherit;font-size:15px;transition:.2s}
.chips button span{margin-left:6px;color:var(--faint);font-size:13px}
.chips button:hover{color:#fff;border-color:#ffffff33}
.chips button.on{color:#fff;background:linear-gradient(90deg,#00b7e3,#1e4488);border-color:transparent}
.chips button.on span{color:#ffffffaa}
.tip{margin:-8px 0 18px;color:var(--faint);font-size:14px}
.empty{color:var(--muted);padding:30px 0}
/* Portfólio */
.project-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px;margin-top:0}
.project{overflow:hidden;display:flex;flex-direction:column;transition:transform .3s,border-color .3s}
.project:hover{transform:translateY(-4px);border-color:#00b7e344}
.project.draft img{filter:grayscale(.85) brightness(.7)}
.thumb{position:relative;display:block;padding:0;border:0;background:#0a1124;cursor:pointer;aspect-ratio:16/10;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s cubic-bezier(.2,.8,.2,1),filter .4s}
.project:hover .thumb img{transform:scale(1.05)}
.state{position:absolute;left:14px;top:14px;padding:6px 12px;border-radius:99px;background:#080d1ccc;backdrop-filter:blur(6px);color:#c9d6dd;font-size:13px;font-weight:500}
.state.live{color:#9ef0cc}
.state.live::before{content:'';display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:#79e7ba;box-shadow:0 0 8px #79e7ba}
.edit-hint{position:absolute;right:14px;bottom:14px;padding:7px 14px;border-radius:99px;background:#ffffffe6;color:#0a1124;font-size:14px;font-weight:700;opacity:0;transform:translateY(6px);transition:.25s}
.project:hover .edit-hint,.thumb:focus-visible .edit-hint{opacity:1;transform:none}
.project-body{display:flex;flex-direction:column;gap:6px;flex:1;padding:20px 22px 22px}
.kicker{color:var(--cyan);font-size:13px;font-weight:500;letter-spacing:.12em;text-transform:uppercase}
.project-body h3{margin:0;font-size:19px;font-weight:700;line-height:1.3}
.project-actions{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:14px}
.project-actions .switch{margin-right:auto}
.switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:15px;color:var(--muted);user-select:none}
.switch input{position:absolute;opacity:0;width:1px;height:1px}
.knob{position:relative;flex:none;width:44px;height:26px;border-radius:99px;background:#ffffff1c;transition:background .25s}
.knob::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#d5e3ea;box-shadow:0 2px 6px #0006;transition:transform .3s cubic-bezier(.3,1.5,.5,1)}
.switch input:checked+.knob{background:var(--cyan)}
.switch input:checked+.knob::after{transform:translateX(18px);background:#fff}
.switch input:focus-visible+.knob{outline:2px solid #7cdeef;outline-offset:3px}
/* Clientes */
.status-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
.status-board button{--c:#ffd166;position:relative;overflow:hidden;display:grid;gap:4px;padding:18px 20px 16px;border:1px solid var(--line);border-radius:20px;color:inherit;background:linear-gradient(160deg,#121b38,#0c1328);font:inherit;text-align:left;cursor:pointer;transition:transform .25s,border-color .25s,background .25s}
.status-board button.prod{--c:#00b7e3}.status-board button.valid{--c:#c79bff}.status-board button.done{--c:#79e7ba}
.status-board button:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 45%,transparent)}
.status-board button.on{border-color:var(--c);background:linear-gradient(160deg,color-mix(in srgb,var(--c) 18%,#121b38),#0c1328);box-shadow:0 12px 30px color-mix(in srgb,var(--c) 18%,transparent)}
.sb-label{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:14px;font-weight:600}
.sb-label::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c)}
.status-board strong{font-family:var(--font-title);font-size:52px;font-weight:500;line-height:1}
.sb-bar{height:4px;border-radius:9px;background:#ffffff10;overflow:hidden}
.sb-bar i{display:block;height:100%;border-radius:inherit;background:var(--c);transition:width .8s cubic-bezier(.2,.8,.2,1)}
.tip{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:0 0 18px;color:var(--faint);font-size:14px}
.client-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:20px}
.client-card{--c:#ffd166;position:relative;overflow:hidden;padding:26px 28px 22px;transition:transform .3s,border-color .3s}
.client-card.prod{--c:#00b7e3}.client-card.valid{--c:#c79bff}.client-card.done{--c:#79e7ba}
.client-card::before{content:'';position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--c),transparent 80%)}
.client-card::after{content:'';position:absolute;top:-80px;right:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--c) 16%,transparent),transparent 70%);pointer-events:none}
.client-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 35%,transparent)}
.client-card.late{border-color:#ff8b8b55}
.client-head{position:relative;z-index:1;display:flex;align-items:center;gap:16px}
.mono{display:grid;place-items:center;flex:none;width:54px;height:54px;border-radius:17px;background:linear-gradient(135deg,var(--cyan),var(--blue) 60%,var(--indigo));color:#fff;font-family:var(--font-title);font-size:26px;letter-spacing:.04em;box-shadow:0 10px 24px #00b7e322}
.ch-title{flex:1;min-width:0}
.ch-title h3{margin:0;font-family:var(--font-title);font-size:40px;font-weight:500;line-height:1;letter-spacing:.01em}
.ch-title p{margin:4px 0 0;color:var(--muted);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pct{position:relative;display:grid;place-items:center;flex:none;width:64px;height:64px}
.pct svg{position:absolute;inset:0;transform:rotate(-90deg)}
.pct circle{fill:none;stroke-width:4.5}
.pct .r-fill{stroke:var(--c);stroke-dasharray:125.7}
.pct svg{overflow:visible;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--c) 55%,transparent))}
.pct b{font-size:17px;font-weight:800}
.pct b small{font-size:11px;font-weight:600;color:var(--muted)}
.client-meta{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:16px}
.updated{color:var(--faint);font-size:13px}
.status-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:99px;font-size:13px;font-weight:600;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent)}
.status-chip.plan{--c:#ffd166}.status-chip.prod{--c:#5fd4f0}.status-chip.valid{--c:#d2b0ff}.status-chip.done{--c:#79e7ba}
.timeline{position:relative;z-index:1;display:grid;grid-template-columns:repeat(5,1fr);margin:24px -6px 6px;padding:0;list-style:none}
.timeline::before,.timeline::after{content:'';position:absolute;top:29px;left:10%;height:3px;border-radius:3px}
.timeline::before{right:10%;background:#ffffff12}
.timeline::after{width:calc(80% * var(--p));background:linear-gradient(90deg,var(--blue),var(--cyan));box-shadow:0 0 10px #00b7e366;transition:width .7s cubic-bezier(.2,.8,.2,1)}
.timeline li{position:relative;z-index:1}
.timeline button{display:grid;justify-items:center;gap:9px;width:100%;padding:12px 0 8px;border:0;border-radius:14px;background:none;color:var(--faint);font:inherit;font-size:13px;cursor:pointer;transition:color .2s,background .2s}
.timeline button:hover{color:#fff;background:#ffffff08}
.node{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:2px solid #ffffff22;background:#0c1328;color:var(--faint);transition:transform .3s,background .3s,border-color .3s,color .3s}
.node svg{width:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}
.timeline button:hover .node{transform:scale(1.1);border-color:var(--cyan);color:#fff}
.timeline li.done button{color:#b9d3de}
.timeline li.done .node{border-color:transparent;background:linear-gradient(135deg,var(--cyan),var(--blue));color:#fff}
.timeline li.now button{color:#fff;font-weight:700}
.timeline li.now .node{border-color:#fff;background:#0c1328;color:#fff;box-shadow:0 0 0 6px #00b7e326;animation:now 1.8s infinite}
@keyframes now{50%{box-shadow:0 0 0 11px #00b7e300}}
.now-line{position:relative;z-index:1;margin:6px 0 18px;padding:12px 16px;border-radius:14px;background:#ffffff06;color:#dcecf3;font-size:15px}
.now-line span{margin-right:6px;color:var(--cyan);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.client-foot{position:relative;z-index:1;display:flex;align-items:center;gap:12px;color:var(--faint);font-size:15px}
.client-foot .date{display:flex;align-items:center;gap:8px;margin-right:auto}
.client-foot .date svg{width:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
.client-foot b{color:var(--ink);font-weight:700}
/* Rodapé de demonstração */
.demo-foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-top:auto;padding-top:40px;color:var(--faint);font-size:14px}
.demo-foot span{display:flex;align-items:center;gap:10px}
.demo-foot i{width:8px;height:8px;border-radius:50%;background:#79e7ba;box-shadow:0 0 10px #79e7ba}
/* Gaveta de edição */
.drawer{font-family:var(--font-body);width:min(520px,100vw);height:100dvh;max-height:none;max-width:none;margin:0 0 0 auto;padding:0;border:0;border-left:1px solid var(--line);background:#0c1328;color:var(--ink);box-shadow:-30px 0 80px #0009}
.drawer[open]{animation:slide .35s cubic-bezier(.2,.8,.2,1)}
@keyframes slide{from{transform:translateX(40px);opacity:0}}
.drawer::backdrop{background:#03060ecc;backdrop-filter:blur(6px)}
.drawer form{display:grid;align-content:start;gap:18px;min-height:100%;padding:32px 32px 28px}
.drawer header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0;padding:0;background:none}
.drawer h2{margin:0;font-family:var(--font-title);font-size:46px;font-weight:500;line-height:1;letter-spacing:.01em}
.close{flex:none;width:44px;height:44px;border:0;border-radius:14px;color:var(--muted);background:#ffffff0a;font-size:26px;cursor:pointer}
.close:hover{color:#fff;background:#ffffff14}
.drawer label:not(.switch){display:grid;gap:8px;color:#d3e4ec;font-size:14px;font-weight:500}
.drawer input:not([type=checkbox]):not([type=range]),.drawer textarea,.drawer select{width:100%;min-height:52px;border:1px solid var(--line);border-radius:14px;padding:12px 16px;color:var(--ink);background:#080d1c;font:inherit;font-size:16px;color-scheme:dark}
.drawer input::placeholder,.drawer textarea::placeholder{color:#62798a}
.drawer input:focus,.drawer textarea:focus,.drawer select:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 4px #00b7e31f}
.preview{overflow:hidden;border-radius:18px;aspect-ratio:16/8;background:#080d1c}
.preview img{width:100%;height:100%;object-fit:cover;transition:opacity .2s}
.toggles{display:flex;flex-wrap:wrap;gap:24px}
.stage-pick{display:grid;gap:8px;color:#d3e4ec;font-size:14px;font-weight:500}
.seg{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:4px;border:1px solid var(--line);border-radius:14px;background:#080d1c}
.seg button{min-height:42px;padding:0 4px;border:0;border-radius:10px;color:var(--muted);background:none;font:inherit;font-size:13px;cursor:pointer;transition:.2s}
.seg button:hover{color:#fff}
.seg button.on{color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));font-weight:700}
.range b{color:#fff;margin-left:6px}
.range input{appearance:none;-webkit-appearance:none;height:6px;border-radius:99px;background:linear-gradient(90deg,var(--cyan) var(--p),#ffffff16 var(--p));cursor:pointer;margin:10px 0}
.range input::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px #00b7e340}
.range input::-moz-range-thumb{width:22px;height:22px;border:0;border-radius:50%;background:#fff;box-shadow:0 0 0 6px #00b7e340}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.drawer-actions{display:flex;gap:14px;margin-top:8px}
.drawer-actions>*{flex:1}
.drawer-actions :deep(.hold-button){min-height:52px;border-radius:999px}
.drawer-actions :deep(.hold-label){font-size:15px}
/* Portfólio: editor com abas, galeria, ordem, estatísticas */
.drawer.wide{width:min(640px,100vw)}
.d-tabs{display:flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:14px;background:#080d1c;overflow-x:auto}
.d-tabs button{flex:1;min-height:40px;padding:0 12px;border:0;border-radius:10px;color:var(--muted);background:none;font:inherit;font-size:14px;cursor:pointer;white-space:nowrap;transition:.2s}
.d-tabs button:hover{color:#fff}
.d-tabs button.on{color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));font-weight:700}
.d-pane{display:grid;gap:16px;align-content:start}
.hint{color:var(--faint);font-size:13px;font-weight:400;margin:0}
.sub-h{color:#fff;font-size:15px;font-weight:700;margin-top:6px}
.fields.pair{grid-template-columns:110px 1fr auto;align-items:center}
.fields.pair:not(:has(button)){grid-template-columns:110px 1fr}
.img-pick{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}
.file-btn,.ghost-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 18px;border:1px solid #00b7e366;border-radius:14px;color:#cfefff;background:#00b7e314;font:inherit;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;transition:.2s}
.file-btn:hover,.ghost-btn:hover{border-color:var(--cyan);background:#00b7e324}
.file-btn input,.dropzone input{position:absolute;opacity:0;width:1px;height:1px}
.ghost-btn.wide{width:100%}
.tag-suggest{display:flex;flex-wrap:wrap;gap:6px;margin-top:-6px}
.tag-suggest button{padding:5px 11px;border:1px solid var(--line);border-radius:99px;color:var(--muted);background:none;font:inherit;font-size:12px;cursor:pointer}
.tag-suggest button:hover{color:#fff;border-color:#00b7e366}
.dropzone{position:relative;display:grid;place-items:center;min-height:110px;padding:18px;border:2px dashed #00b7e355;border-radius:18px;color:var(--muted);text-align:center;cursor:pointer;transition:.2s}
.dropzone.over,.dropzone:hover{border-color:var(--cyan);background:#00b7e310;color:#fff}
.gal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.gal-grid li{position:relative;overflow:hidden;aspect-ratio:4/3;border:1px solid var(--line);border-radius:14px;background:#080d1c}
.gal-grid li.cover{border-color:#ffd166;box-shadow:0 0 0 2px #ffd16655}
.gal-grid img{width:100%;height:100%;object-fit:cover}
.gal-grid .vid{display:grid;place-items:center;height:100%;color:#cfefff;font-weight:700}
.gal-acts{position:absolute;left:6px;right:6px;bottom:6px;display:flex;gap:4px;justify-content:flex-end}
.gal-acts button{width:28px;height:28px;border:0;border-radius:8px;color:#fff;background:#080d1ccc;cursor:pointer;font-size:14px}
.gal-acts button:hover{background:var(--cyan)}
.toggles.col{flex-direction:column;gap:14px}
.state.sched{color:#ffd166}
.state.off-home{top:auto;bottom:14px;font-size:12px;color:#c9d6dd}
.project[draggable=true]{cursor:grab}
.project.dragging{opacity:.4}
.project.over{border-color:var(--cyan);box-shadow:0 0 0 2px #00b7e355}
.p-stats{display:flex;gap:12px;margin:2px 0 0;color:var(--faint);font-size:13px}
.order-btns{display:inline-flex;gap:4px}
.row.static{cursor:default}
.bar-mini{width:90px;height:6px;border-radius:99px;background:#ffffff12;overflow:hidden}
.bar-mini i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--cyan),#8f6bff)}
.empty.small{font-size:14px;margin:8px 0 0}
.news-list{display:grid;gap:12px}
.news-item{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:16px;padding:18px 22px;border:1px solid var(--line);border-radius:18px;background:#0c1328;cursor:grab}
.news-item.draft{opacity:.6}
.news-date{color:var(--cyan);font-size:13px;font-weight:700;white-space:nowrap}
.news-text{margin:0;color:var(--ink);font-size:15px;line-height:1.5;min-width:0}
.news-link{display:block;color:var(--faint);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cloud.error i{background:#ff6b6b;box-shadow:0 0 10px #ff6b6b}
.cloud.loading i,.cloud.saving i{background:#ffd166;box-shadow:0 0 10px #ffd166}
@media(max-width:700px){.news-item{grid-template-columns:1fr auto;}.news-date{grid-column:1/-1}.fields.pair{grid-template-columns:90px 1fr auto}.img-pick{grid-template-columns:1fr}}
/* Avisos */
.toasts{position:fixed;z-index:50;left:50%;bottom:28px;transform:translateX(-50%);display:grid;gap:8px;justify-items:center;pointer-events:none;width:max-content;max-width:calc(100vw - 32px)}
.toast{display:flex;align-items:center;gap:12px;margin:0;padding:14px 22px;border-radius:99px;background:#f3f8fb;color:#0a1124;font-size:15px;font-weight:500;box-shadow:0 18px 50px #000a}
.toast span{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--blue));color:#fff;font-size:13px}
/* Transições */
.swap-enter-active,.swap-leave-active{transition:opacity .25s,transform .25s}
.swap-enter-from{opacity:0;transform:translateY(10px)}.swap-leave-to{opacity:0;transform:translateY(-4px)}
.list-enter-active,.list-leave-active,.feed-enter-active{transition:opacity .35s,transform .35s}
.list-enter-from,.list-leave-to{opacity:0;transform:scale(.96)}
.list-leave-active{position:absolute;visibility:hidden}
.list-move,.feed-move{transition:transform .4s}
.feed-enter-from{opacity:0;transform:translateX(-12px)}
.feed-leave-active{display:none}
.toast-enter-active,.toast-leave-active{transition:opacity .3s,transform .3s}
.toast-enter-from{opacity:0;transform:translateY(14px) scale(.96)}.toast-leave-to{opacity:0;transform:translateY(8px)}
/* Responsivo */
@media(max-width:1180px){.grid-2{grid-template-columns:1fr}.status-board{grid-template-columns:1fr 1fr}}
@media(max-width:980px){.metrics{grid-template-columns:1fr 1fr}.metric.accent{grid-column:1/-1}}
@media(max-width:900px){
  .dashboard-shell{grid-template-columns:1fr;background:radial-gradient(ellipse at 90% -10%,#1e448855,transparent 50%),#080d1c}
  .admin-sidebar{position:sticky;z-index:5;height:auto;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:6px 10px;padding:14px 16px 10px;background:#0a1024ee;backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  .admin-brand img{width:112px;margin:0}
  .side-foot{grid-column:2;grid-row:1;display:flex;justify-content:flex-end;margin:0}
  .site-link{min-height:40px;padding:0 10px;font-size:14px;gap:8px}
  .side-nav{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
  .side-nav button{justify-content:center;min-height:44px;padding:0 6px;font-size:14px;gap:8px}
  .side-nav button.active::before{left:30%;right:30%;top:auto;bottom:2px;width:auto;height:3px}
  .client-list,.project-grid{grid-template-columns:1fr}
}
@media(max-width:600px){
  .admin-main{padding:28px 16px}
  .main-head{margin-bottom:24px}.main-head .primary{width:100%}
  .metrics{grid-template-columns:1fr;gap:12px}.metric.accent{grid-column:auto}.metric{padding:22px}.metric strong{font-size:60px}
  .panel{padding:22px 20px}.panel h2{font-size:32px}
  .row{grid-template-columns:1fr auto;gap:10px}.row-stage{grid-column:1/-1;grid-row:2}
  .client-card{padding:22px 18px}.ch-title h3{font-size:32px}.mono{width:46px;height:46px;font-size:22px}.timeline{margin-inline:-10px}.timeline button{font-size:11px}.node{width:32px;height:32px}.timeline::before,.timeline::after{top:27px}
  .status-board{grid-template-columns:1fr 1fr;gap:10px}.status-board strong{font-size:42px}
  .search{flex:1 1 100%}.chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}.chips button{flex:none}
  .drawer form{padding:24px 20px}.fields{grid-template-columns:1fr}.seg button{font-size:11px}
  .side-nav svg{display:none}
}
@media(prefers-reduced-motion:reduce){.metric,.panel,.timeline li.now .node{animation:none}}
</style>
