import os
import uuid
import aiofiles
import PyPDF2
import pandas as pd
from docx import Document
from pathlib import Path

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 25))
ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "application/json": "json",
}

async def save_and_parse_file(file, user_id: str, conversation_id: str) -> dict:
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise ValueError(f"File exceeds {MAX_SIZE_MB}MB limit")
    
    if file.content_type not in ALLOWED_TYPES:
        raise ValueError(f"File type {file.content_type} not supported")
    
    ext = ALLOWED_TYPES[file.content_type]
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    
    user_dir = Path(UPLOAD_DIR) / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_dir / filename
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    extracted_text = await extract_text(file_path, ext, content)
    
    return {
        "file_id": file_id,
        "original_name": file.filename,
        "file_type": ext,
        "file_size": len(content),
        "storage_path": str(file_path),
        "extracted_text": extracted_text[:50000] if extracted_text else None
    }

async def extract_text(file_path: Path, ext: str, content: bytes) -> str:
    try:
        if ext == "pdf":
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            return "\\n".join(page.extract_text() or "" for page in reader.pages)
        
        elif ext == "txt":
            return content.decode("utf-8", errors="ignore")
        
        elif ext == "csv":
            import io
            df = pd.read_csv(io.BytesIO(content))
            return df.to_string(max_rows=500)
        
        elif ext == "docx":
            import io
            doc = Document(io.BytesIO(content))
            return "\\n".join(p.text for p in doc.paragraphs)
        
        elif ext == "json":
            return content.decode("utf-8", errors="ignore")
        
        elif ext in ["png", "jpg", "webp"]:
            return "[IMAGE FILE - Will be sent to vision model]"
        
        return ""
    except Exception as e:
        return f"[Could not extract text: {str(e)}]"
