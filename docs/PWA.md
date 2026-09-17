# PWA do Miniverso

Esta etapa prepara a instalação e o uso offline da apresentação. Não implementa login, sincronização de dados nem operações offline do dashboard.

## Como testar localmente

No terminal integrado do VS Code, na pasta `miniverso`:

1. Execute `npm run build`.
2. Execute `npm run preview --workspace frontend -- --host 127.0.0.1 --port 5188`.
3. Abra `http://127.0.0.1:5188/` e aguarde o aviso de preparação offline.
4. No navegador compatível, use o botão de instalação ou a opção de instalar aplicativo do menu. No iPhone/iPad, use Safari → Compartilhar → Adicionar à Tela de Início.
5. Após a preparação, recarregue uma vez conectado para a página ficar sob controle do service worker. Desative a rede nas ferramentas de desenvolvimento e recarregue novamente. Confira abertura, imagens e navegação interna.

O servidor de desenvolvimento da porta 5187 não ativa o service worker. Use a versão compilada para testar PWA, evitando caches de desenvolvimento desatualizados.

## Comportamento

- Manifesto com identidade estável, escopo, modo independente e ícones PNG 192/512, maskable e Apple.
- Cache dos arquivos locais da versão compilada e fallback de navegação para as rotas Vue.
- `/api` fica excluído do fallback HTML; não existe cache de respostas autenticadas/API.
- A primeira visita exige conexão e preparação bem-sucedida do cache. Apagar os dados do site remove a cópia offline.
- Links Base44, envio de e-mail e futuros serviços de login/gerenciamento não passam a funcionar offline por causa da PWA.
- Novas versões mostram um aviso e só recarregam mediante confirmação. A verificação ocorre também ao voltar à aba e recuperar conexão.
- O botão de instalação aparece apenas quando o navegador disponibiliza o evento nativo; sua ausência não indica, por si só, falha no aplicativo.
- Para acesso em outros dispositivos e publicação, é necessário hospedar via HTTPS e configurar o servidor para entregar `index.html` nas rotas Vue, sem aplicar esse fallback à API. Servir `sw.js` sem cache prolongado.

## Arquivos

Configuração em `frontend/vite.config.js`, interface em `frontend/src/components/PwaStatus.vue` e ícones em `frontend/public/icons/`. `scripts/generate-pwa-icons.cjs` rasteriza o SVG existente com Sharp, usado somente como ferramenta local de desenvolvimento.

## Verificação realizada em 14/09/2026

- Compilação de produção concluída: manifesto, service worker e 21 entradas de precache.
- Quatro testes da lógica da introdução passaram.
- Teste automatizado com Edge em perfil isolado: preparação do cache, recarga sem rede, imagens locais, rotas `/`, `/blog`, `/login` e `/dashboard`, recuperação da conexão e ausência de erros JavaScript.
- Captura mobile 390×844 sem transbordamento horizontal e captura desktop 1280×720.
- Evidências em `docs/pwa-evidence/verification.json` e capturas na mesma pasta. O teste encontrou 16 URLs únicas no cache; a lista de compilação pode conter entradas duplicadas por inclusão de assets.
- Abertura das telas provisórias de login/dashboard não comprova autenticação nem operações offline.
- Ainda não testados: instalação em dispositivo físico e atualização entre duas versões publicadas.
- Registro e envio desta etapa destinados à branch compartilhada `dev`. O envio ao GitHub não comprova um deploy nem substitui os testes em dispositivo físico.
- Integração com `origin/dev` incluindo os ajustes de responsividade e preparação de hospedagem do Murilo: preservados os estilos remotos e adicionados os avisos/configuração PWA. Compilação, quatro testes e verificação offline repetidos com sucesso após a integração.
