# Guia visual e protótipo administrativo

Registro da revisão local iniciada em 12 de outubro de 2026. Este documento não substitui um manual de marca aprovado pela Miniverso.

## Identidade verificada

- A logo horizontal original continua sendo usada como imagem, sem recriação tipográfica ou alteração do arquivo.
- O site público da Miniverso usa a sequência tipográfica "Random Grotesque Standard", "Space Grotesk", sans-serif.
- Como o repositório não contém licença nem arquivo da Random Grotesque Standard, o protótipo incorpora a versão variável e aberta da Space Grotesk e mantém alternativas de sistema. A fonte é empacotada pela PWA e funciona offline.
- A paleta permanece concentrada em azul-marinho, ciano claro, branco e transparências azuladas. A marca não foi recolorida.

## Portfólio público consultado

A página pública https://miniversotech.base44.app/#projetos apresentava sete projetos na consulta:

1. Avati: Do zero a um milhão;
2. Aliados do Sucesso: Desafio SEBRAETEC;
3. Reciclaverso;
4. Desafio Entre Mães;
5. EMAP: Itaquiz;
6. Projeto Manabi;
7. MINIVERSO 360.

Os títulos, categorias, resumos, links e imagens usados no protótipo vieram dessa página pública. Eles continuam vinculados às páginas oficiais para detalhes.

## Referências de interação adaptadas a Vue

- HoldButton: confirmação por gesto contínuo para reduzir exclusões acidentais no dashboard.
- PulseHeart: adaptado para uma estrela de destaque; não representa curtidas sociais.
- LineSidebar: mostra a seção ativa e o avanço da rolagem na landing page.
- LogoLoop: adaptado para áreas de atuação verificáveis, evitando inventar logos de parceiros ainda não fornecidas.

## Limite de segurança do protótipo

O login e o CRUD desta etapa são uma demonstração local em Vue, persistida no localStorage e protegida somente por uma sessão do navegador. Isso permite avaliar o fluxo e o layout, mas não constitui autenticação segura. A próxima etapa deve conectar o frontend ao backend Node, definir usuários e permissões e escolher a persistência antes de uso real.
