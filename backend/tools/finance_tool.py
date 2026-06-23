import yfinance as yf
from typing import Any
import numpy as np


def _clean(value: Any) -> Any:
    """Convert numpy scalars to native Python types for JSON/msgpack serialization."""
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return None if np.isnan(value) else float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def get_company_info(ticker: str) -> dict[str, Any]:
    """Fetch company overview and key metrics from Yahoo Finance."""
    stock = yf.Ticker(ticker)
    info = stock.info

    return {k: _clean(v) for k, v in {
        "company_name": info.get("longName", ticker),
        "sector": info.get("sector", "Unknown"),
        "industry": info.get("industry", "Unknown"),
        "market_cap": info.get("marketCap", 0),
        "business_summary": info.get("longBusinessSummary", ""),
        "website": info.get("website", ""),
        "employees": info.get("fullTimeEmployees", 0),
        "country": info.get("country", ""),
        "currency": info.get("currency", "USD"),
    }.items()}


def get_financial_metrics(ticker: str) -> dict[str, Any]:
    """Fetch key financial metrics for analysis."""
    stock = yf.Ticker(ticker)
    info = stock.info

    hist = stock.history(period="1y")
    price_change_1y = 0.0
    if not hist.empty and len(hist) >= 2:
        price_change_1y = float(
            (hist["Close"].iloc[-1] - hist["Close"].iloc[0]) / hist["Close"].iloc[0] * 100
        )

    return {k: _clean(v) for k, v in {
        "current_price": info.get("currentPrice") or info.get("regularMarketPrice", 0),
        "pe_ratio": info.get("trailingPE", None),
        "forward_pe": info.get("forwardPE", None),
        "price_to_book": info.get("priceToBook", None),
        "debt_to_equity": info.get("debtToEquity", None),
        "return_on_equity": info.get("returnOnEquity", None),
        "return_on_assets": info.get("returnOnAssets", None),
        "revenue_growth": info.get("revenueGrowth", None),
        "earnings_growth": info.get("earningsGrowth", None),
        "profit_margin": info.get("profitMargins", None),
        "operating_margin": info.get("operatingMargins", None),
        "free_cashflow": info.get("freeCashflow", None),
        "total_revenue": info.get("totalRevenue", None),
        "total_debt": info.get("totalDebt", None),
        "cash": info.get("totalCash", None),
        "beta": info.get("beta", None),
        "52w_high": info.get("fiftyTwoWeekHigh", None),
        "52w_low": info.get("fiftyTwoWeekLow", None),
        "dividend_yield": info.get("dividendYield", None),
        "price_change_1y_pct": round(price_change_1y, 2),
        "analyst_target_price": info.get("targetMeanPrice", None),
        "recommendation_key": info.get("recommendationKey", ""),
    }.items()}
