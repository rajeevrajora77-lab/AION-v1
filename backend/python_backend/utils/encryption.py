from cryptography.fernet import Fernet
import os

encryption_key_env = os.getenv("ENCRYPTION_KEY")
if not encryption_key_env:
    # Ensure there is a fallback or we throw an error in real production.
    # We will generate one on the fly if missing, but it means keys won't restart safely.
    encryption_key_env = Fernet.generate_key().decode()
    os.environ["ENCRYPTION_KEY"] = encryption_key_env

ENCRYPTION_KEY = encryption_key_env.encode()
fernet = Fernet(ENCRYPTION_KEY)

def encrypt_key(api_key: str) -> str:
    return fernet.encrypt(api_key.encode()).decode()

def decrypt_key(encrypted_key: str) -> str:
    return fernet.decrypt(encrypted_key.encode()).decode()
