# Eventum API

API simples para gerenciar eventos acadêmicos. Objetivo: eliminar processos manuais, facilitar inscrições e automatizar emissão de certificados.

Funcionalidades principais
- RF01: Permitir cadastro de usuários (POST /users)
- RF02: Permitir a criação de eventos (POST /events)
- RF03: Listar os eventos disponíveis (GET /events)
- RF04: Permitir inscrições em eventos (POST /subscribe)
- RF05: Listar inscrições (GET /subscribe)

Requisitos
- Node.js 16+ (ou compatível)
- npm

Instalação
1. Clone o repositório ou copie os arquivos para uma pasta local.
2. No diretório do projeto execute:
   npm install

Configuração
- O servidor respeita a variável de ambiente PORT (ex.: PORT=3000).
- O banco usado é SQLite e o arquivo fica na raiz do projeto com o nome `eventum.db` (gerado automaticamente pela aplicação).
  Observação: a implementação atual não lê `DB_PATH` de `.env`; se quiser usar outro caminho, ajuste `src/db.js`.

Ignorar arquivos
- Verifique o arquivo `.gitignore` já incluído para não versionar node_modules, banco local e arquivos temporários.

Execução
- Em desenvolvimento:
  npm start

Pontos de entrada (endpoints)
- Health:
  GET /            -> retorna { status: 'ok', service: 'eventum-api' }

- Usuários:
  POST /users      -> cadastrar usuário
    Body JSON: { "name": "Nome", "email": "a@b.com", "password": "senha" }

- Eventos:
  POST /events     -> criar evento
    Body JSON: { "title": "Título", "description": "Descrição", "date": "YYYY-MM-DD", "createdBy": 1, "qtdSubs": 100 }
    - campo qtdSubs é opcional; padrão 100.
    - Resposta inclui o campo qtdSubs no JSON de criação.
  GET  /events     -> lista eventos
    - Retorna: id, title, description, date, createdBy, createdAt.
    - Ordenação: eventos com data definida primeiro por date ASC, depois por created_at DESC; eventos sem data são listados por último.

- Inscrições:
  POST /subscribe  -> criar inscrição
    Body JSON: { "eventId": 1, "userId": 2 }
    - Valida se o evento existe e se ainda há vagas (com base em qtdSubs).
  GET  /subscribe  -> lista todas as inscrições
    - Retorna: id, eventId, userId, createdAt.

Exemplos com curl
- Criar usuário:
  curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Ana","email":"ana@example.com","password":"123456"}'

- Criar evento:
  curl -X POST http://localhost:3000/events -H "Content-Type: application/json" -d '{"title":"Seminário","description":"Tema X","date":"2025-10-20","createdBy":1,"qtdSubs":50}'

- Listar eventos:
  curl http://localhost:3000/events

- Inscrever usuário em evento:
  curl -X POST http://localhost:3000/subscribe -H "Content-Type: application/json" -d '{"eventId":1,"userId":2}'

- Listar inscrições:
  curl http://localhost:3000/subscribe

Observações
- A aplicação usa SQLite por padrão (arquivo `eventum.db` na raiz do projeto).
- Ao inicializar, o código tenta criar a coluna `qtdSubs` na tabela `events` (com padrão 100). Erros por coluna duplicada são ignorados.
- Atualmente não há autenticação; para produção, proteja variáveis sensíveis, adicione autenticação/autorização e migrações reais de banco.
- As rotas de inscrição foram ajustadas para usar `/subscribe` (POST para criar, GET para listar).

Licença
- Arquivo de exemplo — adapte conforme necessidade.
