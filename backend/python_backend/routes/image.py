from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from middleware.auth import get_current_user
from middleware.api_key_resolver import resolve_keys
from services.image_service import generate_image
from database import get_db
from pydantic import BaseModel
from pathlib import Path

router = APIRouter(prefix="/api/v1/image", tags=["Image Generation"])

class ImageRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    quality: str = "standard"

@router.post("/generate")
async def create_image(
    payload: ImageRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    keys = await resolve_keys(str(current_user.get("_id", current_user.get("id"))), db)
    result = await generate_image(payload.prompt, keys, payload.size, payload.quality)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Unknown error"))
    return result

@router.get("/view/{image_id}")
async def view_image(image_id: str):
    img_path = Path(f"./uploads/images/{image_id}.png")
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(img_path, media_type="image/png")
