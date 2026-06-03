# Frontend — Sistema de Envio de Mensagens

SPA em **React + Vite** que consome a API do backend Laravel.

**Em produção, este frontend é servido pelo NGINX**, que também atua como
proxy reverso para a API. O React nunca chama o Laravel diretamente —
ele faz `fetch('/api/...')` (URL relativa) e o nginx encaminha.

> Este é **um dos dois repositórios** do trabalho. O outro é o
> [`backend`](../backend) (Laravel + Postgres + Redis + worker). Para o
> `docker-compose` funcionar, ambos devem ser clonados como pastas
> **irmãs** (mesmo diretório pai).

## Arquitetura geral

```
                              ┌──────────────┐
                              │   Browser    │
                              └──────┬───────┘
                                     │  http://localhost
                                     ▼
                              ┌──────────────┐
                              │    NGINX     │   ← serve este projeto
                              │  (gateway)   │
                              │              │
                              │  /      ───► dist/ (build do React)
                              │  /api/* ───► proxy → backend:8000
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   Backend    │  (outro repositório)
                              │  (Laravel)   │
                              └──────────────┘
```

Como tudo fica na **mesma origem** (mesmo host/porta do nginx), **CORS
não é problema** — o navegador enxerga uma única aplicação.

## Stack

- React 18
- Vite 5 (build + dev server)
- `fetch` nativo (sem axios, sem libs de estado — é simples de propósito)
- `nginx.conf` pronto para uso em produção

## Estrutura

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── nginx.conf           # config de produção: serve dist/ e proxy /api/
├── src/
│   ├── main.jsx         # bootstrap React
│   ├── App.jsx          # tela única: formulário + lista de mensagens
│   ├── api.js           # fetch para URLs relativas /api/...
│   └── index.css
└── README.md
```

## Modos de execução

Existem **dois cenários** distintos:

### 1. Desenvolvimento local (sem nginx)

Você roda o Vite dev server. O Vite tem um proxy embutido que encaminha
`/api/*` para `http://localhost:8000` (o `php artisan serve` do backend).

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O backend precisa estar rodando em
`http://localhost:8000` (veja o README do repo `backend/`).

> Esse modo é só para você desenvolver e testar peças isoladas.
> Não tem nginx envolvido aqui.

### 2. Produção (com nginx) — alvo da tarefa

```
http://localhost:80 ──► nginx ──┬──► serve dist/ (React)
                                └──► proxy /api/* para o backend Laravel
```

Como funciona conceitualmente:

1. `npm install && npm run build` gera o `dist/`.
2. O `dist/` é entregue ao container do nginx (ex.: `/usr/share/nginx/html`).
3. O `nginx.conf` deste repo já está pronto e cuida de:
   - Servir os estáticos do React.
   - Fazer `proxy_pass http://backend:8000` em `/api/*`.
   - Fallback SPA: qualquer rota desconhecida cai em `index.html`.
4. O nginx escuta na porta 80 — única porta exposta para o host.

## Por que tudo passa pelo nginx?

- **Sem CORS**: como o React e a API estão na **mesma origem**, não há
  requisição cross-origin. Sem `cors.php`, sem pre-flight OPTIONS.
- **Única porta exposta**: simplifica deploy e firewall (só a 80/443).
- **SPA routing**: o `nginx.conf` já tem o `try_files ... /index.html`,
  que faz qualquer rota desconhecida cair no React Router.
- **Cache de assets**: arquivos com hash no nome (`.js`, `.css`) ganham
  `Cache-Control: immutable` automaticamente.

## Como funciona o app

1. Ao carregar, o React faz `GET /api/messages` e renderiza a lista.
2. A cada **2 segundos** refaz o `GET /api/messages` (polling) — é assim
   que você vê o status `pending → sent` mudar sem recarregar a página.
3. Ao enviar o formulário, o React faz `POST /api/messages` e injeta a
   resposta no topo da lista imediatamente.

## Build

```bash
npm run build       # gera dist/
npm run preview     # serve dist/ localmente para inspeção
```

O `dist/` é o que deve ser entregue ao nginx no container.

## O que você precisa entregar (parte da tarefa)

A entrega final do trabalho exige que tudo rode em containers, com o
**nginx como ponto único de entrada**. Você precisa criar:

- [ ] **`Dockerfile`** neste repositório, idealmente em **multi-stage**:
  - **Stage 1** (Node): instala dependências e roda `npm run build`.
  - **Stage 2** (nginx): copia o `dist/` e o `nginx.conf` deste repo
    para a imagem oficial do nginx.

Resultado: imagem final pequena, sem Node, contendo só os estáticos e
o nginx pronto pra fazer proxy da API.

O `docker-compose.yml` que orquestra os 5 serviços (nginx, backend,
worker, postgres, redis) fica no repositório `backend/`. Lá ele
referencia este repo como `../frontend` (por isso é importante clonar
os dois como pastas irmãs).

### Diretório de trabalho esperado

```
algum-pai/
├── backend/    ← outro repositório (onde fica o docker-compose.yml)
└── frontend/   ← este repositório
```

## Dicas de teste manual

- Em produção (via nginx), abra o DevTools → Network. As chamadas devem
  aparecer como `/api/messages` na **mesma origem** do site. Se aparecer
  `http://localhost:8000/...`, o React está bypassando o nginx — algo
  está errado.
- Envie uma mensagem **com o worker rodando** → status vira `sent` em ~3s.
- Envie uma mensagem **com o worker derrubado** → status fica `pending`
  até você subir `php artisan queue:work` no backend. Isso prova que
  a fila está realmente desacoplando frontend de processamento.
