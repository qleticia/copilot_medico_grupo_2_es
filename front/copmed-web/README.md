# Copilot Medico Web

Aplicacao React/Vite da interface web do Copilot Medico.

Esta web consome o backend Flask compartilhado em `API/`. A base de pacientes nao e separada: a listagem usa `GET /api/all-patients` e o cadastro usa `POST /api/patients`.

## Variaveis de ambiente

Crie um arquivo `.env` nesta pasta quando precisar alterar a URL da API:

```bash
VITE_API_URL=http://localhost:3001
```

Se a variavel nao for informada, a web usa `http://localhost:3001`.

## Como rodar

Em um terminal, suba o backend:

```bash
cd API
python server.py
```

Em outro terminal, rode a web:

```bash
cd front/copmed-web
npm install
npm run dev
```

Por padrao, o Vite abre a web em `http://localhost:5174`.

## Funcionalidades nesta etapa

- Login via `POST /api/auth/login`.
- Armazenamento do token Bearer em `localStorage`.
- Navegacao basica: Dashboard, Pacientes, Agendamentos, Analise com IA, Atendimentos, Relatorios e Configuracoes.
- Listagem de pacientes via backend compartilhado.
- Cadastro de paciente via backend compartilhado.
- Visualizacao inicial de consultas do paciente via `GET /api/patients/:id/consultations`.

## Limitacoes conhecidas

- O backend oficial atual persiste apenas o nome no endpoint `POST /api/patients`.
- Agendamentos aparecem como funcionalidade prevista porque o backend oficial ainda nao possui as rotas `/api/agendamentos`.
- As telas de Analise com IA, Atendimentos, Relatorios e Configuracoes estao estruturadas, mas ainda sem fluxo completo nesta task.
