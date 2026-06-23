import os
from tavily import TavilyClient
from typing import Any


def get_recent_news(ticker: str, company_name: str, max_results: int = 10) -> list[dict[str, Any]]:
    """Fetch recent news articles about a company using Tavily Search."""
    client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

    query = f"{company_name} ({ticker}) stock news financial performance 2024 2025"
    response = client.search(
        query=query,
        search_depth="advanced",
        max_results=max_results,
        include_answer=True,
    )

    articles = []
    for result in response.get("results", []):
        articles.append({
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "content": result.get("content", ""),
            "score": result.get("score", 0),
            "published_date": result.get("published_date", ""),
        })

    return articles
