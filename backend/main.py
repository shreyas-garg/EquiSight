import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate required environment variables on startup
    required_vars = ["GOOGLE_API_KEY", "TAVILY_API_KEY"]
    missing = [v for v in required_vars if not os.environ.get(v)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    os.makedirs("reports", exist_ok=True)
    print("✅ AI Equity Research API started successfully")
    yield
    print("🛑 AI Equity Research API shutting down")


app = FastAPI(
    title="AI Equity Research API",
    description="Multi-agent equity research system powered by LangGraph and Gemini 2.5 Flash",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.routes import router
app.include_router(router, prefix="/api")


@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "service": "AI Equity Research API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
