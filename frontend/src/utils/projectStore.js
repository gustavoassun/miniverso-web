import { ref } from 'vue';
import { cloud, cloudOn } from './cloud.js';
import { projectDetails } from './projectDetails.js';

export const PROJECTS_KEY = 'miniverso:projects:v1';
// v2: prazos viraram datas de verdade (AAAA-MM-DD) para o painel contar os dias que faltam.
export const CLIENTS_KEY = 'miniverso:client-progress:v2';
export const ACTIVITY_KEY = 'miniverso:activity:v1';
export const NEWS_KEY = 'miniverso:news:v1';
export const STATS_KEY = 'miniverso:stats:v1';
export const SESSION_KEY = 'miniverso:admin-session';

export const seedProjects = [
  { id: 'avati', titulo: 'Avati: Do zero a um milhão', setor: 'Eventos', categoria: 'Gamificação & ativação de marca', descricao: 'Uma trilha interativa em xilogravura.', url_imagem: '/images/avati.png', url: 'https://miniversotech.base44.app/projeto?id=avati-do-zero-a-um-milhao', publicado: true, destaque: true, tags: ['Gamificação', 'Eventos'] },
  { id: 'aliados', titulo: 'Aliados do Sucesso: Desafio SEBRAETEC', setor: 'Educação', categoria: 'Realidade virtual', descricao: 'O “Show do Milhão” Empreendedor.', url_imagem: '/images/aliados.png', url: 'https://miniversotech.base44.app/projeto?id=aliados-do-sucesso-sebraetec', publicado: true, destaque: false, tags: ['Realidade virtual', 'Educação'] },
  { id: 'reciclaverso', titulo: 'Reciclaverso', setor: 'Sustentabilidade', categoria: 'Realidade virtual & sustentabilidade', descricao: 'Uma imersão ecológica em um game show interativo e educativo.', url_imagem: '/images/reciclaverso.png', url: 'https://miniversotech.base44.app/projeto?id=reciclaverso', publicado: true, destaque: true, tags: ['Realidade virtual', 'Sustentabilidade', 'Gamificação'] },
  { id: 'desafio-entre-maes', titulo: 'Desafio Entre Mães', setor: 'Eventos', categoria: 'Realidade virtual & gamificação', descricao: 'Um desafio musical imersivo.', url_imagem: '/images/desafio-entre-maes.png', url: 'https://miniversotech.base44.app/projeto?id=desafio-entre-maes', publicado: true, destaque: false, tags: ['Realidade virtual', 'Eventos', 'Gamificação'] },
  { id: 'emap-itaquiz', titulo: 'EMAP: Itaquiz', setor: 'Institucional', categoria: 'Realidade virtual & inteligência artificial', descricao: 'Aprendendo com o agente de IA.', url_imagem: '/images/emap-itaquiz.png', url: 'https://miniversotech.base44.app/projeto?id=emap-itaquiz', publicado: true, destaque: false, tags: ['Realidade virtual', 'Inteligência artificial'] },
  { id: 'projeto-manabi', titulo: 'Projeto Manabi', setor: 'Indústria', categoria: 'Realidade virtual & simuladores', descricao: 'Segurança e excelência operacional.', url_imagem: '/images/projeto-manabi.png', url: 'https://miniversotech.base44.app/projeto?id=projeto-manabi', publicado: true, destaque: false, tags: ['Realidade virtual', 'Simuladores', 'Indústria'] },
  { id: 'miniverso-360', titulo: 'MINIVERSO 360', setor: 'Cultura', categoria: 'Vídeo imersivo & turismo cultural', descricao: 'Uma viagem no tempo através da tecnologia de vídeo imersivo 360 graus.', url_imagem: '/images/miniverso-360.png', url: 'https://miniversotech.base44.app/projeto?id=miniverso-360', publicado: true, destaque: true, tags: ['Vídeo 360°', 'Cultura'] }
];
const seedNews = () => [
  { id: 'n1', texto: 'Reciclaverso e Aliados do Sucesso levaram a realidade virtual à Feira do Empreendedor do SEBRAE.', link: '/projetos/reciclaverso', publicado: true, data: new Date().toISOString().slice(0, 10) }
];

