from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required, get_jwt_identity, role_required, register_firebase_user, update_firebase_user, delete_firebase_user
from extensions import db, bcrypt
from models import User, College, Club, Event, EventRegistration, TeamRegistration, Registration, TeamMember
import os, uuid
from werkzeug.utils import secure_filename
import json
from datetime import datetime
from sqlalchemy import func, extract
import calendar

college_admin_bp = Blueprint('college_admin', __name__)

from utils.file_upload import save_file
from utils.event_utils import update_event_status_logic
from routes.club_coordinator import log_activity

ALLOWED_PHOTO_EXTS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_PHOTOS = 5


def save_upload_file(file, folder):
    if not file or not file.filename:
        return None
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_PHOTO_EXTS:
        return None
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = os.path.join('uploads', folder)
    os.makedirs(upload_folder, exist_ok=True)
    file.save(os.path.join(upload_folder, filename))
    return f"/uploads/{folder}/{filename}"

def save_event_photo(file, folder='event_photos'):
    return save_upload_file(file, folder)

def get_current_college():
    identity = get_jwt_identity()
    user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
    return user, user.college_id if user else None

@college_admin_bp.route('/categories', methods=['POST'])
@role_required('COLLEGE_ADMIN')
def save_category():
    user, college_id = get_current_college()
    college = College.query.get(college_id)
    if not college:
        return jsonify({'error': 'College not found'}), 404
        
    data = request.get_json()
    new_category = data.get('category', '').strip()
    
    if not new_category:
        return jsonify({'error': 'Category name required'}), 400
        
    categories = college.custom_categories or []
    if new_category not in categories:
        categories.append(new_category)
        college.custom_categories = categories
        # Explicitly mark as modified for JSON field
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(college, "custom_categories")
        db.session.commit()
        
    return jsonify({'categories': categories}), 200

