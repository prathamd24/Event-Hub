# This file is kept for backward compatibility.
# All authentication is now handled via middleware/auth_middleware.py using Firebase Admin SDK.
from middleware.auth_middleware import role_required, get_jwt_identity
