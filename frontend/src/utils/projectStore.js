import { ref } from 'vue';

export const PROJECTS_KEY = 'miniverso:projects:v1';
// v2: prazos viraram datas de verdade (AAAA-MM-DD) para o painel contar os dias que faltam.
export const CLIENTS_KEY = 'miniverso:client-progress:v2';
export const ACTIVITY_KEY = 'miniverso:activity:v1';
export const SESSION_KEY = 'miniverso:admin-session';

export const seedProjects = [
  { id: 'avati', titulo: 'Avati: Do zero a um milhão', setor: 'Eventos', categoria: 'Gamificação & ativação de marca', descricao: 'Uma trilha interativa em xilogravura.', url_imagem: '/images/avati.png', url: 'https://miniversotech.base44.app/projeto?id=avati-do-zero-a-um-milhao', publicado: true, destaque: true },
  { id: 'aliados', titulo: 'Aliados do Sucesso: Desafio SEBRAETEC', setor: 'Educação', categoria: 'Realidade virtual', descricao: 'O “Show do Milhão” Empreendedor.', url_imagem: '/images/aliados.png', url: 'https://miniversotech.base44.app/projeto?id=aliados-do-sucesso-sebraetec', publicado: true, destaque: false },
  { id: 'reciclaverso', titulo: 'Reciclaverso', setor: 'Sustentabilidade', categoria: 'Realidade virtual & sustentabilidade', descricao: 'Uma imersão ecológica em um game show interativo e educativo.', url_imagem: '/images/reciclaverso.png', url: 'https://miniversotech.base44.app/projeto?id=reciclaverso', publicado: true, destaque: true },
  { id: 'desafio-entre-maes', titulo: 'Desafio Entre Mães', setor: 'Eventos', categoria: 'Realidade virtual & gamificação', descricao: 'Um desafio musical imersivo.', url_imagem: '/images/desafio-entre-maes.png', url: 'https://miniversotech.base44.app/projeto?id=desafio-entre-maes', publicado: true, destaque: false },
  { id: 'emap-itaquiz', titulo: 'EMAP: Itaquiz', setor: 'Institucional', categoria: 'Realidade virtual & inteligência artificial', descricao: 'Aprendendo com o agente de IA.', url_imagem: '/images/emap-itaquiz.png', url: 'https://miniversotech.base44.app/projeto?id=emap-itaquiz', publicado: true, destaque: false },
  { id: 'projeto-manabi', titulo: 'Projeto Manabi', setor: 'Indústria', categoria: 'Realidade virtual & simuladores', descricao: 'Segurança e excelência operacional.', url_imagem: '/images/projeto-manabi.png', url: 'https://miniversotech.base44.app/projeto?id=projeto-manabi', publicado: true, destaque: false },
  { id: 'miniverso-360', titulo: 'MINIVERSO 360', setor: 'Cultura', categoria: 'Vídeo imersivo & turismo cultural', descricao: 'Uma viagem no tempo através da tecnologia de vídeo imersivo 360 graus.', url_imagem: '/images/miniverso-360.png', url: 'https://miniversotech.base44.app/projeto?id=miniverso-360', publicado: true, destaque: true }
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

const read = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback();
  } catch {
    return fallback();
  }
};
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ } };

export const useProjectStore = () => {
  const projects = ref(read(PROJECTS_KEY, () => structuredClone(seedProjects)));
  const clients = ref(read(CLIENTS_KEY, makeClients));
  const activity = ref(read(ACTIVITY_KEY, makeActivity));
  const saveProjects = () => write(PROJECTS_KEY, projects.value);
  const saveClients = () => write(CLIENTS_KEY, clients.value);
  const log = (icon, text) => {
    activity.value.unshift({ id: `a${Date.now()}`, icon, text, at: Date.now() });
    activity.value = activity.value.slice(0, 30);
    write(ACTIVITY_KEY, activity.value);
  };
  const resetDemo = () => {
    projects.value = structuredClone(seedProjects);
    clients.value = makeClients();
    activity.value = makeActivity();
    saveProjects(); saveClients(); write(ACTIVITY_KEY, activity.value);
  };
  return { projects, clients, activity, saveProjects, saveClients, log, resetDemo };
};

export const hasAdminSession = () => sessionStorage.getItem(SESSION_KEY) === 'active';
