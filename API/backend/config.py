"""
    Arquivo de configuração do projeto Copilot Médico
    Carrega a chave da API do Gemini a partir das variáveis de ambiente
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Variáveis que já tínhamos
    db_url: str = "sqlite:///app.db"
    app_title: str = "Copilot Médico"

    # Nova variável para a chave do Gemini
    # O Pydantic irá procurar automaticamente a variável de ambiente "GEMINI_API_KEY"
    gemini_api_key: str = ""

    # Configuração para carregar do arquivo .env (dentro de backend/.env)
    _ENV_PATH = Path(__file__).with_name(".env")
    model_config = SettingsConfigDict(env_file=str(_ENV_PATH))


# Instância única das configurações
settings = Settings()