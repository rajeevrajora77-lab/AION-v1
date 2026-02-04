"""
AION v1 - Python FastAPI Backend (Production-Ready)
Streaming AI API with Full Security and Monitoring
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio
import logging
import time
from typing import AsyncGenerator, Optional
import os
from openai import AsyncOpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment validation
REQUIRED_ENV_VARS = ['OPENAI_API_KEY', 'FRONTEND_URL']
missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
if missing_vars:
    logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise RuntimeError(f"Missing environment variables: {', '.join(missing_vars)}")

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Initialize FastAPI
app = FastAPI(
    title="AION v1 Python Backend",
    description="Production AI Backend with Streaming Support",
    version="1.0.0"
)

# CORS Configuration - STRICT (NO WILDCARDS)
ALLOWED_ORIGINS = [
    "https://rajora.co.in",
    "https://www.rajora.co.in",
]

# Add localhost only in development
if os.getenv('NODE_ENV') == 'development':
    ALLOWED_ORIGINS.extend([
        "http://localhost:3000",
        "http://localhost:5173",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# Request Models
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    stream: bool = True
    model: str = Field(default="gpt-4", pattern="^(gpt-4|gpt-3.5-turbo)$")

# ============================================================================
# STREAMING ENGINE (SSE COMPLIANT) - REAL OPENAI INTEGRATION
# ============================================================================

async def generate_ai_response(message: str, model: str = "gpt-4") -> AsyncGenerator[str, None]:
    """
    Production AI response generator with OpenAI streaming.
    
    SSE Format: data: chunk\\n\\n
    """
    try:
        logger.info(f"Processing message: {message[:50]}...")
        
        # Real OpenAI API call with streaming
        stream = await openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are AION, a helpful AI assistant."},
                {"role": "user", "content": message}
            ],
            stream=True,
            max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', '2000')),
            temperature=0.7,
        )
        
        chunk_count = 0
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # SSE Format
                yield f"data: {content}\\n\\n"
                chunk_count += 1
                
                # Safety: prevent infinite streams
                if chunk_count > 5000:
                    logger.warning("Stream chunk limit reached")
                    break
        
        # Send completion signal
        yield "data: [DONE]\\n\\n"
        logger.info(f"Streaming completed successfully ({chunk_count} chunks)")
        
    except asyncio.CancelledError:
        logger.warning("Client disconnected during streaming")
        yield "data: [ERROR: Stream cancelled]\\n\\n"
        raise
        
    except Exception as e:
        logger.error(f"Streaming error: {str(e)}", exc_info=True)
        yield f"data: [ERROR: {str(e)}]\\n\\n"
        yield "data: [DONE]\\n\\n"

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint with SSE streaming.
    """
    try:
        logger.info(f"Chat request: {request.message[:100]}")
        
        # Return streaming response
        return StreamingResponse(
            generate_ai_response(request.message, request.model),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# ============================================================================
# HEALTH CHECK ENDPOINTS - PRODUCTION GRADE
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Basic health check - always responds if server is up.
    """
    return {
        "status": "OK",
        "service": "aion-python-backend",
        "version": "1.0.0",
        "timestamp": time.time()
    }

@app.get("/ready")
async def readiness_check():
    """
    Readiness probe - checks if dependencies are available.
    """
    checks = {
        "server": True,
        "openai_api": False,
        "environment": True,
    }
    
    # Check OpenAI API connectivity
    try:
        # Quick API check with minimal token usage
        response = await openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        checks["openai_api"] = True
    except Exception as e:
        logger.error(f"OpenAI API health check failed: {str(e)}")
        checks["openai_api"] = False
    
    all_ready = all(checks.values())
    
    return {
        "ready": all_ready,
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
        "version": "1.0.0",
        "environment": os.getenv('NODE_ENV', 'production'),
        "endpoints": {
            "chat": "/api/v1/chat",
            "health": "/health",
            "ready": "/ready"
        }
    }

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global error handler - never crash the service
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # Don't expose internal errors in production
    if os.getenv('NODE_ENV') == 'production':
        return {
            "error": "Internal server error",
            "message": "The service encountered an error. Please try again.",
            "status_code": 500
        }
    else:
        return {
            "error": "Internal server error",
            "message": str(exc),
            "type": type(exc).__name__,
            "status_code": 500
        }

# ============================================================================
# STARTUP/SHUTDOWN HOOKS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Startup initialization with validation
    """
    logger.info("=" * 60)
    logger.info("🚀 AION Python Backend Starting...")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'production')}")
    logger.info("Port: 8000")
    logger.info(f"CORS Origins: {ALLOWED_ORIGINS}")
    logger.info("=" * 60)
    
    # Validate OpenAI connection on startup
    try:
        await openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5,
        )
        logger.info("✅ OpenAI API connection validated")
    except Exception as e:
        logger.error(f"❌ OpenAI API validation failed: {str(e)}")
        raise RuntimeError("OpenAI API not accessible")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Graceful shutdown with cleanup
    """
    logger.info("🛑 AION Python Backend Shutting Down...")
    
    # Close OpenAI client
    try:
        await openai_client.close()
        logger.info("✅ OpenAI client closed")
    except Exception as e:
        logger.error(f"Error closing OpenAI client: {str(e)}")
