"""
Application Configuration
"""

from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment"""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://agent:password@localhost:5432/spatial_agent"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # LLM API Keys
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # GitHub Copilot / GitHub Models
    GITHUB_TOKEN: str = ""
    GITHUB_MODELS_ENDPOINT: str = "https://models.inference.ai.azure.com"
    GITHUB_MODELS_MODEL: str = "gpt-4o"

    # Device API
    DEVICE_API_ENDPOINT: str = ""
    DEVICE_API_KEY: str = ""

    class Config:
        env_file = "../.env"  # Read from project root
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env

    def get_llm_provider(self) -> Optional[str]:
        """
        Determine which LLM provider to use based on available credentials.
        Priority: Anthropic > OpenAI > GitHub Models
        """
        if self.ANTHROPIC_API_KEY:
            return "anthropic"
        elif self.OPENAI_API_KEY:
            return "openai"
        elif self.GITHUB_TOKEN:
            return "github"
        return None

    def get_llm_config(self) -> dict:
        """
        Get LLM configuration based on available provider.
        Returns dict with provider-specific settings.
        """
        provider = self.get_llm_provider()

        if provider == "anthropic":
            return {
                "provider": "anthropic",
                "api_key": self.ANTHROPIC_API_KEY,
                "model": "claude-sonnet-4-20250514",
            }
        elif provider == "openai":
            return {
                "provider": "openai",
                "api_key": self.OPENAI_API_KEY,
                "model": "gpt-4o",
            }
        elif provider == "github":
            return {
                "provider": "github",
                "api_key": self.GITHUB_TOKEN,
                "base_url": self.GITHUB_MODELS_ENDPOINT,
                "model": self.GITHUB_MODELS_MODEL,
            }

        return {"provider": None}


settings = Settings()
