"""FastAPI application for LangGraph agent orchestration."""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Manus Orchestrator",
    description="LangGraph-based agent orchestration service",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({"status": "ok"})


@app.get("/")
async def root():
    """Root endpoint."""
    return JSONResponse({
        "service": "Manus Orchestrator",
        "version": "0.1.0",
        "status": "running"
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
    )
