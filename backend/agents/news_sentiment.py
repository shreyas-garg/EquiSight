import json
from langchain_core.messages import HumanMessage, SystemMessage
from backend.tools.news_tool import get_recent_news
from backend.graph.state import ResearchState
from backend.agents._llm import invoke_llm


SYSTEM_PROMPT = """You are a financial news analyst. Analyze news articles and assess overall market sentiment.
Always respond with valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": number (0-100),
  "key_news": ["string", ...],
  "sentiment_reasoning": "string"
}
Provide 3-6 key news summaries."""


def run_news_sentiment(state: ResearchState) -> dict:
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)
    articles = get_recent_news(ticker, company_name, max_results=10)

    articles_text = "\n\n".join(
        f"Title: {a['title']}\nContent: {a['content'][:500]}"
        for a in articles[:8] if a.get("title") or a.get("content")
    ) or f"No recent news found for {company_name}."

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Analyze news for {company_name} ({ticker}):\n\n{articles_text}"),
    ]

    content = invoke_llm(messages)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        news_data = json.loads(content)
        news_data["articles_analyzed"] = len(articles)
    except json.JSONDecodeError:
        news_data = {"sentiment": "neutral", "sentiment_score": 50, "key_news": [], "sentiment_reasoning": "", "articles_analyzed": len(articles)}

    return {"news_data": news_data}
