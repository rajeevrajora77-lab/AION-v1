import jwt
import os
from fastapi import Header, HTTPException

async def get_current_user(authorization: str = Header(...)):
    try:
        # Example format: Bearer eyJhbG... 
        token = authorization.split(" ")[1]
        
        # We need the JWT_SECRET from the environment (loaded from root .env)
        secret = os.getenv("JWT_SECRET")
        if not secret:
            raise HTTPException(status_code=500, detail="JWT_SECRET is not configured on the server")
            
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        return dict(decoded)
    except IndexError:
        raise HTTPException(status_code=401, detail="Malformed authorization header")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
