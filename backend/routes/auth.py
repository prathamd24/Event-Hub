from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required, get_jwt_identity, firebase_token_required
import firebase_admin
from firebase_admin import auth as firebase_auth
from extensions import db
from models import User, College

auth_bp = Blueprint('auth', __name__)

# Hardcoded: only this email may be PLATFORM_ADMIN
PLATFORM_ADMIN_EMAIL = 'prathamkumarhr@gmail.com'

@auth_bp.route('/google-login', methods=['POST'])
def google_login():
    try:
        data = request.get_json()
        id_token = data.get('idToken')
        if not id_token:
            return jsonify({'message': 'ID token required'}), 400

        # Verify the Firebase ID token with clock skew tolerance
        decoded_token = firebase_auth.verify_id_token(id_token, clock_skew_seconds=30)

        email = decoded_token.get('email')
        name = decoded_token.get('name', email.split('@')[0])
        photo = decoded_token.get('picture', None)

        if not email:
            return jsonify({'message': 'Email not found in token'}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({'error': 'Account not found. Please register first.'}), 404
        else:
            # Ensure firebase_uid is set if they previously registered differently
            if not user.firebase_uid:
                user.firebase_uid = decoded_token['uid']
                db.session.commit()

        if not user.is_active:
            return jsonify({'message': 'Account has been deactivated'}), 403

        # We don't generate our own JWTs anymore, just return user JSON
        # The frontend will use Firebase auth token header automatically
        is_new_user = (user.college_id is None)

        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'isNewUser': is_new_user
        }), 200

    except firebase_auth.InvalidIdTokenError:
        return jsonify({'message': 'Invalid Google token'}), 401
    except Exception as e:
        db.session.rollback()
        print(f'Google login error: {e}')
        return jsonify({'message': "An internal server error occurred"}), 500


@auth_bp.route('/login', methods=['POST'])
@jwt_required()
def login():
    # Since Firebase handles actual authentication, the frontend just calls /login
    # with the Firebase token in the header. Our jwt_required middleware will 
    # verify it and set request.user. We just need to return the user details.
    user = request.user

    if not user.is_active:
        return jsonify({'message': 'Your account has been deactivated.'}), 403

    if user.role == 'COLLEGE_ADMIN' and user.college:
        if user.college.status == 'PENDING':
            return jsonify({'blocked': True, 'reason': 'PENDING', 'message': 'College under review.'}), 403
        if user.college.status == 'REJECTED':
            return jsonify({'blocked': True, 'reason': 'REJECTED', 'message': 'College rejected.'}), 403
        if user.college.status == 'SUSPENDED':
            return jsonify({'blocked': True, 'reason': 'SUSPENDED', 'message': 'College suspended.'}), 403

    return jsonify({
        'user': user.to_dict()
    }), 200

@auth_bp.route('/register', methods=['POST'])
@firebase_token_required()
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    college_id = data.get('collegeId')
    college_name_manual = data.get('collegeNameManual')
    
    decoded_token = request.decoded_token
    email = decoded_token.get('email', '').strip().lower()
    firebase_uid = decoded_token['uid']

    if not name or not email:
        return jsonify({'error': 'Name and valid Firebase email required'}), 400

    # Prevent anyone from self-registering as or over the platform admin account
    if email == PLATFORM_ADMIN_EMAIL:
        return jsonify({'error': 'This email is reserved for the platform administrator.'}), 403

    if User.query.filter_by(firebase_uid=firebase_uid).first() or User.query.filter_by(email=email).first():
        return jsonify({'error': 'Account already registered in database'}), 409

    if college_id and str(college_id).lower() == 'other':
        college_id = None

    if college_id:
        college = College.query.filter_by(id=college_id, status='APPROVED').first()
        if not college:
            return jsonify({'error': 'Selected college is not available or approved'}), 400

    user = User(
        name=name,
        email=email,
        password_hash='FIREBASE_AUTH',
        firebase_uid=firebase_uid,
        role='STUDENT',
        college_id=college_id,
        college_name_manual=college_name_manual,
        is_active=True
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'Registration successful 🎉', 
        'user': user.to_dict(),
        'token': decoded_token # Not used by our backend but expected by the user's prompt logic
    }), 201

