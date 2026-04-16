import os
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routes import chat, voice, search, image, upload, api_keys
from database import close_mongo_connection, connect_to_mongo

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# App startup directories
os.makedirs("./uploads", exist_ok=True)
os.makedirs("./uploads/images", exist_ok=True)

app = FastAPI(title="AION v1 Python Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://chat.rajora.co.in", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(search.router)
app.include_router(image.router)
app.include_router(upload.router)
app.include_router(api_keys.router)

# Mount statics
app.mount("/api/v1/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    logging.info("MongoDB connected via Motor")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()
    logging.info("MongoDB connection closed")

@app.get("/health")
def health():
    return {"status": "ok"}
