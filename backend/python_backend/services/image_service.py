import httpx
import base64
import openai
import os
from pathlib import Path
import uuid
import aiofiles

async def generate_image(
    prompt: str,
    api_keys: dict,
    size: str = "1024x1024",
    quality: str = "standard"
) -> dict:
    
    if api_keys.get("openai"):
        try:
            client = openai.AsyncOpenAI(api_key=api_keys["openai"])
            response = await client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality=quality,
                n=1
            )
            return {
                "status": "success",
                "url": response.data[0].url,
                "revised_prompt": response.data[0].revised_prompt,
                "provider": "dall-e-3"
            }
        except Exception as e:
            pass
            
    if api_keys.get("stability"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
                    headers={
                        "Authorization": f"Bearer {api_keys['stability']}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    json={
                        "text_prompts": [{"text": prompt, "weight": 1}],
                        "cfg_scale": 7,
                        "height": 1024,
                        "width": 1024,
                        "steps": 30,
                        "samples": 1
                    },
                    timeout=60.0
                )
                data = response.json()
                image_b64 = data["artifacts"][0]["base64"]
                
                img_id = str(uuid.uuid4())
                img_path = Path("./uploads/images") / f"{img_id}.png"
                img_path.parent.mkdir(parents=True, exist_ok=True)
                
                async with aiofiles.open(img_path, "wb") as f:
                    await f.write(base64.b64decode(image_b64))
                
                return {
                    "status": "success",
                    "url": f"/api/v1/image/view/{img_id}",
                    "provider": "stability-xl"
                }
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    return {
        "status": "error",
        "message": "No image generation API key configured. Add OpenAI or Stability AI key in Settings."
    }
