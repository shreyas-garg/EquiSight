"""Shared LLM factory with automatic retry and model fallback."""
import os
import re
import time
from langsmith import traceable
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage


# Try these models in order until one works
MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"]
MAX_RETRIES = 3


def _extract_retry_delay(error_message: str) -> float:
    match = re.search(r"retry in (\d+(?:\.\d+)?)\s*s", str(error_message), re.IGNORECASE)
    return min(float(match.group(1)) if match else 30.0, 60.0)


def _is_retryable(error: Exception) -> bool:
    msg = str(error)
    return any(code in msg for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])


@traceable(name="Gemini LLM Call", run_type="llm")
def invoke_llm(messages: list[BaseMessage], temperature: float = 0.1) -> str:
    """Invoke Gemini with automatic retry and model fallback."""
    api_key = os.environ["GOOGLE_API_KEY"]

    for model in MODELS:
        for attempt in range(MAX_RETRIES):
            try:
                llm = ChatGoogleGenerativeAI(model=model, google_api_key=api_key, temperature=temperature)
                response = llm.invoke(messages)
                if model != MODELS[0]:
                    print(f"[LLM] Using fallback model: {model}")
                return response.content.strip()
            except Exception as e:
                if _is_retryable(e):
                    if attempt < MAX_RETRIES - 1:
                        delay = _extract_retry_delay(str(e))
                        print(f"[LLM] {model} unavailable, retrying in {delay:.0f}s (attempt {attempt+1}/{MAX_RETRIES})…")
                        time.sleep(delay)
                    else:
                        print(f"[LLM] {model} exhausted after {MAX_RETRIES} retries, trying next model…")
                        break
                else:
                    raise

    raise RuntimeError("All Gemini models unavailable. Please try again in a few minutes.")
