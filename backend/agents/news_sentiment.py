import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.tools.news_tool import get_recent_news
from backend.graph.state import ResearchState


SYSTEM_PROMPT = """You are a financial news analyst specializing in sentiment analysis for equity research.
Analyze the provided news articles about a company and assess the overall market sentiment.

Scoring guidance:
- sentiment: "positive", "neutral", or "negative"
- sentiment_score (0-100): 0-39 = strongly negative, 40-59 = neutral, 60-100 = positive
- Focus on: earnings reports, product launches, regulatory news, management changes,
  competitive dynamics, macroeconomic factors affecting the company

Always respond with valid JSON matching this exact schema:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": number (0-100),
  "key_news": ["string", ...],
  "sentiment_reasoning": "string (2-3 sentences explaining the overall sentiment)"
}

Provide 3-6 key news headlines/summaries (rewritten for clarity, not raw URLs).
"""


def run_news_sentiment(state: ResearchState) -> dict:
    """Fetch news and analyze sentiment using the LLM."""
    ticker = state.ticker
    company_name = state.company_data.get("company_name", ticker)

    articles = get_recent_news(ticker, company_name, max_results=10)

    articles_text = "\n\n".join(
        f"Title: {a['title']}\nContent: {a['content'][:500]}"
        for a in articles[:8]
        if a.get("title") or a.get("content")
    )

    if not articles_text:
        articles_text = f"No recent news articles found for {company_name}."

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.1,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Analyze the following recent news articles for {company_name} ({ticker}) "
                f"and provide a sentiment assessment:\n\n{articles_text}"
            )
        ),
    ]

    response = llm.invoke(messages)
    content = response.content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        news_data = json.loads(content)
        news_data["articles_analyzed"] = len(articles)
    except json.JSONDecodeError:
        news_data = {
            "sentiment": "neutral",
            "sentiment_score": 50,
            "key_news": ["Unable to parse sentiment analysis"],
            "sentiment_reasoning": "Sentiment analysis could not be fully parsed.",
            "articles_analyzed": len(articles),
        }

    return {"news_data": news_data}
