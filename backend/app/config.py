import os
from pathlib import Path

# Load .env file automatically
_backend_dir = Path(__file__).resolve().parent.parent
_root_dir = _backend_dir.parent

for _env_path in [_backend_dir / ".env", _root_dir / ".env"]:
    if _env_path.exists():
        try:
            with open(_env_path, "r", encoding="utf-8") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        _k = _k.strip()
                        _v = _v.strip().strip('"').strip("'")
                        if _k and _k not in os.environ:
                            os.environ[_k] = _v
        except Exception:
            pass

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://otjbonkovzciglttxfzz.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_KEY", "")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90amJvbmtvdnpjaWdsdHR4Znp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTAzMDAsImV4cCI6MjA4NjkyNjMwMH0.s61eZgq-Fw1sPzPkW5YQ-92K9a4v3u2HkU5Ww4mZlQ0"
)
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "complaint-images")

# Connection to user site (NagarDrishti-AI)
USER_SITE_API_URL = os.getenv("USER_SITE_API_URL", "").rstrip("/")
SHARED_DB_PATH = os.getenv(
    "SHARED_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "complaints_db.json")
)

# Candidate paths for shared civic databases (citizen app + authority app)
SHARED_DB_CANDIDATE_PATHS = [
    SHARED_DB_PATH,
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "complaints_db.json"),
    "/Users/tejasvnigam/Desktop/nagardrishti ai/NagarDrishti-AI/backend/data/complaints_db.json",
    "/Users/tejasvnigam/nagardrishti_Auth1/backend/data/complaints_db.json",
]

# Local fallback paths
LOCAL_BACKUP_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "complaints_db.json"
)
UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
)