@college_admin_bp.route('/categories', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def get_categories():
    user, college_id = get_current_college()
    college = College.query.get(college_id)
    if not college:
        return jsonify({'categories': []}), 404
        
    custom = college.custom_categories or []
    defaults = ["Technical", "Cultural", "Sports", "Literary", "Workshop", "Seminar", "Hackathon", "Competition", "Social"]
    
    # Combine and deduplicate
    all_cats = list(dict.fromkeys(defaults + custom))
    return jsonify({'categories': all_cats + ["Other"]}), 200

@college_admin_bp.route('/dashboard', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def dashboard():
    user, college_id = get_current_college()
    college = College.query.get(college_id)
    
    clubs = Club.query.filter_by(college_id=college_id).all()
    events = Event.query.filter_by(college_id=college_id).all()
    
    # Auto-update all event statuses to real-time
    for ev in events:
        update_event_status_logic(ev)
    db.session.commit()
    
    total_registrations = EventRegistration.query.join(Event).filter(
        Event.college_id == college_id
    ).count()
    
    recent_events = Event.query.filter_by(college_id=college_id).order_by(Event.created_at.desc()).limit(6).all()

    # Build club data with all coordinator details
    from models import ClubCoordinator
    clubs_data = []
    for c in clubs:
        club_dict = c.to_dict()
        # Get all coordinators from ClubCoordinator table
        cc_entries = ClubCoordinator.query.filter_by(club_id=c.id).all()
        seen_ids = set()
        all_coords = []
        for cc in cc_entries:
            u = cc.user
            if u and u.id not in seen_ids:
                seen_ids.add(u.id)
                all_coords.append({
                    'id': u.id,
                    'name': u.name,
                    'email': u.email,
                    'isPrimary': cc.is_primary
                })
        # Also pick up users with role=CLUB_COORDINATOR linked to this club
        coord_users = User.query.filter_by(role='CLUB_COORDINATOR', club_id=c.id).all()
        for u in coord_users:
            if u.id not in seen_ids:
                seen_ids.add(u.id)
                all_coords.append({
                    'id': u.id,
                    'name': u.name,
                    'email': u.email,
                    'isPrimary': (c.coordinator_id == u.id)
                })
        club_dict['allCoordinators'] = all_coords
        clubs_data.append(club_dict)

    return jsonify({
        'college': college.to_dict() if college else None,
        'clubs': clubs_data,
        'events': [e.to_dict() for e in events],
        'stats': {
            'totalClubs': len(clubs),
            'totalEvents': len(events),
            'totalStudents': total_registrations,
            'pendingClubs': len([c for c in clubs if c.status == 'PENDING']),
        },
        'recentEvents': [e.to_dict() for e in recent_events]
    }), 200


@college_admin_bp.route('/clubs', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def get_clubs():
    user, college_id = get_current_college()
    query = Club.query.filter_by(college_id=college_id)
    
    category = request.args.get('category')
    status = request.args.get('status')
    
    if category:
        query = query.filter_by(category=category)
    if status:
        query = query.filter_by(status=status)
        
    clubs = query.order_by(Club.created_at.desc()).all()
    return jsonify({'clubs': [c.to_dict() for c in clubs]}), 200


@college_admin_bp.route('/dashboard/full', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def dashboard_full():
    """Returns per-club stats for the super dashboard."""
    user, college_id = get_current_college()
    clubs = Club.query.filter_by(college_id=college_id).all()
    result = []
    for club in clubs:
        event_count = Event.query.filter_by(club_id=club.id).count()
        member_count = Registration.query.join(Event).filter(
            Event.club_id == club.id, Registration.status == 'CONFIRMED'
        ).distinct(Registration.user_id).count()
        reg_count = EventRegistration.query.join(Event).filter(
            Event.club_id == club.id
        ).count()
        result.append({
            **club.to_dict(),
            'eventCount': event_count,
            'memberCount': member_count,
            'registrationCount': reg_count,
        })
    return jsonify(result), 200


@college_admin_bp.route('/registrations', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def get_all_registrations():
    """Returns all student registrations across the college."""
    user, college_id = get_current_college()
    
    # Get all registrations for events in this college
    regs = EventRegistration.query.join(Event).filter(
        Event.college_id == college_id
    ).order_by(EventRegistration.registered_at.desc()).all()

    return jsonify([r.to_dict() for r in regs]), 200

@college_admin_bp.route('/clubs', methods=['POST'])
@role_required('COLLEGE_ADMIN')
def create_club():
    user, college_id = get_current_college()
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '')
    category = request.form.get('category', '')
    faculty_name = request.form.get('facultyName', '').strip()
    faculty_email = request.form.get('facultyEmail', '').strip().lower()
    coordinator_password = request.form.get('coordinatorPassword', '')
    coordinator_firebase_uid = request.form.get('coordinatorFirebaseUid', '')

    if not name or not faculty_name or not faculty_email:
        return jsonify({'error': 'Club name and coordinator info are required'}), 400

    if not coordinator_firebase_uid and not coordinator_password:
        return jsonify({'error': 'Coordinator password is required for manual registration'}), 400

    if User.query.filter_by(email=faculty_email).first():
        return jsonify({'error': 'Coordinator email already exists'}), 409

    logo_url = None
    if 'logo' in request.files:
        logo_url = save_file(request.files['logo'], 'logos')

    cover_url = None
    if 'cover' in request.files:
        cover_url = save_file(request.files['cover'], 'covers')

    if coordinator_firebase_uid:
        hashed = 'FIREBASE_AUTH'
    else:
        from firebase_admin import auth as firebase_auth
        try:
            fb_user = firebase_auth.create_user(
                email=faculty_email,
                password=coordinator_password,
                display_name=faculty_name
            )
            coordinator_firebase_uid = fb_user.uid
        except Exception as e:
            return jsonify({'error': "Failed to register coordinator in Firebase: An internal server error occurred"}), 400
        hashed = bcrypt.generate_password_hash(coordinator_password).decode('utf-8')

    coordinator = User(
        name=faculty_name,
        email=faculty_email,
        password_hash=hashed,
        firebase_uid=coordinator_firebase_uid or None,
        role='CLUB_COORDINATOR',
        college_id=college_id,
        is_active=True
    )
    db.session.add(coordinator)
    db.session.flush()

    club = Club(
        name=name,
        description=description,
        category=category,
        instagram=request.form.get('instagram', '').strip() or None,
        logo_url=logo_url,
        cover_url=cover_url,
        status='APPROVED',
        college_id=college_id,
        coordinator_id=coordinator.id
    )
    db.session.add(club)
    db.session.flush()

    # Handle club photos (photo_0..photo_4)
    photo_urls = []
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_event_photo(f, 'club_photos')
            if url:
                photo_urls.append(url)
    if photo_urls:
        club.club_photos = photo_urls[:MAX_PHOTOS]

    coordinator.club_id = club.id
    db.session.commit()

    return jsonify({'message': 'Club created', 'club': club.to_dict()}), 201


@college_admin_bp.route('/clubs/<int:club_id>', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def get_club(club_id):
    user, college_id = get_current_college()
    club = Club.query.filter_by(id=club_id, college_id=college_id).first_or_404()
    return jsonify(club.to_dict()), 200


@college_admin_bp.route('/clubs/<int:club_id>', methods=['PUT'])
@role_required('COLLEGE_ADMIN')
def update_club(club_id):
    user, college_id = get_current_college()
    club = Club.query.filter_by(id=club_id, college_id=college_id).first_or_404()

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    if data.get('name'):
        club.name = data.get('name').strip()
    if data.get('description') is not None:
        club.description = data.get('description')
    if data.get('category'):
        club.category = data.get('category')
    if data.get('instagram') is not None:
        club.instagram = data.get('instagram').strip() or None

    # Handle coordinators bulk update (JSON list)
    coords_raw = data.get('coordinators')
    if coords_raw:
        try:
            coords_list = json.loads(coords_raw) if isinstance(coords_raw, str) else coords_raw
            from models import ClubCoordinator
            
            # Keep track of updated/new IDs to handle primary
            updated_ids = []
            
            for c_data in coords_list:
                c_id = c_data.get('id')
                c_name = c_data.get('name', '').strip()
                c_email = c_data.get('email', '').strip().lower()
                c_pass = c_data.get('password', '').strip()
                
                if c_id:
                    # Update existing
                    u = User.query.get(c_id)
                    if u and (u.club_id == club.id or ClubCoordinator.query.filter_by(club_id=club.id, user_id=u.id).first()):
                        u.name = c_name
                        u.email = c_email
                        # Firebase update if password provided
                        fb_kwargs = {'display_name': c_name, 'email': c_email}
                        if c_pass:
                            fb_kwargs['password'] = c_pass
                        try:
                            update_firebase_user(u.firebase_uid, **fb_kwargs)
                            if c_pass:
                                u.password_hash = bcrypt.generate_password_hash(c_pass).decode('utf-8')
                        except Exception as e:
                            print(f"Firebase update error for {u.email}: {e}")
                        updated_ids.append(u.id)
                else:
                    # Create new
                    if c_name and c_email and c_pass:
                        if not User.query.filter_by(email=c_email).first():
                            try:
                                user_record = register_firebase_user(c_email, c_pass, c_name)
                                new_u = User(
                                    firebase_uid=user_record.uid,
                                    name=c_name,
                                    email=c_email,
                                    password_hash=bcrypt.generate_password_hash(c_pass).decode('utf-8'),
                                    role='CLUB_COORDINATOR',
                                    college_id=college_id,
                                    club_id=club.id,
                                    is_active=True
                                )
                                db.session.add(new_u)
                                db.session.flush()
                                
                                cc = ClubCoordinator(club_id=club.id, user_id=new_u.id, is_primary=False)
                                db.session.add(cc)
                                updated_ids.append(new_u.id)
                            except Exception as e:
                                print(f"Failed to add new coordinator {c_email}: {e}")
            
            # Identify and remove deleted coordinators
            all_current_cc = ClubCoordinator.query.filter_by(club_id=club.id).all()
            current_user_ids = [cc.user_id for cc in all_current_cc]
            
            to_delete_ids = [uid for uid in current_user_ids if uid not in updated_ids and uid is not None]
            
            for d_id in to_delete_ids:
                u_to_del = User.query.get(d_id)
                if u_to_del:
                    # Remove from Firebase
                    try:
                        delete_firebase_user(u_to_del.firebase_uid)
                    except: pass
                    # Remove pivot and user
                    ClubCoordinator.query.filter_by(club_id=club.id, user_id=d_id).delete()
                    db.session.delete(u_to_del)
            
            # Ensure at least one is primary if coordinator_id is missing or deleted
            if updated_ids and (not club.coordinator_id or club.coordinator_id in to_delete_ids):
                club.coordinator_id = updated_ids[0]
                # Update pivot is_primary
                cc = ClubCoordinator.query.filter_by(club_id=club.id, user_id=updated_ids[0]).first()
                if cc: cc.is_primary = True

        except Exception as e:
            print(f"Bulk coordinator update error: {e}")

    if 'logo' in request.files:
        logo_url = save_file(request.files['logo'], 'logos')
        if logo_url:
            club.logo_url = logo_url

    if 'cover' in request.files:
        cover_url = save_file(request.files['cover'], 'covers')
        if cover_url:
            club.cover_url = cover_url

    # Handle club photos (photo_0..photo_4)
    existing_photos = club.club_photos or []
    new_photo_urls = list(existing_photos)
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_event_photo(f, 'club_photos')
            if url:
                new_photo_urls.append(url)
    remove_raw = (request.form or {}).get('remove_photos')
    if remove_raw:
        to_remove = json.loads(remove_raw)
        new_photo_urls = [p for p in new_photo_urls if p not in to_remove]
    club.club_photos = new_photo_urls[:MAX_PHOTOS]

    db.session.commit()
    return jsonify(club.to_dict()), 200


@college_admin_bp.route('/clubs/<int:club_id>/suspend', methods=['PUT'])
@role_required('COLLEGE_ADMIN')
def suspend_club(club_id):
    user, college_id = get_current_college()
    club = Club.query.filter_by(id=club_id, college_id=college_id).first_or_404()
    club.status = 'SUSPENDED'
    db.session.commit()
    return jsonify({'message': 'Club suspended', 'club': club.to_dict()}), 200

@college_admin_bp.route('/clubs/<int:club_id>/approve', methods=['PUT'])
@role_required('COLLEGE_ADMIN')
def approve_club(club_id):
    user, college_id = get_current_college()
    club = Club.query.filter_by(id=club_id, college_id=college_id).first_or_404()
    club.status = 'APPROVED'
    db.session.commit()
    return jsonify({'message': 'Club approved', 'club': club.to_dict()}), 200

@college_admin_bp.route('/clubs/<int:club_id>', methods=['DELETE'])
@role_required('COLLEGE_ADMIN')
def delete_club(club_id):
    user, college_id = get_current_college()
    club = Club.query.filter_by(id=club_id, college_id=college_id).first_or_404()
    
    # 1. Clean up events and registrations first
    for event in club.events:
        Registration.query.filter_by(event_id=event.id).delete()
        EventRegistration.query.filter_by(event_id=event.id).delete()
        TeamRegistration.query.filter_by(event_id=event.id).delete()
        db.session.delete(event)
    
    # 2. Find any users linked to this club (coordinators)
    users_with_club = User.query.filter_by(club_id=club.id).all()
    
    # Unlink coordinator to avoid FK constraint on user deletion
    club.coordinator_id = None
    db.session.flush()

    # 3. Clean up the users and their Firebase Auth
    if users_with_club:
        try:
            from firebase_admin import auth as firebase_auth
            for u in users_with_club:
                if u.firebase_uid:
                    try:
                        firebase_auth.delete_user(u.firebase_uid)
                    except Exception as e:
                        print(f"Warning: could not delete Firebase user for coordinator: {e}")
                db.session.delete(u)
        except Exception:
            for u in users_with_club:
                db.session.delete(u)

    db.session.delete(club)
    db.session.commit()
    return jsonify({'message': 'Club deleted successfully'}), 200


@college_admin_bp.route('/events', methods=['GET'])
@jwt_required()
@role_required('COLLEGE_ADMIN')
def get_events():
    try:
        user, college_id = get_current_college()
        status = request.args.get('status')
        
        query = Event.query.filter_by(college_id=college_id)
        if status:
            query = query.filter_by(status=status)
            
        events = query.order_by(Event.created_at.desc()).all()
        for ev in events:
            update_event_status_logic(ev)
        return jsonify({'events': [e.to_dict() for e in events]}), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@college_admin_bp.route('/events/<int:event_id>', methods=['PUT'])
@role_required('COLLEGE_ADMIN')
def update_event(event_id):
    user, college_id = get_current_college()
    event = Event.query.get_or_404(event_id)
    if event.college_id != college_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    for field_form, field_model in [
        ('title', 'title'), ('description', 'description'), ('category', 'category'),
        ('venue', 'venue'), ('startTime', 'start_time'), ('endTime', 'end_time'),
        ('rules', 'rules'), ('eligibilityCriteria', 'eligibility_criteria'),
        ('eligibility', 'eligibility'), ('required_materials', 'required_materials'),
        ('eventScope', 'event_scope'), ('venueMapLink', 'venue_map_link'),
        ('participationType', 'participation_type')
    ]:
        if data.get(field_form) is not None:
            setattr(event, field_model, data.get(field_form))

    if 'maxParticipants' in data:
        val = data.get('maxParticipants')
        event.max_participants = int(val) if val and str(val).strip() != '' and str(val) != 'null' else None

    if data.get('registrationFee') is not None:
        try:
            event.registration_fee = float(str(data.get('registrationFee')))
        except: pass
    
    if data.get('eventDate'):
        event.event_date = datetime.strptime(data.get('eventDate'), '%Y-%m-%d').date()
    if data.get('endDate'):
        event.end_date = datetime.strptime(data.get('endDate'), '%Y-%m-%d').date()
    if data.get('registrationDeadline'):
        event.registration_deadline = datetime.strptime(data.get('registrationDeadline'), '%Y-%m-%d').date()
    elif 'registrationDeadline' in data and not data.get('registrationDeadline'):
        event.registration_deadline = None

    event.registration_type = data.get('registrationType', event.registration_type)
    if data.get('teamMinSize'): event.min_team_size = int(data.get('teamMinSize'))
    if data.get('teamMaxSize'): event.max_team_size = int(data.get('teamMaxSize'))
    if 'maxTeams' in data:
        event.max_teams = int(data.get('maxTeams')) if data.get('maxTeams') and data.get('maxTeams') != 'null' else None
    
    event.upi_id = data.get('upiId', event.upi_id)
    event.upi_name = data.get('upiName', event.upi_name)
    qr_file = request.files.get('paymentQr')
    if qr_file:
        path = save_upload_file(qr_file, 'payment_qr')
        if path:
            event.payment_qr = path

    # themes, prizes, topics, highlights, chiefGuests, judges
    for field_form, field_model in [
        ('themes', 'themes'), ('prizes', 'prizes'),
        ('topics', 'topics'), ('highlights', 'highlights'),
        ('chiefGuests', 'chief_guests'), ('judges', 'judges')
    ]:
        val = data.get(field_form)
        if val is not None:
            parsed = json.loads(val) if isinstance(val, str) else val
            
            if field_form == 'chiefGuests':
                final = []
                for i, g in enumerate(parsed):
                    name = g if isinstance(g, str) else g.get('name', '')
                    photo_file = request.files.get(f'guest_photo_{i}')
                    url = save_upload_file(photo_file, 'event_guests') if photo_file else (g.get('photo') if isinstance(g, dict) else None)
                    final.append({"name": name, "photo": url})
                setattr(event, field_model, final)
            elif field_form == 'judges':
                final = []
                for i, j in enumerate(parsed):
                    name = j if isinstance(j, str) else j.get('name', '')
                    photo_file = request.files.get(f'judge_photo_{i}')
                    url = save_upload_file(photo_file, 'event_judges') if photo_file else (j.get('photo') if isinstance(j, dict) else None)
                    final.append({"name": name, "photo": url})
                setattr(event, field_model, final)
            else:
                setattr(event, field_model, parsed)

    if 'cover' in request.files:
        cover_url = save_file(request.files['cover'], 'covers')
        if cover_url:
            event.cover_url = cover_url

    # Handle event photo uploads
    existing_photos = event.event_photos or []
    new_photo_urls = list(existing_photos)
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_event_photo(f, 'event_photos')
            if url:
                new_photo_urls.append(url)
    remove_raw = (request.form or {}).get('remove_photos')
    if remove_raw:
        to_remove = json.loads(remove_raw)
        new_photo_urls = [p for p in new_photo_urls if p not in to_remove]
    event.event_photos = new_photo_urls[:MAX_PHOTOS]

    db.session.commit()
    return jsonify(event.to_dict()), 200

@college_admin_bp.route('/events/<int:event_id>', methods=['DELETE'])
@role_required('COLLEGE_ADMIN')
def delete_event(event_id):
    user, college_id = get_current_college()
    event = Event.query.get_or_404(event_id)
    if event.college_id != college_id:
        return jsonify({'error': 'Unauthorized'}), 403
    Registration.query.filter_by(event_id=event_id).delete()
    EventRegistration.query.filter_by(event_id=event_id).delete()
    TeamRegistration.query.filter_by(event_id=event_id).delete()
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted'}), 200

@college_admin_bp.route('/events', methods=['POST'])
@role_required('COLLEGE_ADMIN')
def create_event():
    user, college_id = get_current_college()

    # Accept both JSON and FormData (FormData needed for photo uploads)
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    fee_raw = data.get('registrationFee', 0)
    try:
        registration_fee = float(str(fee_raw)) if fee_raw != '' else 0.0
    except (ValueError, TypeError):
        registration_fee = 0.0

    from datetime import datetime
    event_date_str = data.get('eventDate')
    end_date_str = data.get('endDate')
    deadline_str = data.get('registrationDeadline')

    # Parse themes and prizes (sent as JSON strings in FormData)
    themes_raw = data.get('themes')
    themes = json.loads(themes_raw) if themes_raw else []

    prizes_raw = data.get('prizes')
    prizes = json.loads(prizes_raw) if prizes_raw else []

    topics_raw = data.get('topics')
    topics = json.loads(topics_raw) if topics_raw else []

    highlights_raw = data.get('highlights')
    highlights = json.loads(highlights_raw) if highlights_raw else []

    chief_guests_raw = data.get('chiefGuests')
    chief_guests = json.loads(chief_guests_raw) if chief_guests_raw else []
    final_chief_guests = []
    for i, g in enumerate(chief_guests):
        name = g if isinstance(g, str) else g.get('name', '')
        photo_file = request.files.get(f'guest_photo_{i}')
        url = save_upload_file(photo_file, 'event_guests') if photo_file else (g.get('photo') if isinstance(g, dict) else None)
        final_chief_guests.append({"name": name, "photo": url})

    judges_raw = data.get('judges')
    judges = json.loads(judges_raw) if judges_raw else []
    final_judges = []
    for i, j in enumerate(judges):
        name = j if isinstance(j, str) else j.get('name', '')
        photo_file = request.files.get(f'judge_photo_{i}')
        url = save_upload_file(photo_file, 'event_judges') if photo_file else (j.get('photo') if isinstance(j, dict) else None)
        final_judges.append({"name": name, "photo": url})

    assigned_club_id = data.get('assignedClubId')
    status = 'UPCOMING'
    organized_by = 'COLLEGE'
    club_id = None

    if assigned_club_id:
        status = 'PENDING_CLUB_ACCEPTANCE'
        organized_by = 'CLUB'
        club_id = int(assigned_club_id)

    event = Event(
        title=title,
        description=data.get('description', ''),
        category=data.get('category', ''),
        venue=data.get('venue', ''),
        venue_map_link=data.get('venueMapLink', ''),
        event_date=datetime.strptime(event_date_str, '%Y-%m-%d').date() if event_date_str else None,
        end_date=datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None,
        start_time=data.get('startTime', ''),
        end_time=data.get('endTime', ''),
        registration_deadline=datetime.strptime(deadline_str, '%Y-%m-%d').date() if deadline_str else None,
        max_participants=int(data.get('maxParticipants', 0)) if data.get('maxParticipants') else None,
        registration_fee=registration_fee,
        rules=data.get('rules', ''),
        eligibility_criteria=data.get('eligibilityCriteria', ''),
        eligibility=data.get('eligibility', '') or None,
        required_materials=data.get('requiredMaterials', ''),
        themes=themes,
        prizes=prizes,
        topics=topics,
        highlights=highlights,
        chief_guests=final_chief_guests,
        judges=final_judges,
        status=status,
        organized_by=organized_by,
        event_scope=data.get('eventScope', 'INTRA'),
        college_id=college_id,
        club_id=club_id,
        created_by=user.id,
        registration_type=data.get('registrationType', 'INDIVIDUAL'),
        min_team_size=int(data.get('minTeamSize', 1)) if data.get('minTeamSize') else 1,
        max_team_size=int(data.get('maxTeamSize', 1)) if data.get('maxTeamSize') else 1,
        max_teams=int(data.get('maxTeams')) if data.get('maxTeams') and data.get('maxTeams') != 'null' else None,
        upi_id=data.get('upiId'),
        upi_name=data.get('upiName')
    )
    db.session.add(event)
    db.session.flush()  # get event.id before photos

    # Handle payment QR
    qr_file = request.files.get('paymentQr')
    if qr_file:
        path = save_upload_file(qr_file, 'payment_qr')
        if path:
            event.payment_qr = path

    # Notification for club coordinator if assigned
    if club_id:
        club = Club.query.get(club_id)
        if club and club.coordinator_id:
            from app import create_notification
            create_notification(
                user_id=club.coordinator_id,
                title="🎉 New Event Offer",
                message=f"College Admin wants to host '{title}' through your club.",
                type_="EVENT_OFFER",
                link="/club/dashboard"
            )

    # Handle cover image
    if 'cover' in request.files:
        cover_url = save_file(request.files['cover'], 'covers')
        if cover_url:
            event.cover_url = cover_url

    # Handle event photos (photo_0..photo_4)
    photo_urls = []
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_event_photo(f, 'event_photos')
            if url:
                photo_urls.append(url)
    if photo_urls:
        event.event_photos = photo_urls[:MAX_PHOTOS]

    db.session.commit()
    return jsonify({'message': 'Event created', 'event': event.to_dict()}), 201

@college_admin_bp.route('/events/<int:event_id>/withdraw-offer', methods=['PUT'])
@role_required('COLLEGE_ADMIN')
def withdraw_event_offer(event_id):
    user, college_id = get_current_college()
    event = Event.query.get_or_404(event_id)
    if event.college_id != college_id:
        return jsonify({'message': 'Unauthorized'}), 403
    if event.status != 'PENDING_CLUB_ACCEPTANCE':
        return jsonify({'message': 'No pending offer for this event'}), 400
    
    event.club_id = None
    event.organized_by = "COLLEGE"
    event.status = "UPCOMING"
    db.session.commit()
    return jsonify({'message': 'Offer withdrawn and hosting as college', 'event': event.to_dict()}), 200

@college_admin_bp.route('/profile', methods=['GET'])
@role_required('COLLEGE_ADMIN')
def get_profile():
    user, college_id = get_current_college()
    college = College.query.get_or_404(college_id)
    return jsonify(college.to_dict()), 200

@college_admin_bp.route('/profile', methods=['PUT'])
@role_required('COLLEGE_ADMIN')
def update_profile():
    user, college_id = get_current_college()
    college = College.query.get_or_404(college_id)

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    college.name = data.get('name', college.name)
    college.description = data.get('description', college.description)
    college.website = data.get('website', college.website)
    college.location = data.get('location', college.location)
    
    # Old text affiliation + new array affiliations
    if 'affiliation' in data:
        college.affiliation = data.get('affiliation')
    if 'affiliations' in data:
        val = data.get('affiliations')
        college.affiliations = json.loads(val) if isinstance(val, str) else val

    # New fields
    if 'establishedYear' in data:
        val = data.get('establishedYear')
        college.established_year = int(val) if val and str(val).strip() else None
    if 'type' in data:
        college.type = data.get('type')
    if 'naacGrade' in data:
        college.naac_grade = data.get('naacGrade')
    if 'contactEmail' in data:
        college.contact_email = data.get('contactEmail')
    if 'phone' in data:
        college.phone = data.get('phone')
    if 'twitter' in data:
        college.twitter = data.get('twitter')
    if 'linkedin' in data:
        college.linkedin = data.get('linkedin')
    if 'facebook' in data:
        college.facebook = data.get('facebook')
    if 'instagram' in data:
        college.instagram = data.get('instagram')

    if request.content_type and 'multipart/form-data' in request.content_type:
        if 'logo' in request.files:
            url = save_file(request.files['logo'], 'logos')
            if url:
                college.logo_url = url
        if 'banner' in request.files:
            url = save_file(request.files['banner'], 'banners')
            if url:
                college.banner_url = url

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'college': college.to_dict()}), 200

@college_admin_bp.route('/events/<int:event_id>/registrations', methods=['GET'])
@jwt_required()
@role_required('COLLEGE_ADMIN')
def get_event_individual_regs(event_id):
    try:
        identity   = get_jwt_identity()
        user_id = identity['id'] if isinstance(identity, dict) else identity
        user = User.query.get(user_id)
        college_id = user.college_id

        event = Event.query.get_or_404(event_id)
        if event.college_id != college_id:
            return jsonify({"message": "Unauthorized"}), 403

        # We look for EventRegistration records (NOT Registration model which is legacy/simplified)
        regs = EventRegistration.query.filter_by(event_id=event_id).all()
        result = []
        return jsonify({"registrations": [r.to_dict() for r in regs]}), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@college_admin_bp.route('/events/<int:event_id>/teams', methods=['GET'])
@jwt_required()
@role_required('COLLEGE_ADMIN')
def get_event_teams(event_id):
    try:
        user, college_id = get_current_college()
        event = Event.query.get_or_404(event_id)
        if event.college_id != college_id:
            return jsonify({"message": "Unauthorized"}), 403

        teams = TeamRegistration.query.filter_by(event_id=event_id).all()
        return jsonify({
            "teams": [t.to_dict() for t in teams]
        }), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@college_admin_bp.route("/registrations/<int:reg_id>/verify", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def verify_registration(reg_id):
    user, college_id = get_current_college()
    reg = EventRegistration.query.get_or_404(reg_id)
    
    if reg.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
        
    reg.status = "VERIFIED"
    reg.verified_at = datetime.utcnow()
    reg.verified_by = user.id
    db.session.commit()
    
    if reg.event.club_id:
        log_activity(
            club_id=reg.event.club_id,
            actor_id=user.id,
            action="REGISTRATION_VERIFIED",
            details=f"Registration for '{reg.event.title}' verified by College Admin"
        )
        db.session.commit()
    
    return jsonify({"message": "Registration verified successfully", "registration": reg.to_dict()}), 200

@college_admin_bp.route("/registrations/<int:reg_id>/reject", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def reject_registration(reg_id):
    user, college_id = get_current_college()
    reg = EventRegistration.query.get_or_404(reg_id)
    
    if reg.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
        
    reason = request.json.get("reason", "Payment verification failed")
    reg.status = "REJECTED"
    reg.rejection_reason = reason
    db.session.commit()

    if reg.event.club_id:
        log_activity(
            club_id=reg.event.club_id,
            actor_id=user.id,
            action="REGISTRATION_REJECTED",
            details=f"Registration for '{reg.event.title}' rejected by College Admin"
        )
        db.session.commit()
    
    return jsonify({"message": "Registration rejected", "registration": reg.to_dict()}), 200

# --- TEAM VERIFICATION ---

@college_admin_bp.route("/team-leader/<int:team_id>/verify", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def verify_team_leader(team_id):
    user, college_id = get_current_college()
    team = TeamRegistration.query.get_or_404(team_id)
    
    if team.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
        
    team.leader_payment_status = "PAID"
    
    # Sync with EventRegistration if it exists
    from models import EventRegistration
    leader_reg = EventRegistration.query.filter_by(
        event_id=team.event_id,
        student_id=team.leader_id
    ).first()
    if leader_reg:
        leader_reg.status = "VERIFIED"

    # Check if team is now complete
    members_paid = all(m.payment_status in ["PAID", "FREE"] for m in team.members)
    if members_paid:
        team.status = "COMPLETED"
        team.payment_status = "PAID"
        from routes.team_registration import create_official_team_registrations
        create_official_team_registrations(team)
    
    db.session.commit()
    return jsonify({"message": "Leader payment verified", "team": team.to_dict()}), 200

@college_admin_bp.route("/team-leader/<int:team_id>/reject", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def reject_team_leader(team_id):
    user, college_id = get_current_college()
    team = TeamRegistration.query.get_or_404(team_id)
    
    if team.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
        
    team.leader_payment_status = "UNPAID"
    team.leader_payment_ref = None
    team.leader_payment_screenshot = None
    db.session.commit()
    return jsonify({"message": "Leader payment rejected", "team": team.to_dict()}), 200

@college_admin_bp.route("/team-member/<int:member_id>/verify", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def verify_team_member(member_id):
    user, college_id = get_current_college()
    member = TeamMember.query.get_or_404(member_id)
    team = member.team
    
    if team.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
        
    member.payment_status = "PAID"
    member.paid_at = datetime.utcnow()
    
    # Sync with EventRegistration if it exists
    from models import EventRegistration
    member_reg = EventRegistration.query.filter_by(
        event_id=team.event_id,
        student_id=member.user_id
    ).first() if member.user_id else None
    
    if member_reg:
        member_reg.status = "VERIFIED"
    
    # Check if team is now complete
    leader_paid = team.leader_payment_status in ["PAID", "FREE"]
    members_paid = all(m.payment_status in ["PAID", "FREE"] for m in team.members)
    
    if leader_paid and members_paid:
        team.status = "COMPLETED"
        team.payment_status = "PAID"
        from routes.team_registration import create_official_team_registrations
        create_official_team_registrations(team)
        
    db.session.commit()
    return jsonify({"message": "Member payment verified", "member": member.id}), 200

@college_admin_bp.route("/team-member/<int:member_id>/reject", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def reject_team_member(member_id):
    user, college_id = get_current_college()
    member = TeamMember.query.get_or_404(member_id)
    
    if member.team.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
        
    member.payment_status = "UNPAID"
    member.payment_ref = None
    member.payment_screenshot = None
    db.session.commit()
    return jsonify({"message": "Member payment rejected"}), 200

@college_admin_bp.route("/registrations/<int:reg_id>", methods=["DELETE"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def delete_registration(reg_id):
    user, college_id = get_current_college()
    reg = EventRegistration.query.get_or_404(reg_id)
    if reg.event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
    db.session.delete(reg)
    db.session.commit()
    return jsonify({"message": "Registration deleted"}), 200

@college_admin_bp.route("/events/<int:event_id>/reset-all", methods=["DELETE"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def reset_all_registrations(event_id):
    user, college_id = get_current_college()
    event = Event.query.get_or_404(event_id)
    if event.college_id != college_id:
        return jsonify({"message": "Unauthorized"}), 403
    EventRegistration.query.filter_by(event_id=event_id).delete()
    db.session.commit()
    return jsonify({"message": "All registrations reset"}), 200


# --- DASHBOARD STATS ---
@college_admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def get_college_stats():
    user, college_id = get_current_college()
    
    from datetime import date

    # Real counts
    total_students = User.query.filter_by(
        college_id=college_id, role="STUDENT", is_active=True
    ).count()

    total_clubs = Club.query.filter_by(
        college_id=college_id
    ).count()

    all_events = Event.query.filter_by(
        college_id=college_id
    ).all()

    # Auto-update statuses to real-time
    for ev in all_events:
        update_event_status_logic(ev)
    db.session.commit()

    total_events     = len(all_events)
    upcoming_events  = sum(1 for e in all_events if e.status=="UPCOMING")
    ongoing_events   = sum(1 for e in all_events if e.status=="ONGOING")
    completed_events = sum(1 for e in all_events if e.status=="COMPLETED")

    # Total registrations across all events of this college
    event_ids = [e.id for e in all_events]
    total_regs = EventRegistration.query.filter(
        EventRegistration.event_id.in_(event_ids),
        EventRegistration.status.in_(["VERIFIED"])
    ).count() if event_ids else 0

    # Monthly registrations for current year (real data)
    current_year = datetime.utcnow().year
    monthly = []
    for month_num in range(1, 13):
        count = EventRegistration.query.join(Event).filter(
            Event.college_id == college_id,
            EventRegistration.status.in_(["VERIFIED"]),
            extract("year",  EventRegistration.registered_at) == current_year,
            extract("month", EventRegistration.registered_at) == month_num
        ).count()
        monthly.append({
            "month": calendar.month_abbr[month_num],
            "count": count
        })

    # Events by club (real data)
    clubs = Club.query.filter_by(college_id=college_id).all()
    events_by_club = []
    for club in clubs:
        club_event_count = Event.query.filter_by(
            club_id=club.id
        ).count()
        reg_count = EventRegistration.query.join(Event).filter(
            Event.club_id == club.id,
            EventRegistration.status.in_(["VERIFIED"])
        ).count()
        events_by_club.append({
            "club":          club.name,
            "events":        club_event_count,
            "registrations": reg_count
        })

    # Top events by registration count (real)
    top_events_list = []
    for event in sorted(all_events,
        key=lambda e: EventRegistration.query.filter_by(
            event_id=e.id).filter(EventRegistration.status.in_(["VERIFIED"])).count(), reverse=True)[:5]:
        reg_count = EventRegistration.query.filter_by(
            event_id=event.id).filter(EventRegistration.status.in_(["VERIFIED"])).count()
        top_events_list.append({
            "title":         event.title,
            "registrations": reg_count,
            "status":        event.status,
            "clubName":      Club.query.get(event.club_id).name
                             if event.club_id else None
        })

    # Recent registrations as activity (real)
    recent_regs = EventRegistration.query.join(Event).filter(
        Event.college_id == college_id,
        EventRegistration.status.in_(["VERIFIED"])
    ).order_by(EventRegistration.registered_at.desc()).limit(8).all()

    recent_activity = []
    for reg in recent_regs:
        student = reg.student
        event   = reg.event
        if student and event:
            recent_activity.append({
                "type":    "NEW_REGISTRATION",
                "message": f"{student.name} registered for {event.title}",
                "time":    reg.registered_at.isoformat()
            })

    return jsonify({
        "totalStudents":      total_students,
        "totalClubs":         total_clubs,
        "totalEvents":        total_events,
        "upcomingEvents":     upcoming_events,
        "ongoingEvents":      ongoing_events,
        "completedEvents":    completed_events,
        "totalRegistrations": total_regs,
        "monthlyRegistrations": monthly,
        "eventsByClub":       events_by_club,
        "topEvents":          top_events_list,
        "recentActivity":     recent_activity,
    }), 200

@college_admin_bp.route("/students", methods=["GET"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def get_students():
    try:
        user, college_id = get_current_college()

        students = User.query.filter_by(
            college_id=college_id,
            role="STUDENT",
            is_active=True
        ).order_by(User.created_at.desc()).all()

        result = []
        for s in students:
            # Count individual event registrations (verified)
            reg_count = EventRegistration.query.filter_by(
                student_id=s.id,
                team_name=None
            ).filter(EventRegistration.status.in_(["VERIFIED"])).count()

            # Count team registrations (as leader or member)
            team_leader_count = TeamRegistration.query.filter_by(
                leader_id=s.id,
                status="COMPLETED"
            ).count()

            team_member_count = TeamMember.query.filter_by(
                user_id=s.id,
                status="ACCEPTED"
            ).join(TeamRegistration).filter(
                TeamRegistration.status == "COMPLETED"
            ).count()

            total_participation = (
                reg_count +
                team_leader_count +
                team_member_count
            )

            result.append({
                "id":            s.id,
                "name":          s.name,
                "email":         s.email,
                "createdAt":     s.created_at.isoformat()
                                 if s.created_at else None,
                "registrations": reg_count,
                "teamEvents":    team_leader_count + team_member_count,
                "totalParticipation": total_participation,
                "isParticipating": total_participation > 0,
            })

        return jsonify({
            "students":    result,
            "total":       len(result),
            "activeCount": sum(
                1 for s in result if s["isParticipating"]
            )
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@college_admin_bp.route("/clubs/<int:club_id>/events", methods=["GET"])
@role_required("COLLEGE_ADMIN")
def get_club_events(club_id):
    user, college_id = get_current_college()
    club = Club.query.filter_by(id=club_id, college_id=college_id).first_or_404()
    events = Event.query.filter_by(club_id=club.id).order_by(Event.event_date.desc()).all()
    return jsonify([e.to_dict() for e in events]), 200

# --- GALLERY MANAGEMENT ---
def save_college_photo(file):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in {"jpg","jpeg","png","webp","gif"}: return None
    fname = f"{uuid.uuid4().hex}.{ext}"
    folder = os.path.join("uploads", "college_gallery")
    os.makedirs(folder, exist_ok=True)
    fpath = os.path.join(folder, fname)
    file.save(fpath)
    return f"/uploads/college_gallery/{fname}"

@college_admin_bp.route("/gallery/upload", methods=["POST"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def upload_gallery_photos():
    user, college_id = get_current_college()
    college = College.query.get(college_id)
    if not college: return jsonify({"message": "College not found"}), 404
    
    current_photos = college.college_photos or []
    if len(current_photos) >= 20:
        return jsonify({"message": "Gallery limit reached (max 20)"}), 400

    new_photos = []
    # Support multiple files (photo_0, photo_1...)
    for key in request.files:
        if key.startswith("photo_"):
            f = request.files[key]
            if f and f.filename:
                url = save_college_photo(f)
                if url:
                    # Look for matching caption_X
                    idx = key.replace("photo_", "")
                    caption = request.form.get(f"caption_{idx}", "")
                    new_photos.append({"url": url, "caption": caption})

    combined = current_photos + new_photos
    college.college_photos = combined[:20]
    db.session.commit()
    return jsonify({
        "message": f"{len(new_photos)} photo(s) uploaded",
        "collegePhotos": college.college_photos
    }), 200

@college_admin_bp.route("/gallery/<int:photo_index>", methods=["DELETE"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def delete_gallery_photo(photo_index):
    user, college_id = get_current_college()
    college = College.query.get(college_id)
    current_photos = list(college.college_photos or [])
    
    if photo_index < 0 or photo_index >= len(current_photos):
        return jsonify({"message": "Invalid photo index"}), 400
        
    photo = current_photos.pop(photo_index)
    
    # Try to delete file
    try:
        path = photo['url'].lstrip('/')
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    college.college_photos = current_photos
    db.session.commit()
    return jsonify({"message": "Photo deleted", "collegePhotos": college.college_photos})

import csv
import io
from flask import Response

@college_admin_bp.route("/export-clubs", methods=["GET"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def export_clubs():
    user, college_id = get_current_college()
    clubs = Club.query.filter_by(college_id=college_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Club Name', 'Description', 'Category', 'Established Year', 'Coordinator Name', 'Coordinator Email', 'Status'])
    
    for c in clubs:
        coord = User.query.get(c.coordinator_id) if c.coordinator_id else None
        coord_name = coord.name if coord else "N/A"
        coord_email = coord.email if coord else "N/A"
        
        writer.writerow([
            c.name,
            c.description,
            c.category or "N/A",
            c.established_year or "N/A",
            coord_name,
            coord_email,
            c.status
        ])
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=clubs_export.csv"}
    )

@college_admin_bp.route("/profile/events", methods=["GET"])
@jwt_required()
@role_required("COLLEGE_ADMIN")
def get_profile_events():
    """Returns upcoming and past events for the college profile page (including all club events)."""
    try:
        user, college_id = get_current_college()
        
        # Auto-update statuses
        all_events = Event.query.filter_by(college_id=college_id).all()
        for ev in all_events:
            update_event_status_logic(ev)
        db.session.commit()
        
        upcoming = Event.query.filter(
            Event.college_id == college_id,
            Event.status.in_(["UPCOMING", "ONGOING"])
        ).order_by(Event.event_date.asc()).all()
        
        past = Event.query.filter(
            Event.college_id == college_id,
            Event.status == "COMPLETED"
        ).order_by(Event.event_date.desc()).all()
        
        return jsonify({
            "upcoming": [e.to_dict() for e in upcoming],
            "past": [e.to_dict() for e in past]
        }), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"upcoming": [], "past": []}), 500

from werkzeug.security import generate_password_hash
from middleware.auth_middleware import register_firebase_user, update_firebase_user, delete_firebase_user

@college_admin_bp.route("/clubs/<int:club_id>/coordinators", methods=["GET"])
@role_required("COLLEGE_ADMIN")
def get_club_coordinators_admin(club_id):
    try:
        from models import ClubCoordinator, User, Club
        club = Club.query.get_or_404(club_id)
        
        coordinators = []
        seen = set()
        
        # 1. From ClubCoordinator table
        cc_list = ClubCoordinator.query.filter_by(club_id=club.id).all()
        for cc in cc_list:
            u = cc.user
            if u and u.id not in seen:
                seen.add(u.id)
                coordinators.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "isPrimary": cc.is_primary
                })
                
        # 2. From User table with club_id mapping
        u_list = User.query.filter_by(role='CLUB_COORDINATOR', club_id=club.id).all()
        for u in u_list:
            if u.id not in seen:
                seen.add(u.id)
                coordinators.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "isPrimary": (club.coordinator_id == u.id)
                })
                
        # Sort primary first
        coordinators.sort(key=lambda x: not x["isPrimary"])
        return jsonify({"coordinators": coordinators}), 200
    except Exception as e:
        print(f"GET COORD ERROR: {e}")
        return jsonify({"error": "Failed to fetch coordinators"}), 500

@college_admin_bp.route("/clubs/<int:club_id>/coordinators", methods=["POST"])
@role_required("COLLEGE_ADMIN")
def add_club_coordinator_admin(club_id):
    try:
        from models import ClubCoordinator, User, Club
        club = Club.query.get_or_404(club_id)
        data = request.get_json()
        
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        
        if not name or not email or not password:
            return jsonify({"error": "Name, email and password required"}), 400
            
        # Check if user already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({"error": "Email already in use"}), 400
            
        user_record = register_firebase_user(email, password, name)
        if hasattr(user_record, 'error'):
            return jsonify({'error': user_record.error}), 400
            
        uid = user_record.uid
        new_user = User(
            firebase_uid=uid,
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            role='CLUB_COORDINATOR',
            college_id=club.college_id,
            club_id=club.id,
            status='ACTIVE'
        )
        db.session.add(new_user)
        db.session.flush()
        
        # Add to ClubCoordinator pivot
        # If this is the only one, make it primary? If club has no coordinator_id, make primary and set club.coordinator_id
        is_primary = False
        if not club.coordinator_id:
            club.coordinator_id = new_user.id
            is_primary = True
            
        cc = ClubCoordinator(club_id=club.id, user_id=new_user.id, is_primary=is_primary)
        db.session.add(cc)
        db.session.commit()
        
        return jsonify({
            "message": "Coordinator added",
            "coordinator": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "isPrimary": is_primary
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"ADD COORD ERROR: {e}")
        return jsonify({"error": "Failed to add coordinator"}), 500

@college_admin_bp.route("/clubs/<int:club_id>/coordinators/<int:coord_id>", methods=["PUT"])
@role_required("COLLEGE_ADMIN")
def update_club_coordinator_admin(club_id, coord_id):
    try:
        from models import ClubCoordinator, User, Club
        club = Club.query.get_or_404(club_id)
        user = User.query.get_or_404(coord_id)
        
        # Verify user belongs to this club...
        
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        
        # Firebase update
        fb_kwargs = {}
        if email and email != user.email:
            fb_kwargs['email'] = email
        if name and name != user.name:
            fb_kwargs['display_name'] = name
        if password:
            fb_kwargs['password'] = password
            
        if fb_kwargs:
            resp = update_firebase_user(user.firebase_uid, **fb_kwargs)
            if hasattr(resp, 'error'):
                return jsonify({'error': resp.error}), 400
                
        if name: user.name = name
        if email: user.email = email
        if password: user.password_hash = generate_password_hash(password)
        
        db.session.commit()
        
        cc = ClubCoordinator.query.filter_by(club_id=club.id, user_id=user.id).first()
        is_primary = cc.is_primary if cc else (club.coordinator_id == user.id)
        
        return jsonify({
            "message": "Coordinator updated",
            "coordinator": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "isPrimary": is_primary
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"UPDATE COORD ERROR: {e}")
        return jsonify({"error": "Failed to update coordinator"}), 500

@college_admin_bp.route("/clubs/<int:club_id>/coordinators/<int:coord_id>", methods=["DELETE"])
@role_required("COLLEGE_ADMIN")
def delete_club_coordinator_admin(club_id, coord_id):
    try:
        from models import ClubCoordinator, User, Club
        club = Club.query.get_or_404(club_id)
        user = User.query.get_or_404(coord_id)
        
        # Determine if it's primary
        cc = ClubCoordinator.query.filter_by(club_id=club.id, user_id=user.id).first()
        if cc and cc.is_primary:
            return jsonify({"error": "Cannot delete primary coordinator. Change primary first."}), 400
        if club.coordinator_id == user.id:
            return jsonify({"error": "Cannot delete primary coordinator. Change primary first."}), 400
            
        delete_firebase_user(user.firebase_uid)
        
        if cc:
            db.session.delete(cc)
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({"message": "Coordinator removed"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"DELETE COORD ERROR: {e}")
        return jsonify({"error": "Failed to remove coordinator"}), 500
