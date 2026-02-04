"""
AION v1 - Python FastAPI Backend (GREEN Environment)
Production-Ready Streaming AI API with Zero-Downtime Support
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
import time
from typing import AsyncGenerator
import os
from openai import AsyncOpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# ENVIRONMENT VALIDATION
# ============================================================================

REQUIRED_ENV_VARS = ['OPENAI_API_KEY']
missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]

if missing_vars:
    logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise RuntimeError(f"Missing environment variables: {', '.join(missing_vars)}")

# Initialize OpenAI client
try:
    openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    logger.info("✅ OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    raise

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="AION v1 Python Backend",
    description="Production AI Backend with Streaming Support",
    version="1.0.0"
)

# CORS Configuration - PRODUCTION SECURE
ALLOWED_ORIGINS = [
    "https://rajora.co.in",
    "https://www.rajora.co.in",
]

# Add localhost only in development
if os.getenv('NODE_ENV') != 'production':
    ALLOWED_ORIGINS.extend([
        "http://localhost:3000",
        "http://localhost:5173",
    ])
    logger.info("Development mode: localhost origins enabled")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=3600,
)

# Request Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    stream: bool = True
    model: str = "gpt-4"
    max_tokens: int = 2000

# ============================================================================
# STREAMING ENGINE - OPENAI INTEGRATION
# ============================================================================

async def generate_ai_response(
    message: str,
    model: str = "gpt-4",
    max_tokens: int = 2000
) -> AsyncGenerator[str, None]:
    """
    Production OpenAI streaming integration with proper SSE formatting.
    
    SSE Format:
    data: chunk\n\n
    data: [DONE]\n\n
    """
    try:
        logger.info(f"Processing message with {model}: {message[:50]}...")
        
        # Create OpenAI streaming request
        stream = await openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are AION, an intelligent AI assistant."},
                {"role": "user", "content": message}
            ],
            max_tokens=max_tokens,
            stream=True,
            temperature=0.7,
        )
        
        # Stream chunks from OpenAI
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # SSE Format: data: <content>\n\n
                yield f"data: {content}\n\n"
                await asyncio.sleep(0)  # Allow other tasks to run
        
        # Send completion signal
        yield "data: [DONE]\n\n"
        logger.info("Streaming completed successfully")
        
    except asyncio.CancelledError:
        logger.warning("Client disconnected during streaming")
        yield "data: [ERROR: Stream cancelled]\n\n"
        raise
        
    except Exception as e:
        logger.error(f"OpenAI streaming error: {e}", exc_info=True)
        yield f"data: [ERROR: {str(e)}]\n\n"
        yield "data: [DONE]\n\n"

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint with OpenAI SSE streaming.
    
    Shadow Path: /__aion_shadow/api/api/v1/chat
    Public Path (future): /api/v1/chat
    """
    try:
        # Input validation
        if not request.message or len(request.message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if len(request.message) > 10000:
            raise HTTPException(status_code=400, detail="Message too long (max 10000 characters)")
        
        logger.info(f"Chat request: {request.message[:100]}")
        
        # Return streaming response
        return StreamingResponse(
            generate_ai_response(
                message=request.message,
                model=request.model,
                max_tokens=request.max_tokens
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
                "Content-Type": "text/event-stream",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check for Elastic Beanstalk.
    Must respond quickly (<1s) or EB marks instance as unhealthy.
    """
    return {
        "status": "OK",
        "service": "aion-python-backend",
        "version": "1.0.0",
        "environment": os.getenv("NODE_ENV", "production"),
        "timestamp": time.time()
    }

@app.get("/ready")
async def readiness_check():
    """
    Readiness probe - checks if service is ready to handle traffic.
    """
    checks = {
        "api": "healthy",
        "openai": "unknown"
    }
    
    # Test OpenAI connection
    try:
        # Quick validation call (won't consume many tokens)
        await asyncio.wait_for(
            openai_client.models.list(),
            timeout=2.0
        )
        checks["openai"] = "connected"
    except asyncio.TimeoutError:
        checks["openai"] = "timeout"
        logger.warning("OpenAI API check timed out")
    except Exception as e:
        checks["openai"] = "error"
        logger.error(f"OpenAI API check failed: {e}")
    
    all_healthy = all(v in ["healthy", "connected"] for v in checks.values())
    
    return {
        "ready": all_healthy,
        "checks": checks,
        "timestamp": time.time()
    }

@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        "service": "AION v1 Python Backend",
        "status": "running",
        "environment": os.getenv("NODE_ENV", "production"),
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/v1/chat",
            "health": "/health",
            "ready": "/ready"
        },
        "message": "Production AI backend is live! 🚀"
    }

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global error handler - never let the service crash
    """
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    
    # Don't expose internal errors in production
    if os.getenv("NODE_ENV") == "production":
        return {
            "error": "Internal server error",
            "message": "The service encountered an error. Please try again.",
            "status_code": 500
        }
    else:
        return {
            "error": "Internal server error",
            "message": str(exc),
            "status_code": 500
        }

# ============================================================================
# STARTUP/SHUTDOWN HOOKS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Startup initialization
    """
    logger.info("=" * 60)
    logger.info("🚀 AION Python Backend Starting...")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'production')}")
    logger.info("Port: 8000")
    logger.info(f"CORS Origins: {ALLOWED_ORIGINS}")
    logger.info("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    """
    Graceful shutdown
    """
    logger.info("🛑 AION Python Backend Shutting Down...")
    # Close OpenAI client if needed
    if openai_client:
        await openai_client.close()
        logger.info("✅ OpenAI client closed")
