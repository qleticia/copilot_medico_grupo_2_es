# Copilot Médico

Sistema gerenciador de pacientes e extensão Chrome de apoio à consulta médica. A solução grava, processa e transcreve os áudios das consultas e oferece um assistente de IA, tornando o atendimento mais ágil, eficiente e organizado.

## Funcionalidades

- **Gestão de pacientes / Prontuário** — cadastro e consulta de pacientes, com histórico das consultas, áudios e transcrições.
- **Assistente de IA** — perguntas ao assistente considerando o histórico do paciente e envio de arquivos em poucos cliques.
- **Transcrição de áudio** — gravação e transcrição das consultas, com diarização por lógica ping-pong (o primeiro a falar é o médico, o segundo o paciente) e log de transcrições por paciente.
- **Exames** — upload de PDFs e extração automática das informações mais relevantes.
- **Anonimização** — a IA remove o nome do paciente antes do processamento.
- **Dashboard** — principais indicadores (número de pacientes, consultas realizadas etc.).

## Tecnologias

**Backend:** Python 3.11 · Flask · Flask-CORS · RabbitMQ · spaCy · Vosk · SpeechRecognition · PyPDF2 · Gemini API · Docker

**Frontend:** React · JavaScript (Node 18) · Chrome Extension API (manifest v3) · Web Audio API

## Estrutura do projeto

```text
copilot_medico_grupo_2_es/
├── API/                      # backend Flask compartilhado
├── front/
│   ├── copmed-extension/     # extensão Chrome
│   └── copmed-web/           # aplicação web React
├── docker-compose.yml
└── README.md
```

A extensão e a aplicação web consomem o mesmo backend em `API/`, mantendo um ponto único para as regras de negócio e integrações com IA, dados de pacientes e processamento de PDFs e áudio.

## Configuração e execução

### Backend

1. Acesse o diretório `API`:
   ```bash
   cd API
   ```
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
3. Gere uma chave da API do Gemini e defina a variável de ambiente `GEMINI_API_KEY` com o valor da chave.
4. Inicie o servidor:
   ```bash
   python server.py
   ```
   Backend disponível em `http://localhost:3001`.

### Extensão Chrome

1. Acesse o diretório da extensão:
   ```bash
   cd front/copmed-extension
   ```
2. Instale as dependências e compile:
   ```bash
   npm install
   npm run build
   ```
3. No Chrome, acesse `chrome://extensions`, ative o **Modo desenvolvedor**, clique em **Carregar sem compactação** e selecione a pasta `dist` gerada.
4. Clique na extensão na barra de ferramentas para começar a usar.

### Funcionalidade de áudio

1. Em `chrome://extensions`, abra as permissões da extensão e altere o **Microfone** de *Perguntar* para *Permitir*.
2. Ao iniciar uma nova consulta, a extensão poderá acessar o microfone e gravar o áudio.
3. Para testar a diarização, ajuste em `audio_service.py`:
   - `MODO_TESTE_SOZINHO = True` — teste sozinho;
   - `MODO_TESTE_SOZINHO = False` — teste com mais de uma pessoa.

### Execução com Docker

1. Crie um arquivo `.env` com `GEMINI_API_KEY`.
2. Na raiz do projeto:
   ```bash
   docker-compose up --build
   ```
3. Backend disponível em `http://localhost:3001`.

## Equipe

Aline Ferreira Barbosa · Italo Rangel · Aimê Carvalho Guimarães · Camila de Sá Vaz · Eryck Emmanuels · Lays Leticia · Leticia Rodrigues