// Etapas de um projeto da Miniverso, na ordem. O progresso (0 a 100) diz em qual etapa o projeto está.
export const STAGES = ['Briefing', 'Roteiro', 'Produção', 'Validação', 'Entrega'];
// Limites de cada etapa: Briefing até 14%, Roteiro até 34%, Produção até 69%, Validação até 94% e Entrega no fim.
const STAGE_AT = [15, 35, 70, 95];
export const stageIndex = (progress) => STAGE_AT.filter(v => (Number(progress) || 0) >= v).length;

// Datas relativas a hoje, para a demonstração nunca mostrar prazos vencidos.
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const ago = (min) => Date.now() - min * 60000;
const makeClients = () => [
  { id: 'cliente-1', cliente: 'Projeto Órbita', projeto: 'Experiência cultural 360°', etapa: 'Modelagem e captação', progresso: 58, prazo: inDays(12), status: 'Em produção', atualizado: ago(300) },
  { id: 'cliente-2', cliente: 'Projeto Horizonte', projeto: 'Simulador de treinamento', etapa: 'Validação do protótipo', progresso: 84, prazo: inDays(5), status: 'Em validação', atualizado: ago(42) },
  { id: 'cliente-3', cliente: 'Projeto Raiz', projeto: 'Ativação gamificada', etapa: 'Roteiro e experiência', progresso: 32, prazo: inDays(26), status: 'Planejamento', atualizado: ago(1800) },
  { id: 'cliente-4', cliente: 'Projeto Maré', projeto: 'Trilha educativa do mangue', etapa: 'Entregue ao cliente', progresso: 100, prazo: inDays(-3), status: 'Concluído', atualizado: ago(4320) }
];
const makeActivity = () => [
  { id: 'a1', icon: 'progress', text: 'Projeto Horizonte avançou para Validação', at: ago(42) },
  { id: 'a2', icon: 'publish', text: 'Reciclaverso foi publicado no site', at: ago(60 * 5) },
  { id: 'a3', icon: 'star', text: 'MINIVERSO 360 entrou nos destaques', at: ago(60 * 26) },
  { id: 'a4', icon: 'done', text: 'Projeto Maré foi entregue ao cliente', at: ago(60 * 72) }
];
export const seedClientProgress = makeClients();

const read = (key, fallback) => { try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback(); } catch { return fallback(); } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ } };

// Um projeto sempre com todos os campos (projetos antigos ganham os novos com valores vazios).
export const emptyDetail = () => ({ cliente: '', ocasiao: '', plataforma: '', resumo: '', desafio: { titulo: '', texto: '' }, solucao: { titulo: '', texto: '' }, destaques: [['', ''], ['', ''], ['', '']] });
export const normalizeProject = (p) => ({
  titulo: '', setor: '', categoria: '', descricao: '', url_imagem: '/images/miniverso-logo.png', url: '', publicado: false, destaque: false,
  tags: [], galeria: [], vitrine: true, publicarEm: '', resultados: [], depoimento: { texto: '', autor: '', cargo: '' }, detail: null,
  ...p,
  depoimento: { texto: '', autor: '', cargo: '', ...(p?.depoimento || {}) }
});
// Aparece no site: publicado e, se tiver data agendada, só depois dela.
export const isLive = (p, now = Date.now()) => Boolean(p?.publicado) && (!p.publicarEm || new Date(p.publicarEm).getTime() <= now);
// História da página do projeto: a editada no painel ou, se ainda não tiver, a escrita para os projetos originais.
export const detailOf = (p) => {
  const d = p?.detail;
  const filled = d && (d.resumo || d.desafio?.texto || d.solucao?.texto || d.cliente);
  return filled ? d : (projectDetails[p?.id] || null);
};

// Estado compartilhado por todo o site (painel, página inicial, lista e páginas dos projetos).
// Projetos salvos antes das categorias: os originais herdam as tags do exemplo.
const withSeedTags = (p) => (p.tags?.length ? p : { ...p, tags: seedProjects.find(s => s.id === p.id)?.tags || [] });
const projects = ref(read(PROJECTS_KEY, () => structuredClone(seedProjects)).map(withSeedTags).map(normalizeProject));
const clients = ref(read(CLIENTS_KEY, makeClients));
const activity = ref(read(ACTIVITY_KEY, makeActivity));
const news = ref(read(NEWS_KEY, seedNews));
const stats = ref(read(STATS_KEY, () => ({})));
const sync = ref({ state: cloudOn ? 'loading' : 'local', error: '' });                     // local | loading | ok | saving | error

