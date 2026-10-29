import { ref } from 'vue';

export const PROJECTS_KEY = 'miniverso:projects:v1';
export const CLIENTS_KEY = 'miniverso:client-progress:v1';
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

export const seedClientProgress = [
  { id: 'cliente-1', cliente: 'Projeto Órbita', projeto: 'Experiência cultural 360°', etapa: 'Modelagem e captação', progresso: 68, prazo: '18 Out 2026', status: 'Em produção' },
  { id: 'cliente-2', cliente: 'Projeto Horizonte', projeto: 'Simulador de treinamento', etapa: 'Validação do protótipo', progresso: 84, prazo: '29 Out 2026', status: 'Em validação' },
  { id: 'cliente-3', cliente: 'Projeto Raiz', projeto: 'Ativação gamificada', etapa: 'Roteiro e experiência', progresso: 32, prazo: '12 Nov 2026', status: 'Planejamento' }
];

const read = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
};

export const useProjectStore = () => {
  const projects = ref(read(PROJECTS_KEY, seedProjects));
  const clients = ref(read(CLIENTS_KEY, seedClientProgress));
  const saveProjects = () => localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.value));
  const saveClients = () => localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients.value));
  const resetDemo = () => {
    projects.value = structuredClone(seedProjects);
    clients.value = structuredClone(seedClientProgress);
    saveProjects();
    saveClients();
  };
  return { projects, clients, saveProjects, saveClients, resetDemo };
};

export const hasAdminSession = () => sessionStorage.getItem(SESSION_KEY) === 'active';
