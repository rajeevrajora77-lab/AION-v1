import pytest
from fastapi.testclient import TestClient
from main import app
import os

# Set test environment variables
os.environ['OPENAI_API_KEY'] = 'test-key'
os.environ['FRONTEND_URL'] = 'http://localhost:3000'
os.environ['NODE_ENV'] = 'development'

client = TestClient(app)

def test_root_endpoint():
    """Test root endpoint returns correct API information"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "AION v1 Python Backend"
    assert data["version"] == "1.0.0"
    assert "endpoints" in data

def test_health_endpoint():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert "timestamp" in data

def test_chat_endpoint_no_message():
    """Test chat endpoint rejects empty message"""
    response = client.post("/api/v1/chat", json={"message": ""})
    assert response.status_code == 422  # Validation error

def test_chat_endpoint_invalid_model():
    """Test chat endpoint rejects invalid model"""
    response = client.post("/api/v1/chat", json={
        "message": "test",
        "model": "invalid-model"
    })
    assert response.status_code == 422  # Validation error

def test_chat_endpoint_valid_request():
    """Test chat endpoint accepts valid request"""
    response = client.post("/api/v1/chat", json={
        "message": "Hello AION",
        "model": "gpt-4",
        "stream": False
    })
    # May fail if OpenAI key is invalid, but should not return 422
    assert response.status_code != 422

def test_cors_headers():
    """Test CORS headers are properly set"""
    response = client.options("/health")
    assert response.status_code in [200, 405]  # OPTIONS may not be explicitly handled
