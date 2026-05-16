import os

class Config:
    # Render's database URL starts with postgres://, but SQLAlchemy requires postgresql://
    # We will handle that dynamically if needed, but for now we set the env var or fallback
    db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres123@localhost/college_event_hub')
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'college-event-hub-secret-2026')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
