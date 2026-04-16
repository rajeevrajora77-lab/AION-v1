from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileUpload(BaseModel):
    id: str
    user_id: str
    conversation_id: str
    filename: str
    file_type: str      # pdf / txt / csv / docx / png / jpg
    file_size: int
    storage_path: str   # local path or S3/Cloudinary URL
    extracted_text: Optional[str] = None
    created_at: datetime = datetime.utcnow()
