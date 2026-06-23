"""
Evaluation test suite for the AI Equity Research system.
Uses LangSmith for tracing and evaluation.
"""
import os
import json
import asyncio
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Set LangSmith environment variables before importing langchain
os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
os.environ.setdefault("LANGCHAIN_PROJECT", "ai-equity-research-eval")

from langsmith import Client
from langsmith.evaluation import evaluate, LangChainStringEvaluator

from backend.graph.state import ResearchState
from backend.graph.workflow import research_graph


# --- Test cases ---

TEST_CASES = [
    {
        "ticker": "AAPL",
        "expected_sector": "Technology",
        "description": "Apple Inc. - Large-cap tech leader",
    },
    {
        "ticker": "MSFT",
        "expected_sector": "Technology",
        "description": "Microsoft Corp. - Cloud and enterprise software giant",
    },
    {
        "ticker": "NVDA",
        "expected_sector": "Technology",
        "description": "NVIDIA Corp. - AI chip and GPU leader",
    },
    {
        "ticker": "TSLA",
        "expected_sector": "Consumer Cyclical",
        "description": "Tesla Inc. - EV and clean energy company",
    },
    {
        "ticker": "AMZN",
        "expected_sector": "Consumer Cyclical",
        "description": "Amazon.com Inc. - E-commerce and cloud leader",
    },
]


# --- Evaluation functions ---

def run_research_for_ticker(ticker: str, run_id: str | None = None) -> dict:
    """Execute the research workflow for a single ticker and return the final state."""
    import uuid
    run_id = run_id or str(uuid.uuid4())
    thread_id = f"eval-{run_id}"

    initial_state = ResearchState(ticker=ticker, run_id=run_id)
    config = {"configurable": {"thread_id": thread_id}}

    final_state = None
    for chunk in research_graph.stream(initial_state.model_dump(), config=config, stream_mode="values"):
        final_state = chunk

    # Resume with approval to complete the workflow
    research_graph.update_state(config, {"approval_status": True}, as_node="human_approval")
    for chunk in research_graph.stream(None, config=config, stream_mode="values"):
        final_state = chunk

    return final_state or {}


def evaluate_output_completeness(state: dict) -> dict:
    """Check that all required output fields are present and non-empty."""
    checks = {
        "company_data_present": bool(state.get("company_data")),
        "financial_data_present": bool(state.get("financial_data")),
        "news_data_present": bool(state.get("news_data")),
        "risk_data_present": bool(state.get("risk_data")),
        "recommendation_present": bool(state.get("recommendation")),
        "financial_score_valid": 0 <= state.get("financial_data", {}).get("financial_score", -1) <= 100,
        "risk_score_valid": 0 <= state.get("risk_data", {}).get("risk_score", -1) <= 100,
        "sentiment_score_valid": 0 <= state.get("news_data", {}).get("sentiment_score", -1) <= 100,
        "confidence_valid": 0 <= state.get("recommendation", {}).get("confidence", -1) <= 100,
        "recommendation_valid": state.get("recommendation", {}).get("recommendation") in {"BUY", "HOLD", "SELL"},
        "risk_level_valid": state.get("risk_data", {}).get("risk_level") in {"low", "medium", "high"},
        "sentiment_valid": state.get("news_data", {}).get("sentiment") in {"positive", "neutral", "negative"},
        "disclaimer_present": bool(state.get("recommendation", {}).get("disclaimer")),
        "pdf_generated": bool(state.get("pdf_path")) and os.path.exists(state.get("pdf_path", "")),
    }
    passed = sum(checks.values())
    total = len(checks)
    return {
        "checks": checks,
        "passed": passed,
        "total": total,
        "score": passed / total,
    }


def evaluate_guardrails(state: dict) -> dict:
    """Verify that guardrail constraints are satisfied."""
    rec = state.get("recommendation", {})
    disclaimer = rec.get("disclaimer", "")
    reasoning = rec.get("reasoning", "")

    forbidden_phrases = [
        "guarantee", "guaranteed", "risk-free", "will definitely",
        "promise", "no way to lose", "certain profit",
    ]

    violations = [p for p in forbidden_phrases if p in reasoning.lower()]

    return {
        "has_disclaimer": bool(disclaimer),
        "no_financial_guarantee_violations": len(violations) == 0,
        "violations_found": violations,
        "guardrail_score": 1.0 if (disclaimer and not violations) else 0.0,
    }


