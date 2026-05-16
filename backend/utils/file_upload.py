import os
import uuid
from werkzeug.utils import secure_filename

# ── Whitelist of allowed extensions ────────────────────────────────────────
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# ── Known image magic bytes (first few bytes of valid images) ───────────────
_MAGIC_BYTES = {
    b'\xff\xd8\xff': 'jpg',      # JPEG
    b'\x89PNG\r\n':  'png',      # PNG
    b'GIF87a':       'gif',      # GIF87
    b'GIF89a':       'gif',      # GIF89
    b'RIFF':         'webp',     # WEBP (starts with RIFF....WEBP)
}


def _is_safe_image(file) -> bool:
    """
    Validate by reading the first 16 bytes (magic bytes).
    This prevents polyglot files (e.g. a PHP script renamed to .jpg).
    """
    header = file.read(16)
    file.seek(0)
    for magic, _ in _MAGIC_BYTES.items():
        if header.startswith(magic):
            return True
    # WEBP specific: "RIFF....WEBP"
    if header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return True
    return False


def allowed_file(filename: str) -> bool:
    """Check extension is in the whitelist."""
    return (
        '.' in filename and
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def save_file(file, folder: str) -> str | None:
    """
    Save an uploaded file securely.
    Returns the URL path (e.g. /uploads/events/abc123.jpg) or None on failure.
    """
    if not file or not file.filename:
        return None

    # 1. Sanitize the filename — prevents path traversal
    original_name = secure_filename(file.filename)
    if not original_name:
        return None

    # 2. Extension check
    if not allowed_file(original_name):
        return None

    # 3. File size check
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE_BYTES:
        return None

    # 4. Magic bytes check (prevents polyglot files)
    if not _is_safe_image(file):
        return None

    # 5. Save with a UUID filename (never trust user filename for storage)
    ext = original_name.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    upload_folder = os.environ.get('UPLOAD_FOLDER', 'uploads')
    full_dir = os.path.join(upload_folder, folder)
    os.makedirs(full_dir, exist_ok=True)
    full_path = os.path.join(full_dir, unique_filename)

    file.save(full_path)
    return f"/uploads/{folder}/{unique_filename}"

