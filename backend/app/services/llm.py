"""
LLM Service - Handles LLM interactions with multiple providers
"""

import json
import logging
from typing import AsyncGenerator, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with LLM providers"""

    def __init__(self):
        self.config = settings.get_llm_config()
        self.provider = self.config.get("provider")

        if not self.provider:
            logger.warning("No LLM provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GITHUB_TOKEN")

    async def chat(self, message: str, system_prompt: Optional[str] = None) -> str:
        """
        Send a message to the LLM and get a response.

        Args:
            message: User message
            system_prompt: Optional system prompt

        Returns:
            LLM response text
        """
        if not self.provider:
            return "错误: 未配置 LLM 提供商。请在 .env 文件中设置 GITHUB_TOKEN、ANTHROPIC_API_KEY 或 OPENAI_API_KEY。"

        if self.provider == "github":
            return await self._chat_github(message, system_prompt)
        elif self.provider == "openai":
            return await self._chat_openai(message, system_prompt)
        elif self.provider == "anthropic":
            return await self._chat_anthropic(message, system_prompt)
        else:
            return f"错误: 不支持的 LLM 提供商: {self.provider}"

    async def chat_stream(
        self, message: str, system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat responses from the LLM.

        Args:
            message: User message
            system_prompt: Optional system prompt

        Yields:
            Response tokens as they arrive
        """
        if not self.provider:
            yield "错误: 未配置 LLM 提供商。"
            return

        if self.provider == "github":
            async for token in self._stream_github(message, system_prompt):
                yield token
        elif self.provider == "openai":
            async for token in self._stream_openai(message, system_prompt):
                yield token
        elif self.provider == "anthropic":
            async for token in self._stream_anthropic(message, system_prompt):
                yield token
        else:
            yield f"错误: 不支持的 LLM 提供商: {self.provider}"

    async def _chat_github(self, message: str, system_prompt: Optional[str] = None) -> str:
        """Chat using GitHub Models API (OpenAI-compatible)"""
        base_url = self.config.get("base_url", "https://models.inference.ai.azure.com")
        model = self.config.get("model", "gpt-4o")
        api_key = self.config.get("api_key")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2048,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                logger.error(f"GitHub Models API error: {e.response.status_code} - {e.response.text}")
                return f"API 错误: {e.response.status_code}"
            except Exception as e:
                logger.error(f"GitHub Models error: {e}")
                return f"错误: {str(e)}"

    async def _stream_github(
        self, message: str, system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream responses from GitHub Models API"""
        base_url = self.config.get("base_url", "https://models.inference.ai.azure.com")
        model = self.config.get("model", "gpt-4o")
        api_key = self.config.get("api_key")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2048,
                        "stream": True,
                    },
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
            except httpx.HTTPStatusError as e:
                logger.error(f"GitHub Models stream error: {e.response.status_code}")
                yield f"API 错误: {e.response.status_code}"
            except Exception as e:
                logger.error(f"GitHub Models stream error: {e}")
                yield f"错误: {str(e)}"

    async def _chat_openai(self, message: str, system_prompt: Optional[str] = None) -> str:
        """Chat using OpenAI API"""
        api_key = self.config.get("api_key")
        model = self.config.get("model", "gpt-4o")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2048,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error(f"OpenAI API error: {e}")
                return f"错误: {str(e)}"

    async def _stream_openai(
        self, message: str, system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream responses from OpenAI API"""
        api_key = self.config.get("api_key")
        model = self.config.get("model", "gpt-4o")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST",
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2048,
                        "stream": True,
                    },
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
            except Exception as e:
                logger.error(f"OpenAI stream error: {e}")
                yield f"错误: {str(e)}"

    async def _chat_anthropic(self, message: str, system_prompt: Optional[str] = None) -> str:
        """Chat using Anthropic API"""
        api_key = self.config.get("api_key")
        model = self.config.get("model", "claude-sonnet-4-20250514")

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                body = {
                    "model": model,
                    "max_tokens": 2048,
                    "messages": [{"role": "user", "content": message}],
                }
                if system_prompt:
                    body["system"] = system_prompt

                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                response.raise_for_status()
                data = response.json()
                return data["content"][0]["text"]
            except Exception as e:
                logger.error(f"Anthropic API error: {e}")
                return f"错误: {str(e)}"

    async def _stream_anthropic(
        self, message: str, system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream responses from Anthropic API"""
        api_key = self.config.get("api_key")
        model = self.config.get("model", "claude-sonnet-4-20250514")

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                body = {
                    "model": model,
                    "max_tokens": 2048,
                    "messages": [{"role": "user", "content": message}],
                    "stream": True,
                }
                if system_prompt:
                    body["system"] = system_prompt

                async with client.stream(
                    "POST",
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=body,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            try:
                                data = json.loads(data_str)
                                if data.get("type") == "content_block_delta":
                                    delta = data.get("delta", {})
                                    text = delta.get("text", "")
                                    if text:
                                        yield text
                            except json.JSONDecodeError:
                                continue
            except Exception as e:
                logger.error(f"Anthropic stream error: {e}")
                yield f"错误: {str(e)}"


# Global LLM service instance
llm_service = LLMService()