let loaded = false;
async function loadCloud() {
  if (!cloudOn || loaded) return; loaded = true;
  try {
    const [rows, newsRows] = await Promise.all([cloud.listProjects(), cloud.listNews()]);
    if (rows.length) { projects.value = rows.map(r => normalizeProject(r.data)); write(PROJECTS_KEY, projects.value); }
    else if (cloud.signedIn()) await cloud.saveProjects(projects.value);                       // primeira vez: sobe o portfólio atual
    if (newsRows.length) { news.value = newsRows.map(r => r.data); write(NEWS_KEY, news.value); }
    else if (cloud.signedIn() && news.value.length) await cloud.saveNews(news.value);
    sync.value = { state: 'ok', error: '' };
  } catch (e) { sync.value = { state: 'error', error: String(e.message || e) }; }
}
async function pushCloud(fn) {
  if (!cloudOn || !cloud.signedIn()) return;
  sync.value = { state: 'saving', error: '' };
  try { await fn(); sync.value = { state: 'ok', error: '' }; } catch (e) { sync.value = { state: 'error', error: String(e.message || e) }; }
}

export const useProjectStore = () => {
  loadCloud();
  const saveProjects = () => { write(PROJECTS_KEY, projects.value); return pushCloud(() => cloud.saveProjects(projects.value)); };
  const deleteProject = (id) => { projects.value = projects.value.filter(p => p.id !== id); write(PROJECTS_KEY, projects.value); return pushCloud(() => cloud.deleteProject(id)); };
  const saveNews = () => { write(NEWS_KEY, news.value); return pushCloud(() => cloud.saveNews(news.value)); };
  const deleteNews = (id) => { news.value = news.value.filter(n => n.id !== id); write(NEWS_KEY, news.value); return pushCloud(() => cloud.deleteNews(id)); };
  const saveClients = () => write(CLIENTS_KEY, clients.value);
  const log = (icon, text) => {
    activity.value.unshift({ id: `a${Date.now()}`, icon, text, at: Date.now() });
    activity.value = activity.value.slice(0, 30);
    write(ACTIVITY_KEY, activity.value);
  };
  const resetDemo = () => {
    projects.value = structuredClone(seedProjects).map(normalizeProject);
    clients.value = makeClients(); activity.value = makeActivity(); news.value = seedNews(); stats.value = {};
    write(PROJECTS_KEY, projects.value); saveClients(); write(ACTIVITY_KEY, activity.value); write(NEWS_KEY, news.value); write(STATS_KEY, stats.value);
  };
  // Estatísticas: visitas à página do projeto e cliques em "Conte sua ideia" a partir dela.
  const bump = (id, kind) => { const s = stats.value[id] || { views: 0, leads: 0 }; s[kind] = (s[kind] || 0) + 1; stats.value = { ...stats.value, [id]: s }; write(STATS_KEY, stats.value); cloud.track(id, kind === 'views' ? 'view' : 'lead'); };
  const trackView = (id) => { const k = `miniverso:seen:${id}`; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* sem armazenamento */ } bump(id, 'views'); };
  const trackLead = (id) => bump(id, 'leads');
  const loadStats = async () => {
    if (!cloudOn || !cloud.signedIn()) return;
    try { const rows = await cloud.stats(); const out = {}; for (const r of rows) { const s = out[r.project_id] ||= { views: 0, leads: 0 }; s[r.kind === 'view' ? 'views' : 'leads'] = Number(r.total) || 0; } stats.value = out; } catch { /* mantém os números locais */ }
  };
  return { projects, clients, activity, news, stats, sync, saveProjects, deleteProject, saveNews, deleteNews, saveClients, log, resetDemo, trackView, trackLead, loadStats };
};

// Sessão do painel: com a nuvem ligada, é o login do Supabase; no modo demonstração, a sessão local.
export const hasAdminSession = () => (cloudOn ? cloud.signedIn() : sessionStorage.getItem(SESSION_KEY) === 'active');
export { cloudOn };
