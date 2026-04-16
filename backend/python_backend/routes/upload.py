from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from middleware.auth import get_current_user
from services.file_service import save_and_parse_file
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/api/v1/upload", tags=["File Upload"])

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = Form(""),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    try:
        user_id = str(current_user.get("_id", current_user.get("id")))
        result = await save_and_parse_file(file, user_id, conversation_id)
        
        doc = {
            "_id": result["file_id"],
            "user_id": user_id,
            "conversation_id": conversation_id,
            **result,
            "created_at": datetime.utcnow()
        }
        # Insert metadata into db
        await db.file_uploads.insert_one(doc)
        
        return {
            "status": "success",
            "file_id": result["file_id"],
            "filename": result["original_name"],
            "file_type": result["file_type"],
            "has_text": bool(result.get("extracted_text")),
            "preview": result.get("extracted_text", "")[:500] if result.get("extracted_text") else None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