@auth_bp.route('/register-college', methods=['POST'])
@firebase_token_required()
def register_college():
    data = request.get_json()
    
    college_name = data.get('collegeName', '').strip()
    location = data.get('location', '').strip()
    website = data.get('website', '').strip()
    description = data.get('description', '').strip()
    
    type_val = data.get('type', '').strip() or None
    affiliation = data.get('affiliation', '').strip() or None
    contact_email = data.get('contactEmail', '').strip() or None
    naac_grade = data.get('naacGrade', '').strip() or None
    
    established_year = data.get('establishedYear')
    if established_year:
        try:
            established_year = int(established_year)
        except ValueError:
            established_year = None
    
    admin_name = data.get('adminName', '').strip()

    decoded_token = request.decoded_token
    admin_email = decoded_token.get('email', '').strip().lower()
    firebase_uid = decoded_token['uid']

    if not college_name or not admin_name or not admin_email:
        return jsonify({'error': 'All fields are required'}), 400

    # Prevent platform admin email from being used as a college admin
    if admin_email == PLATFORM_ADMIN_EMAIL:
        return jsonify({'error': 'This email is reserved for the platform administrator.'}), 403

    if User.query.filter_by(firebase_uid=firebase_uid).first() or User.query.filter_by(email=admin_email).first():
        return jsonify({'error': 'Email already registered in database'}), 409
        
    if College.query.filter(College.name.ilike(college_name)).first():
        return jsonify({'error': 'A college with this name is already registered or pending'}), 409

    user = User(
        name=admin_name,
        email=admin_email,
        password_hash='FIREBASE_AUTH',
        firebase_uid=firebase_uid,
        role='COLLEGE_ADMIN',
        is_active=True
    )
    db.session.add(user)
    db.session.flush()
    
    college = College(
        name=college_name,
        location=location,
        website=website,
        description=description,
        type=type_val,
        affiliation=affiliation,
        established_year=established_year,
        contact_email=contact_email,
        naac_grade=naac_grade,
        status='PENDING',
        admin_id=user.id
    )
    db.session.add(college)
    db.session.flush()
    
    user.college_id = college.id
    db.session.commit()

    return jsonify({'message': 'College registration submitted for approval'}), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    # User is already resolved by jwt_required
    return jsonify(request.user.to_dict()), 200


@auth_bp.route('/detect-college', methods=['GET'])
def detect_college():
    """
    Given ?email=student@eitfaridabad.co.in, tries to find a matching
    approved college in the DB by comparing the email domain against
    known college email patterns.
    Returns { collegeId, collegeName } or {} if no match.
    """
    email = request.args.get('email', '').strip().lower()
    if not email or '@' not in email:
        return jsonify({}), 200

    domain = email.split('@')[1]  # e.g. "eitfaridabad.co.in"

    # Free email providers — no college detection
    free_domains = {
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'live.com', 'icloud.com', 'me.com', 'protonmail.com',
        'ymail.com', 'rediffmail.com', 'aol.com'
    }
    if domain in free_domains:
        return jsonify({}), 200

    # Strip prefix parts of domain to get broader match
    # e.g. "eitfaridabad.co.in" → try "eitfaridabad"
    domain_parts = domain.replace('.co.in', '').replace('.ac.in', '') \
                         .replace('.edu.in', '').replace('.edu', '') \
                         .replace('.org', '').replace('.net', '')

    # Search approved colleges whose name contains domain keywords
    colleges = College.query.filter_by(status='APPROVED').all()

    def score(college):
        name_lower = college.name.lower()
        # Direct domain keyword match
        for part in domain_parts.split('.'):
            if len(part) > 3 and part in name_lower:
                return 2
        # Contact email domain match
        if college.contact_email and '@' in college.contact_email:
            if college.contact_email.split('@')[1].lower() == domain:
                return 3
        return 0

    best = max(colleges, key=score, default=None)
    if best and score(best) > 0:
        return jsonify({
            'collegeId': best.id,
            'collegeName': best.name,
            'confidence': score(best)
        }), 200

    return jsonify({}), 200
