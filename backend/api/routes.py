import os
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator

from backend.graph.state import ResearchState
from backend.graph.workflow import research_graph

router = APIRouter()

# In-memory run store (maps run_id → thread_id and state snapshot)
# In production, replace with Redis or a database.
_run_store: dict[str, dict] = {}


# --- Request/Response models ---

class ResearchRequest(BaseModel):
    ticker: str

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        ticker = v.strip().upper()
        if not ticker or not ticker.replace(".", "").replace("-", "").isalnum():
            raise ValueError("Invalid ticker symbol")
        if len(ticker) > 10:
            raise ValueError("Ticker symbol too long")
        return ticker


class ResearchResponse(BaseModel):
    run_id: str
    status: str
    ticker: str
    recommendation: dict = {}
    company_name: str = ""
    risk_level: str = ""
    risk_score: int = 0
    financial_score: int = 0
    sentiment: str = ""
    requires_approval: bool = True


class ApproveRequest(BaseModel):
    run_id: str
    approved: bool


class ApproveResponse(BaseModel):
    run_id: str
    status: str
    pdf_path: str = ""


# --- Guardrail check ---

FINANCIAL_ADVICE_PATTERNS = [
    "guarantee", "guaranteed return", "risk-free", "will definitely",
    "promise", "certain profit", "no way to lose",
]


def _check_input_guardrails(ticker: str) -> str | None:
    """Return an error message if the request violates guardrails, else None."""
    lower = ticker.lower()
    for pattern in FINANCIAL_ADVICE_PATTERNS:
        if pattern in lower:
            return f"Invalid request: contains prohibited pattern '{pattern}'"
    return None


# --- Endpoints ---

@router.post("/research", response_model=ResearchResponse)
async def start_research(request: ResearchRequest) -> ResearchResponse:
    """
    Start an equity research workflow for the given ticker.
    Returns immediately when the graph pauses at human_approval.
    """
    guardrail_error = _check_input_guardrails(request.ticker)
    if guardrail_error:
        raise HTTPException(status_code=400, detail=guardrail_error)

    run_id = str(uuid.uuid4())
    thread_id = f"research-{run_id}"

    initial_state = ResearchState(ticker=request.ticker, run_id=run_id)
    config = {"configurable": {"thread_id": thread_id}}

    # Run the graph until it hits the interrupt_before=["human_approval"] checkpoint
    try:
        final_state = None
        for chunk in research_graph.stream(initial_state.model_dump(), config=config, stream_mode="values"):
            final_state = chunk
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research workflow failed: {str(e)}")

    if final_state is None:
        raise HTTPException(status_code=500, detail="Research workflow produced no output")

    # Persist the run for later approval
    _run_store[run_id] = {"thread_id": thread_id, "state": final_state}

    return ResearchResponse(
        run_id=run_id,
        status="pending_approval",
        ticker=request.ticker,
        recommendation=final_state.get("recommendation", {}),
        company_name=final_state.get("company_data", {}).get("company_name", request.ticker),
        risk_level=final_state.get("risk_data", {}).get("risk_level", ""),
        risk_score=int(final_state.get("risk_data", {}).get("risk_score", 0)),
        financial_score=int(final_state.get("financial_data", {}).get("financial_score", 0)),
        sentiment=final_state.get("news_data", {}).get("sentiment", ""),
        requires_approval=True,
    )


@router.post("/approve", response_model=ApproveResponse)
async def approve_research(request: ApproveRequest) -> ApproveResponse:
    """
    Approve or reject a completed research run.
    If approved, resumes the graph to generate the PDF report.
    """
    run_id = request.run_id
    if run_id not in _run_store:
        raise HTTPException(status_code=404, detail=f"Run ID '{run_id}' not found")

    run_info = _run_store[run_id]
    thread_id = run_info["thread_id"]
    config = {"configurable": {"thread_id": thread_id}}

    if not request.approved:
        _run_store[run_id]["status"] = "rejected"
        return ApproveResponse(run_id=run_id, status="rejected")

    # Update the state with approval and resume the graph
    try:
        research_graph.update_state(
            config,
            {"approval_status": True},
            as_node="human_approval",
        )

        final_state = None
        for chunk in research_graph.stream(None, config=config, stream_mode="values"):
            final_state = chunk
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    pdf_path = ""
    if final_state:
        pdf_path = final_state.get("pdf_path", "")
        _run_store[run_id]["pdf_path"] = pdf_path
        _run_store[run_id]["status"] = "completed"

    return ApproveResponse(
        run_id=run_id,
        status="completed" if pdf_path else "error",
        pdf_path=pdf_path,
    )


@router.get("/report/{run_id}")
async def get_report(run_id: str) -> FileResponse:
    """Download the generated PDF report for a completed run."""
    if run_id not in _run_store:
        raise HTTPException(status_code=404, detail=f"Run ID '{run_id}' not found")

    run_info = _run_store[run_id]
    pdf_path = run_info.get("pdf_path", "")

    if not pdf_path:
        raise HTTPException(
            status_code=404,
            detail="Report not yet generated. Ensure the research has been approved.",
        )

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    filename = os.path.basename(pdf_path)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/status/{run_id}")
async def get_status(run_id: str) -> dict:
    """Get the current status and summary of a research run."""
    if run_id not in _run_store:
        raise HTTPException(status_code=404, detail=f"Run ID '{run_id}' not found")

    run_info = _run_store[run_id]
    state = run_info.get("state", {})

    return {
        "run_id": run_id,
        "status": run_info.get("status", "pending_approval"),
        "ticker": state.get("ticker", ""),
        "company_name": state.get("company_data", {}).get("company_name", ""),
        "recommendation": state.get("recommendation", {}),
        "risk_data": state.get("risk_data", {}),
        "financial_data": {
            "financial_score": state.get("financial_data", {}).get("financial_score"),
            "strengths": state.get("financial_data", {}).get("strengths", []),
            "weaknesses": state.get("financial_data", {}).get("weaknesses", []),
        },
        "news_data": {
            "sentiment": state.get("news_data", {}).get("sentiment"),
            "sentiment_score": state.get("news_data", {}).get("sentiment_score"),
            "key_news": state.get("news_data", {}).get("key_news", []),
        },
        "pdf_path": run_info.get("pdf_path", ""),
    }
