"""
Groq client factory with automatic key fallback on rate limit.

Usage:
    from agents.groq_client import groq_chat

    response = await groq_chat(
        primary_key_env="ACCOMMODATION_API_KEY",
        model=GROQ_MODEL,
        messages=[...],
        max_tokens=2500,
        temperature=0.3,
        response_format={"type": "json_object"},
    )
"""
from __future__ import annotations

import os
from typing import Any

import groq as groq_sdk
from groq import AsyncGroq

# Ordered list of fallback env var names tried when primary key is rate-limited.
# Add more keys here if you add additional Groq accounts.
_FALLBACK_KEY_ENVS = [
    "BUDGET_API_KEY",
    "GROQ_API_KEY",
]

_FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.0-8b-instant",
]


def _resolve_keys(primary_env: str) -> list[str]:
    """
    Build a deduplicated list of API keys to try, starting with primary_env
    then falling back through _FALLBACK_KEY_ENVS.
    """
    seen: set[str] = set()
    keys: list[str] = []
    for env in [primary_env] + _FALLBACK_KEY_ENVS:
        val = os.getenv(env, "")
        if val and val not in seen:
            seen.add(val)
            keys.append(val)
    return keys


async def groq_chat(
    primary_key_env: str,
    model: str,
    messages: list[dict],
    max_tokens: int = 2048,
    temperature: float = 0.3,
    **kwargs: Any,
) -> Any:
    """
    Call Groq chat completions, automatically retrying with the next available
    API key when a RateLimitError is encountered. Falls back to smaller models
    if the requested model hits TPM limits.
    """
    keys = _resolve_keys(primary_key_env)
    models = [model] + _FALLBACK_MODELS
    last_exc: Exception | None = None

    for m in models:
        for i, key in enumerate(keys):
            key_label = f"key #{i + 1} ({primary_key_env if i == 0 else _FALLBACK_KEY_ENVS[i - 1]})"
            print(
                f"[Groq] REQUEST  model={m} | {key_label} | "
                f"messages={len(messages)} | max_tokens={max_tokens} | temp={temperature}",
                flush=True,
            )
            try:
                client = AsyncGroq(api_key=key)
                result = await client.chat.completions.create(
                    model=m,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    **kwargs,
                )
                content_len = len(result.choices[0].message.content or "") if result.choices else 0
                print(
                    f"[Groq] RESPONSE model={m} | {key_label} | "
                    f"content_len={content_len} chars | "
                    f"usage={result.usage}",
                    flush=True,
                )
                return result
            except (groq_sdk.RateLimitError, groq_sdk.APIStatusError, groq_sdk.BadRequestError, groq_sdk.AuthenticationError) as exc:
                is_retryable = (
                    exc.status_code in (401, 429, 413) or
                    "rate_limit" in str(exc).lower() or
                    "too large" in str(exc).lower() or
                    "decommissioned" in str(exc).lower() or
                    "invalid_api_key" in str(exc).lower()
                )
                if is_retryable:
                    last_exc = exc
                    key_label = f"key #{i + 1} ({primary_key_env if i == 0 else _FALLBACK_KEY_ENVS[i - 1]})"
                    print(
                        f"[Groq] Retryable error on {key_label} with model {m} — "
                        + (f"trying next option..." if (i + 1 < len(keys) or m != models[-1]) else "no more keys.")
                    , flush=True)
                    continue
                raise exc

    raise last_exc  # type: ignore[misc]
