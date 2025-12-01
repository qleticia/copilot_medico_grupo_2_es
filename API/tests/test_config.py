import importlib
from ..backend import config as cfg


def test_settings_reads_env(env_for_config, monkeypatch):
    # Modify env to unique values and reload module to apply
    monkeypatch.setenv("DB_URL", "sqlite:///override.db")
    monkeypatch.setenv("APP_TITLE", "Override Title")
    monkeypatch.setenv("GEMINI_API_KEY", "override-key")

    importlib.reload(cfg)
    s = cfg.settings

    assert s.db_url == "sqlite:///override.db"
    assert s.app_title == "Override Title"
    assert s.gemini_api_key == "override-key"
