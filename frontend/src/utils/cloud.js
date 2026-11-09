// Nuvem do portfólio (Supabase), falando direto com a API REST — sem biblioteca extra, para o site continuar leve.
// Ligada quando as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY existem (no .env local e no Vercel).
// Sem elas, o painel funciona no modo demonstração (tudo salvo só neste navegador).
// Leitura é pública (o site mostra o portfólio a todos); escrever exige login de verdade no Supabase (Auth):
// as regras de segurança (RLS) do banco só deixam usuários autenticados criar, editar e apagar. Veja docs/SUPABASE.md.
const URL_ = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const cloudOn = Boolean(URL_ && KEY);
const TOKEN = 'miniverso:sb-session';
const BUCKET = 'portfolio';

const session = () => { try { const s = JSON.parse(sessionStorage.getItem(TOKEN) || 'null'); return s && s.expires_at * 1000 > Date.now() ? s : null; } catch { return null; } };
const headers = (auth, extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${(auth && session()?.access_token) || KEY}`, ...extra });

async function req(path, { method = 'GET', body, auth = false, prefer } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
    headers: headers(auth, { 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) })
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.trim());
  return res.status === 204 ? null : res.json().catch(() => null);
}

export const cloud = {
  signedIn: () => Boolean(session()),
  async signIn(email, password) {
    const s = await req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    sessionStorage.setItem(TOKEN, JSON.stringify({ access_token: s.access_token, expires_at: Math.floor(Date.now() / 1000) + (s.expires_in || 3600) }));
  },
  signOut() { sessionStorage.removeItem(TOKEN); },
  // Portfólio: cada projeto é uma linha { id, ordem, data } (data = o projeto inteiro em JSON).
  async listProjects() { return (await req('/rest/v1/portfolio?select=id,ordem,data&order=ordem.asc')) || []; },
  async saveProjects(list) {
    const rows = list.map((p, i) => ({ id: p.id, ordem: i, data: p }));
    if (rows.length) await req('/rest/v1/portfolio?on_conflict=id', { method: 'POST', body: rows, auth: true, prefer: 'resolution=merge-duplicates' });
  },
  async deleteProject(id) { await req(`/rest/v1/portfolio?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }); },
  // Novidades (avisos curtos da página inicial).
  async listNews() { return (await req('/rest/v1/novidades?select=id,ordem,data&order=ordem.asc')) || []; },
  async saveNews(list) {
    const rows = list.map((n, i) => ({ id: n.id, ordem: i, data: n }));
    if (rows.length) await req('/rest/v1/novidades?on_conflict=id', { method: 'POST', body: rows, auth: true, prefer: 'resolution=merge-duplicates' });
  },
  async deleteNews(id) { await req(`/rest/v1/novidades?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }); },
  // Estatísticas: o site registra visitas e cliques em "Conte sua ideia"; só a equipe lê o resumo.
  track(projectId, kind) { if (!cloudOn) return; req('/rest/v1/eventos', { method: 'POST', body: { project_id: projectId, kind } }).catch(() => {}); },
  async stats() { return (await req('/rest/v1/eventos_resumo?select=project_id,kind,total', { auth: true })) || []; },
  // Fotos e vídeos enviados pelo painel vão para o armazenamento público "portfolio".
  async upload(file) {
    const name = `${Date.now()}-${file.name.normalize('NFD').replace(/[^\w.-]+/g, '-').toLowerCase()}`;
    const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, { method: 'POST', body: file, headers: headers(true, { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }) });
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
    return `${URL_}/storage/v1/object/public/${BUCKET}/${name}`;
  }
};
