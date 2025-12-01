# Co-pilot Médico

**Co-pilot Médico**

## Requisitos

### Backend

- **Tecnologias**:
  - Python (3.11.2)
  - Flask (3.0.3)
  - API Gemini
  - spaCy
  - PyPDF2
  - SpeachRecognition
  - Vosk

### Frontend

- **Tecnologias**:
  - JavaScript (v18.12.1)
  - Extensão Chrome ("manifest_version" : 3)
  - Node
  - React

### Funcionalidades
  - Acesso a dados do prontuário eletrônico da Amplimed em tempo real
  - Upload de PDFs referentes a exames, medicações e casos do paciente
  - Assistente de IA: É possível fazer perguntas à inteligência artificial e enviar arquivos com poucos cliques
  - Histórico de interações: A aplicação salva o histórico de interações por paciente, que pode ser consultado posteriormente
  - Anonimato: a IA filtra os dados removendo o nome do paciente
  - Extrai as informações mais importantes dos exames
  - Faz a transcrição de áudios gravados
  - Faz a diarização através de uma lógica ping-pong, onde a primeira pessoa que falar é definida como médico e a outra pessoa que falar será o paciente
  - Armazena as transcrições em um log de transcrições para cada paciente

#### Backend

1. Navegue até o diretório `API`
```bash
cd API
```
2. Instale as bibliotecas necessárias através do requirements.txt
```bash
pip install requirements.txt
```

3. Gere uma chave API do gemini no site e criar uma nova váriavel de usuário com o nome ( GEMINI_API_KEY) e coloque-a a key no Valor da variável.

#### Frontend

1. Navegue para o diretório `front/copmed-extension`:

   ```bash
   cd front/copmed-extension
   ```

2. Instale as dependências do Node.js:

   ```bash
   npm install
   ```

3. Compile o código para gerar a extensão:

   ```bash
   npm run build
   ```

4. Após a compilação, utilize a pasta `dist` como a extensão para o Chrome.

---

## Usando a Extensão no Chrome

### Passo a Passo para Carregar a Extensão no Modo Desenvolvedor

1. Abra o Chrome e acesse a página de extensões:

   - No navegador, clique em **Menu (três pontos no canto superior direito) > Mais ferramentas > Extensões**, ou simplesmente acesse `chrome://extensions` na barra de endereço.

2. Ative o **Modo Desenvolvedor**:

   - Na parte superior direita da página de extensões, ative o botão de **Modo desenvolvedor**.

3. Carregue a extensão:

   - Clique no botão **Carregar sem compactação** (ou **Load unpacked**).
   - Navegue até o diretório `dist` gerado no passo anterior e selecione-o.

4. Inicie o servidor:
   No diretório API:

   Instalar Flask-Cors antes de iniciar o SERVER.PY

   ```bash
   pip install Flask-Cors
   ```

   ```bash
   python server.py
   ```

5. Teste a extensão:
   - A extensão deve aparecer na sua barra de ferramentas. Clique nela para começar a usar!

## Usando a funcionalidade de áudio
### passo a passo para utilizar a funcionalidade de áudio
1. Abra a extensão na barra de tarefas:
   - Na barra de tarefas clique no ícone de extensões, ao ver a extensão do copilot clique em Mais opções (três pontos ao lado da extensão) e acesse *conferir permissões da web*
2. Ative o microfone:
   - Na permissão de microfone altere de Perguntar(padrão) para Permitir
3. Teste a funcionalidade de áudio:
   - Agora quando você iniciar uma nova consulta, você poderá utilizar a extensão poderá acessar seu microfone e gravar o áudio ao abrir uma nova consulta
4. Modo Teste Sozinho:
   - Caso você queira testar a diarização da transcrição de áudio sozinho vá para o arquivo `audio_service.py` e lá faça a seguinte mudança:
   ```python
   MODO_TESTE_SOZINHO = True
   ```
5. Testar com mais de uma pessoa:
   - Caso queira testar a diarização da transcrição de áudio com mais de uma pessoa basta ir em `audio_service.py` e fazer a seguinte mudança:
   ```python
   MODO_TESTE_SOZINHO = False
   ```
# Executando com Docker

1. Crie .env com GEMINI_API_KEY.
2. Na raiz do projeto:
   docker-compose up --build
3. Backend disponível em http://localhost:3001
4. Frontend (opcional) disponível em http://localhost:8080 (apenas para testar a build)

---
