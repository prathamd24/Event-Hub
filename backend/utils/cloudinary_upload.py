"""
cloudinary_upload.py
--------------------
Cloudinary file upload helper — plug-and-play file storage.

SETUP:
  1. pip install cloudinary  (already in requirements.txt)
  2. Set these environment variables in your .env / Render dashboard:
       CLOUDINARY_CLOUD_NAME=your_cloud_name
       CLOUDINARY_API_KEY=your_api_key
       CLOUDINARY_API_SECRET=your_api_secret
  3. Change use_cloudinary() to return True when you're ready to go live.

MIGRATION FROM LOCAL FILES:
  - Existing local file URLs in the DB look like: /uploads/filename.jpg
  - After migrating, they will look like: https://res.cloudinary.com/...
  - Run the migration script: python migrate_files_to_cloudinary.py
"""

import os
import cloudinary
import cloudinary.uploader

# ── Configuration ────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY    = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

_cloudinary_configured = False


def _configure():
    global _cloudinary_configured
    if _cloudinary_configured:
        return
    if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )
        _cloudinary_configured = True


def use_cloudinary() -> bool:
    """Returns True if Cloudinary keys are configured in the environment."""
    return bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)


# ── Folder mapping: logical folder → Cloudinary folder ──────────────────────
FOLDER_MAP = {
    "profile_pics":        "eventhub/profiles",
    "payment_screenshots": "eventhub/payments",
    "event_photos":        "eventhub/events",
    "club_logos":          "eventhub/clubs",
    "college_photos":      "eventhub/colleges",
    "qr_codes":            "eventhub/qr",
}


def upload_to_cloudinary(file_or_path, folder: str = "eventhub/uploads") -> str | None:
    """
    Upload a file object or local path to Cloudinary.
    Returns the secure HTTPS URL or None on failure.

    Usage:
        url = upload_to_cloudinary(request.files['photo'], folder='eventhub/events')
    """
    _configure()
    if not use_cloudinary():
        return None  # Cloudinary not configured — fall back to local storage

    cloud_folder = FOLDER_MAP.get(folder, folder)

    try:
        result = cloudinary.uploader.upload(
            file_or_path,
            folder=cloud_folder,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png", "webp", "gif"],
            max_bytes=5 * 1024 * 1024,     # 5MB server-side limit
            use_filename=False,             # always generate a unique name
            unique_filename=True,
            overwrite=False,
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"[Cloudinary] Upload failed: {e}")
        return None


def delete_from_cloudinary(public_id: str) -> bool:
    """Delete a file from Cloudinary by its public_id."""
    _configure()
    if not use_cloudinary():
        return False
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        print(f"[Cloudinary] Delete failed: {e}")
        return False


def smart_upload(file, folder: str) -> str | None:
    """
    Tries Cloudinary first. Falls back to local disk if Cloudinary is not configured.
    This is the recommended upload function to use in all routes.

    Example:
        from utils.cloudinary_upload import smart_upload
        url = smart_upload(request.files['photo'], 'event_photos')
    """
    if use_cloudinary():
        return upload_to_cloudinary(file, folder=FOLDER_MAP.get(folder, folder))
    else:
        # Fall back to local storage
        from utils.file_upload import save_file
        return save_file(file, folder)
