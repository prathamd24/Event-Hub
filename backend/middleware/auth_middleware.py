from functools import wraps
from flask import request, jsonify
from firebase_admin import auth
from models import User
from extensions import db

# Only this email may hold the PLATFORM_ADMIN role
PLATFORM_ADMIN_EMAIL = 'prathamkumarhr@gmail.com'

def verify_firebase_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise Exception('Missing or invalid token')
    token = auth_header.split(' ')[1]
    return auth.verify_id_token(token, clock_skew_seconds=30)

def resolve_user(decoded_token):
    firebase_uid = decoded_token['uid']
    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    if not user:
        email = decoded_token.get('email')
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                user.firebase_uid = firebase_uid
                db.session.commit()

    if user:
        # Safety: if PLATFORM_ADMIN role is held by wrong email, demote in-request
        # Exception: eit@gmail.com is a COLLEGE_ADMIN, not a PLATFORM_ADMIN
        if user.role == 'PLATFORM_ADMIN' and user.email != PLATFORM_ADMIN_EMAIL:
            user.role = 'COLLEGE_ADMIN' if user.email == 'eit@gmail.com' else 'STUDENT'
            db.session.commit()

        # Enhanced security check: If College Admin, verify college status
        if user.role == 'COLLEGE_ADMIN' and user.college:
            if user.college.status != 'APPROVED':
                # Store status on user object temporarily for decorators to catch
                user._college_blocked = True
                user._college_status = user.college.status
    return user

def firebase_token_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                decoded_token = verify_firebase_token()
                request.decoded_token = decoded_token
            except Exception as e:
                return jsonify({'error': str(e)}), 401
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def jwt_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                decoded_token = verify_firebase_token()
                user = resolve_user(decoded_token)
                if not user:
                    return jsonify({'error': 'Please register yourself first.'}), 404
                
                # Enforce college status check in jwt_required
                if getattr(user, '_college_blocked', False):
                    return jsonify({
                        'blocked': True, 
                        'reason': user._college_status, 
                        'message': f'College {user._college_status.lower()}.'
                    }), 403

                request.user = user
            except Exception as e:
                return jsonify({'error': str(e)}), 401
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                decoded_token = verify_firebase_token()
                user = resolve_user(decoded_token)
                
                if not user:
                    return jsonify({'error': 'Please register yourself first.'}), 404
                    
                if user.role not in roles:
                    return jsonify({'error': f'Access denied. Requires one of: {", ".join(roles)}'}), 403
                
                # Enforce college status check in role_required
                if getattr(user, '_college_blocked', False):
                    return jsonify({
                        'blocked': True, 
                        'reason': user._college_status, 
                        'message': f'College {user._college_status.lower()}.'
                    }), 403
                    
                if not user.is_active:
                    return jsonify({'error': 'Account suspended'}), 403
                
                request.user = user
                
            except Exception as e:
                return jsonify({'error': str(e)}), 401
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_jwt_identity():
    """Helper to maintain compatibility with existing routes. Returns user.id or a dict with id."""
    if hasattr(request, 'user') and request.user:
        return request.user.id
    return None

class FirebaseErrorResult:
    def __init__(self, error):
        self.error = error

def register_firebase_user(email, password, display_name):
    try:
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        return user_record
    except Exception as e:
        return FirebaseErrorResult(error=str(e))

def update_firebase_user(uid, **kwargs):
    try:
        user_record = auth.update_user(uid, **kwargs)
        return user_record
    except Exception as e:
        return FirebaseErrorResult(error=str(e))

def delete_firebase_user(uid):
    try:
        auth.delete_user(uid)
        return True
    except Exception as e:
        return FirebaseErrorResult(error=str(e))
