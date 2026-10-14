import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "The Attack Path Compiler"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = Field(default="sqlite:///./attack_path_compiler.db", alias="DATABASE_URL")
    DEBUG: bool = Field(default=False, alias="DEBUG")
    DEFAULT_SEED: int = 42

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

# Fallback in case pydantic_settings is not installed or has issues
try:
    settings = Settings()
except Exception:
    class SimpleSettings:
        PROJECT_NAME: str = "The Attack Path Compiler"
        VERSION: str = "1.0.0"
        API_V1_STR: str = "/api/v1"
        DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./attack_path_compiler.db")
        DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
        DEFAULT_SEED: int = 42
    settings = SimpleSettings()
