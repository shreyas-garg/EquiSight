"""Shared LLM factory with automatic retry on quota exhaustion."""
import os
import re
import time
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage


MODEL = "gemini-2.5-flash-lite"
MAX_RETRIES = 5


def _extract_retry_delay(error_message: str) -> float:
    """Pull the suggested retry delay from a 429 error message."""
    match = re.search(r"retry in (\d+(?:\.\d+)?)\s*s", str(error_message), re.IGNORECASE)
    return float(match.group(1)) if match else 60.0


def invoke_llm(messages: list[BaseMessage], temperature: float = 0.1) -> str:
    """Invoke Gemini with automatic retry on 429 RESOURCE_EXHAUSTED."""
    llm = ChatGoogleGenerativeAI(
        model=MODEL,
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=temperature,
    )

    for attempt in range(MAX_RETRIES):
        try:
            response = llm.invoke(messages)
            return response.content.strip()
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                delay = _extract_retry_delay(str(e))
                print(f"[Rate limit] Waiting {delay:.0f}s before retry {attempt + 1}/{MAX_RETRIES}…")
                time.sleep(delay + 2)
            else:
                raise

    raise RuntimeError(f"LLM failed after {MAX_RETRIES} retries due to rate limiting.")