def evaluate_conditional_routing(state: dict) -> dict:
    """Verify that high-risk routing was correctly triggered when applicable."""
    risk_score = state.get("risk_data", {}).get("risk_score", 0)
    high_risk_triggered = state.get("risk_data", {}).get("high_risk_review_triggered", False)

    if risk_score > 75:
        routing_correct = high_risk_triggered
        expected = "high_risk_review"
    else:
        routing_correct = not high_risk_triggered
        expected = "investment_committee"

    return {
        "risk_score": risk_score,
        "expected_path": expected,
        "high_risk_triggered": high_risk_triggered,
        "routing_correct": routing_correct,
    }


# --- Main evaluation runner ---

def run_evaluation(tickers: list[str] | None = None) -> dict:
    """Run the full evaluation suite and print results."""
    cases = [t for t in TEST_CASES if t["ticker"] in (tickers or [t["ticker"] for t in TEST_CASES])]

    results = []
    print(f"\n{'='*60}")
    print(f"AI Equity Research — Evaluation Suite")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Test cases: {len(cases)}")
    print(f"{'='*60}\n")

    for case in cases:
        ticker = case["ticker"]
        print(f"▶ Running: {ticker} — {case['description']}")

        try:
            state = run_research_for_ticker(ticker)

            completeness = evaluate_output_completeness(state)
            guardrails = evaluate_guardrails(state)
            routing = evaluate_conditional_routing(state)

            result = {
                "ticker": ticker,
                "description": case["description"],
                "status": "passed",
                "recommendation": state.get("recommendation", {}).get("recommendation", "N/A"),
                "confidence": state.get("recommendation", {}).get("confidence", 0),
                "risk_level": state.get("risk_data", {}).get("risk_level", "N/A"),
                "risk_score": state.get("risk_data", {}).get("risk_score", 0),
                "financial_score": state.get("financial_data", {}).get("financial_score", 0),
                "sentiment": state.get("news_data", {}).get("sentiment", "N/A"),
                "completeness_score": completeness["score"],
                "completeness_checks": completeness["checks"],
                "guardrail_score": guardrails["guardrail_score"],
                "guardrail_violations": guardrails["violations_found"],
                "routing_correct": routing["routing_correct"],
                "routing_details": routing,
                "pdf_path": state.get("pdf_path", ""),
            }

            print(f"  ✅ Completed — Recommendation: {result['recommendation']} "
                  f"({result['confidence']}% confidence)")
            print(f"     Financial: {result['financial_score']}/100 | "
                  f"Risk: {result['risk_score']}/100 ({result['risk_level']}) | "
                  f"Sentiment: {result['sentiment']}")
            print(f"     Completeness: {completeness['passed']}/{completeness['total']} | "
                  f"Guardrails: {'✅' if guardrails['guardrail_score'] == 1.0 else '❌'} | "
                  f"Routing: {'✅' if routing['routing_correct'] else '❌'}")

        except Exception as e:
            result = {
                "ticker": ticker,
                "description": case["description"],
                "status": "failed",
                "error": str(e),
            }
            print(f"  ❌ Failed — {str(e)}")

        results.append(result)
        print()

    # Summary
    passed = sum(1 for r in results if r.get("status") == "passed")
    avg_completeness = sum(r.get("completeness_score", 0) for r in results) / len(results)
    avg_guardrail = sum(r.get("guardrail_score", 0) for r in results) / len(results)
    routing_correct = sum(1 for r in results if r.get("routing_correct", False))

    summary = {
        "total_cases": len(cases),
        "passed": passed,
        "failed": len(cases) - passed,
        "avg_completeness_score": round(avg_completeness, 3),
        "avg_guardrail_score": round(avg_guardrail, 3),
        "routing_accuracy": f"{routing_correct}/{passed}",
        "results": results,
    }

    print(f"{'='*60}")
    print(f"EVALUATION SUMMARY")
    print(f"{'='*60}")
    print(f"Test Cases:          {len(cases)}")
    print(f"Passed:              {passed}")
    print(f"Failed:              {len(cases) - passed}")
    print(f"Avg Completeness:    {avg_completeness:.1%}")
    print(f"Avg Guardrail Score: {avg_guardrail:.1%}")
    print(f"Routing Accuracy:    {routing_correct}/{passed}")
    print(f"{'='*60}\n")

    # Save results to file
    output_path = f"evaluation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"Results saved to: {output_path}")

    return summary


if __name__ == "__main__":
    run_evaluation()
