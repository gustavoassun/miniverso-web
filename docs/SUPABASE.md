# Portfólio na nuvem (Supabase)

Sem a nuvem, o painel funciona em **modo demonstração**: tudo fica salvo só no navegador de quem editou.
Com o Supabase ligado, o que a equipe publica no painel aparece para **todos os visitantes** (e para o Murilo e o
Gustavo em qualquer computador). Fotos e vídeos enviados vão para o armazenamento do Supabase.

A leitura é pública; **só quem tem login da equipe** consegue criar, editar ou apagar (regras de segurança do banco).

## 1. Criar o projeto (uma vez)

1. Entre em https://supabase.com, crie uma conta grátis e um projeto (região: South America – São Paulo).
2. No menu **SQL Editor**, cole e rode o bloco abaixo:

```sql
-- Portfólio: cada projeto é uma linha (data = o projeto inteiro em JSON).
create table if not exists public.portfolio (
  id text primary key,
  ordem int not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
-- Novidades da página inicial.
create table if not exists public.novidades (
  id text primary key,
  ordem int not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
-- Estatísticas: visitas às páginas dos projetos e cliques em "Conte sua ideia".
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  project_id text not null,
  kind text not null check (kind in ('view', 'lead')),
  created_at timestamptz not null default now()
);

alter table public.portfolio enable row level security;
alter table public.novidades enable row level security;
alter table public.eventos enable row level security;

-- Todo mundo lê o portfólio e as novidades; só a equipe (logada) escreve.
create policy "portfolio: leitura publica" on public.portfolio for select using (true);
create policy "portfolio: equipe escreve" on public.portfolio for all to authenticated using (true) with check (true);
create policy "novidades: leitura publica" on public.novidades for select using (true);
create policy "novidades: equipe escreve" on public.novidades for all to authenticated using (true) with check (true);

-- O site registra visitas e cliques; só a equipe lê.
create policy "eventos: site registra" on public.eventos for insert to anon, authenticated with check (kind in ('view', 'lead'));
create policy "eventos: equipe le" on public.eventos for select to authenticated using (true);

-- Resumo das estatísticas (o painel lê este).
create or replace view public.eventos_resumo with (security_invoker = true) as
  select project_id, kind, count(*)::int as total from public.eventos group by project_id, kind;

-- Fotos e vídeos do portfólio (público para ver; só a equipe envia).
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do nothing;
create policy "portfolio: equipe envia" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio');
create policy "portfolio: equipe altera" on storage.objects for update to authenticated using (bucket_id = 'portfolio');
create policy "portfolio: equipe apaga" on storage.objects for delete to authenticated using (bucket_id = 'portfolio');
```

3. Em **Authentication → Users**, crie os logins da equipe (Add user → e-mail e senha) para o Gustavo e o Murilo.
4. Em **Authentication → Providers → Email**, desligue **"Allow new users to sign up"** (ninguém de fora cria conta).

## 2. Ligar no site

1. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** (essa é pública, pode ir no site;
   nunca use a `service_role`).
2. No computador, crie o arquivo `frontend/.env.local` (ele não vai para o GitHub):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
```

3. No **Vercel** (projeto meuminiverso → Settings → Environment Variables), adicione as mesmas duas variáveis e faça
   um novo deploy.

## 3. Primeiro uso

- O **Acesso restrito** passa a pedir o e-mail e a senha criados no passo 1.3 (o acesso de demonstração some).
- Na primeira vez que alguém da equipe entra, o portfólio que está no navegador sobe sozinho para a nuvem.
- O rodapé do painel mostra se está tudo salvo na nuvem.

## O que fica onde

| Coisa | Onde |
|---|---|
| Projetos (texto, página, galeria, resultados, depoimento, vitrine, agendamento, ordem) | tabela `portfolio` |
| Novidades da página inicial | tabela `novidades` |
| Visitas e cliques em "Conte sua ideia" | tabela `eventos` (o painel lê `eventos_resumo`) |
| Fotos e vídeos enviados | Storage, pasta `portfolio` |
| Projetos de clientes e atividade do painel | ainda no navegador (podem ir para a nuvem depois) |
