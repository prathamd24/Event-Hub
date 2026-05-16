from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required, get_jwt_identity, role_required
from extensions import db
from models import User, Club, Event, Registration, EventRegistration, TeamRegistration, ClubMembership, TeamMember, ClubRole, BroadcastMessage, Notification, ActivityLog
from utils.logging_utils import log_activity
from datetime import datetime, date
from utils.event_utils import update_event_status_logic
import os
import uuid
import json

club_coordinator_bp = Blueprint('club_coordinator', __name__)

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

def save_photo(file, folder):
    return save_upload_file(file, folder)


def get_current_coordinator():
    identity = get_jwt_identity()
    user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
    return user

def get_managed_club(user, club_id=None):
    """
    Returns the club if the user is authorized to manage it.
    - CLUB_COORDINATOR: Must match user.club_id
    - COLLEGE_ADMIN: Must belong to the user's college
    """
    if not club_id:
        club_id = request.args.get('club_id') or request.form.get('club_id')
        if not club_id and request.is_json:
            club_id = request.get_json().get('club_id')
    
    if user.role == 'CLUB_COORDINATOR':
        # Default to user's assigned club
        cid = club_id or user.club_id
        if not cid or str(cid) != str(user.club_id):
            return None
        return Club.query.get(cid)
    
    if user.role == 'COLLEGE_ADMIN':
        if not club_id:
            return None
        club = Club.query.get(club_id)
        if club and club.college_id == user.college_id:
            return club
        return None
    
    return None


@club_coordinator_bp.route('/dashboard', methods=['GET'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def dashboard():
    user = get_current_coordinator()
    club = get_managed_club(user)
    
    if not club:
        if user.role == 'CLUB_COORDINATOR':
            club = Club.query.get(user.club_id)
        
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404

    total_registrations = EventRegistration.query.join(Event).filter(
        Event.club_id == club.id
    ).count()

    total_events = Event.query.filter_by(club_id=club.id).count()

    today = date.today()
    upcoming_events = Event.query.filter_by(club_id=club.id).filter(
        Event.status == 'UPCOMING',
        Event.event_date >= today
    ).count()

    return jsonify({
        'clubInfo': club.to_dict(),
        'totalRegistrations': total_registrations,
        'totalEvents': total_events,
        'upcomingEvents': upcoming_events,
    }), 200

@club_coordinator_bp.route("/logs", methods=["GET"])
@jwt_required()
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def get_club_logs():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
    
    logs = ActivityLog.query.filter_by(
        club_id=club.id
    ).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200


@club_coordinator_bp.route('/events', methods=['GET'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_events():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
        
    status = request.args.get('status')
    query = Event.query.filter_by(club_id=club.id)
    if status:
        query = query.filter_by(status=status)
    events = query.order_by(Event.created_at.desc()).all()
    # Auto-update statuses on fetch
    for ev in events:
        update_event_status_logic(ev)
    return jsonify([e.to_dict() for e in events]), 200

@club_coordinator_bp.route('/events', methods=['POST'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def create_event():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404

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

    event_date_str = data.get('eventDate')
    end_date_str = data.get('endDate')
    deadline_str = data.get('registrationDeadline')

    # Parse themes and prizes (JSON strings in FormData)
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

    cover_url = None
    if 'cover' in request.files:
        from utils.file_upload import save_file as _save
        cover_url = _save(request.files['cover'], 'covers')

    event = Event(
        title=title,
        description=data.get('description', ''),
        category=club.category,
        venue=data.get('venue', ''),
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
        status='UPCOMING',
        organized_by='CLUB',
        event_scope=data.get('eventScope', 'INTRA'),
        venue_map_link=data.get('venueMapLink', ''),
        college_id=club.college_id,
        club_id=club.id,
        created_by=user.id,
        cover_url=cover_url,
        participation_type=data.get('participationType', 'INDIVIDUAL'),
        registration_type=data.get('registrationType', 'INDIVIDUAL'),
        min_team_size=int(data.get('minTeamSize', 1)) if data.get('minTeamSize') else 1,
        max_team_size=int(data.get('maxTeamSize', 1)) if data.get('maxTeamSize') else 1,
        max_teams=int(data.get('maxTeams')) if data.get('maxTeams') and data.get('maxTeams') != 'null' else None,
        upi_id=data.get('upiId'),
        upi_name=data.get('upiName')
    )
    
    # Handle payment QR
    qr_file = request.files.get('paymentQr')
    if qr_file:
        path = save_upload_file(qr_file, 'payment_qr')
        if path:
            event.payment_qr = path
    db.session.add(event)
    db.session.flush()

    # Handle event photos (photo_0..photo_4)
    photo_urls = []
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_photo(f, 'event_photos')
            if url:
                photo_urls.append(url)
    if photo_urls:
        event.event_photos = photo_urls[:MAX_PHOTOS]

    db.session.commit()
    log_activity(
        club_id=club.id,
        college_id=club.college_id,
        actor_id=user.id,
        action="EVENT_CREATED",
        details=f"'{event.title}' created"
    )
    db.session.commit()
    return jsonify({'message': 'Event created', 'event': event.to_dict()}), 201


@club_coordinator_bp.route('/events/<int:event_id>', methods=['PUT'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def update_event(event_id):
    user = get_current_coordinator()
    event = Event.query.get_or_404(event_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({'error': 'Unauthorized access to this event'}), 403

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    for field_form, field_model in [
        ('title', 'title'), ('description', 'description'), ('venue', 'venue'),
        ('startTime', 'start_time'), ('endTime', 'end_time'),
        ('rules', 'rules'), ('eligibilityCriteria', 'eligibility_criteria'),
        ('eligibility', 'eligibility'), ('requiredMaterials', 'required_materials'),
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
    elif 'endDate' in data and not data.get('endDate'):
        event.end_date = None

    if data.get('registrationDeadline'):
        event.registration_deadline = datetime.strptime(data.get('registrationDeadline'), '%Y-%m-%d').date()
    elif 'registrationDeadline' in data and not data.get('registrationDeadline'):
        event.registration_deadline = None

    if data.get('minTeamSize'):
        event.min_team_size = int(data.get('minTeamSize'))
    if data.get('maxTeamSize'):
        event.max_team_size = int(data.get('maxTeamSize'))
    if 'maxTeams' in data:
        event.max_teams = int(data.get('maxTeams')) if data.get('maxTeams') and data.get('maxTeams') != 'null' else None
    
    event.upi_id = data.get('upiId', event.upi_id)
    event.upi_name = data.get('upiName', event.upi_name)
    event.registration_type = data.get('registrationType', event.registration_type)

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
                    photo_url = save_upload_file(photo_file, 'event_guests') if photo_file else (g.get('photo') if isinstance(g, dict) else None)
                    final.append({"name": name, "photo": photo_url})
                setattr(event, field_model, final)
            elif field_form == 'judges':
                final = []
                for i, j in enumerate(parsed):
                    name = j if isinstance(j, str) else j.get('name', '')
                    photo_file = request.files.get(f'judge_photo_{i}')
                    photo_url = save_upload_file(photo_file, 'event_judges') if photo_file else (j.get('photo') if isinstance(j, dict) else None)
                    final.append({"name": name, "photo": photo_url})
                setattr(event, field_model, final)
            else:
                setattr(event, field_model, parsed)

    if 'cover' in request.files:
        from utils.file_upload import save_file as _save
        cover_url = _save(request.files['cover'], 'covers')
        if cover_url:
            event.cover_url = cover_url

    # Handle event photo uploads
    existing_photos = event.event_photos or []
    new_photo_urls = list(existing_photos)
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_photo(f, 'event_photos')
            if url:
                new_photo_urls.append(url)
    remove_raw = (request.form or {}).get('remove_photos')
    if remove_raw:
        to_remove = json.loads(remove_raw)
        new_photo_urls = [p for p in new_photo_urls if p not in to_remove]
    event.event_photos = new_photo_urls[:MAX_PHOTOS]

    db.session.commit()
    log_activity(
        club_id=event.club_id,
        actor_id=user.id,
        action="EVENT_UPDATED",
        details=f"'{event.title}' updated"
    )
    db.session.commit()
    return jsonify(event.to_dict()), 200


@club_coordinator_bp.route('/events/<int:event_id>', methods=['DELETE'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def delete_event(event_id):
    user = get_current_coordinator()
    event = Event.query.get_or_404(event_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({'error': 'Unauthorized access to this event'}), 403
    title = event.title
    Registration.query.filter_by(event_id=event_id).delete()
    EventRegistration.query.filter_by(event_id=event_id).delete()
    TeamRegistration.query.filter_by(event_id=event_id).delete()
    db.session.delete(event)
    log_activity(
        club_id=event.club_id,
        actor_id=user.id,
        action="EVENT_DELETED",
        details=f"Event '{title}' deleted"
    )
    db.session.commit()
    return jsonify({'message': 'Event deleted'}), 200

@club_coordinator_bp.route('/events/<int:event_id>/accept-offer', methods=['PUT'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def accept_event_offer(event_id):
    user = get_current_coordinator()
    event = Event.query.get_or_404(event_id)
    
    club = get_managed_club(user, club_id=event.club_id)
    if not club:
        return jsonify({"message": "Unauthorized access to this club"}), 403
    if event.status != "PENDING_CLUB_ACCEPTANCE":
        return jsonify({"message": "No pending offer for this event"}), 400
    
    event.status = "UPCOMING"
    db.session.commit()
    
    # Notify college admin
    if event.created_by:
        from app import create_notification
        create_notification(
            user_id=event.created_by,
            title="✅ Club Offer Accepted",
            message=f"'{event.club.name}' has accepted your offer to host '{event.title}'.",
            type_="OFFER_ACCEPTED",
            link="/college-admin/events"
        )
    
    return jsonify({"message": "Event accepted!", "event": event.to_dict()}), 200


@club_coordinator_bp.route('/events/<int:event_id>/registrants', methods=['GET'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_registrants(event_id):
    user = get_current_coordinator()
    event = Event.query.get_or_404(event_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({'error': 'Unauthorized access to this event'}), 403

    regs = EventRegistration.query.filter_by(event_id=event_id).filter(
        EventRegistration.status.in_(["VERIFIED"])
    ).all()
    result = []
    for r in regs:
        result.append({
            'name': r.student.name if r.student else 'Unknown',
            'email': r.student.email if r.student else None,
            'phone': getattr(r.student, 'phone', None),
            'registeredAt': r.registered_at.isoformat() if r.registered_at else None,
        })
    return jsonify(result), 200

@club_coordinator_bp.route('/registrations', methods=['GET'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_registrations():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
    
    # Get all registrations for club events
    regs = EventRegistration.query.join(Event).filter(
        Event.club_id == club.id,
        EventRegistration.status.in_(["VERIFIED"])
    ).order_by(EventRegistration.registered_at.desc()).all()
    
    result = []
    for r in regs:
        result.append({
            'studentName': r.student.name if r.student else 'Unknown',
            'studentEmail': r.student.email if r.student else None,
            'studentPhone': getattr(r.student, 'phone', None),
            'eventTitle': r.event.title if r.event else 'Unknown Event',
            'eventDate': r.event.event_date.isoformat() if (r.event and r.event.event_date) else None,
            'registeredAt': r.registered_at.isoformat() if r.registered_at else None,
            'status': r.status,
            'eventId': r.event_id
        })
    return jsonify(result), 200

@club_coordinator_bp.route('/info', methods=['GET'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_club_info():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        # Fallback for coordinators
        if user.role == 'CLUB_COORDINATOR' and user.club_id:
            club = Club.query.get(user.club_id)
            
    if not club:
        return jsonify({'error': 'Club not found'}), 404
    return jsonify(club.to_dict()), 200

@club_coordinator_bp.route('/info', methods=['PUT'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def update_club_info():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
         if user.role == 'CLUB_COORDINATOR' and user.club_id:
            club = Club.query.get(user.club_id)
            
    if not club:
        return jsonify({'error': 'Club not found'}), 404

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    if data.get('description') is not None:
        club.description = data.get('description', club.description)
    if data.get('instagram') is not None:
        club.instagram = data.get('instagram').strip() or None

    if 'cover' in request.files:
        from utils.file_upload import save_file as _save
        cover_url = _save(request.files['cover'], 'covers')
        if cover_url:
            club.cover_url = cover_url

    # Handle club photos
    existing_photos = club.club_photos or []
    new_photo_urls = list(existing_photos)
    for i in range(MAX_PHOTOS):
        f = request.files.get(f'photo_{i}')
        if f and f.filename:
            url = save_photo(f, 'club_photos')
            if url:
                new_photo_urls.append(url)
    remove_raw = (request.form or {}).get('remove_photos')
    if remove_raw:
        to_remove = json.loads(remove_raw)
        new_photo_urls = [p for p in new_photo_urls if p not in to_remove]
    club.club_photos = new_photo_urls[:MAX_PHOTOS]

    db.session.commit()
    return jsonify({'message': 'Club info updated', 'club': club.to_dict()}), 200
from utils.file_upload import save_file
import json

@club_coordinator_bp.route('/gallery', methods=['POST'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def upload_gallery():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404

    photo = request.files.get('photo')
    if not photo:
        return jsonify({'message': 'No photo provided'}), 400

    photo_url = save_file(photo, 'gallery')

    existing = json.loads(club.gallery or '[]')
    existing.append(photo_url)
    club.gallery = json.dumps(existing)
    db.session.commit()

    return jsonify({'message': 'Photo uploaded', 'url': photo_url, 'gallery': existing})

@club_coordinator_bp.route('/gallery', methods=['GET'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_gallery():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
    return jsonify({'gallery': json.loads(club.gallery or '[]')})

@club_coordinator_bp.route('/gallery/<int:photo_index>', methods=['DELETE'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def delete_gallery_photo(photo_index):
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404

    existing = json.loads(club.gallery or '[]')
    if photo_index < 0 or photo_index >= len(existing):
        return jsonify({'error': 'Invalid photo index'}), 400

    removed = existing.pop(photo_index)
    club.gallery = json.dumps(existing)
    db.session.commit()

    return jsonify({'message': 'Photo removed', 'removed': removed, 'gallery': existing})


@club_coordinator_bp.route('/events/<int:event_id>/registrations', methods=['GET'])
@jwt_required()
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_event_individual_regs(event_id):
    try:
        user = get_current_coordinator()
        event = Event.query.get_or_404(event_id)
        
        # Check authorization
        is_authorized = False
        if user.role == 'CLUB_COORDINATOR' and event.club_id == user.club_id:
            is_authorized = True
        elif user.role == 'COLLEGE_ADMIN' and event.college_id == user.college_id:
            is_authorized = True
            
        if not is_authorized:
            return jsonify({"message": "Unauthorized"}), 403

        regs = EventRegistration.query.filter_by(event_id=event_id).all()
        result = []
        return jsonify({"registrations": [r.to_dict() for r in regs]}), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@club_coordinator_bp.route('/events/<int:event_id>/teams', methods=['GET'])
@jwt_required()
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_event_teams(event_id):
    try:
        user = get_current_coordinator()
        event = Event.query.get_or_404(event_id)
        
        # Check authorization
        is_authorized = False
        if user.role == 'CLUB_COORDINATOR' and event.club_id == user.club_id:
            is_authorized = True
        elif user.role == 'COLLEGE_ADMIN' and event.college_id == user.college_id:
            is_authorized = True
            
        if not is_authorized:
            return jsonify({"message": "Unauthorized"}), 403

        teams = TeamRegistration.query.filter_by(event_id=event_id).all()
        return jsonify({
            "teams": [t.to_dict() for t in teams]
        }), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@club_coordinator_bp.route("/registrations/<int:reg_id>/verify", methods=["PUT"])
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def verify_registration(reg_id):
    user = get_current_coordinator()
    reg = EventRegistration.query.get_or_404(reg_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and reg.event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and reg.event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({"message": "Unauthorized"}), 403
        
    reg.status = "VERIFIED"
    reg.verified_at = datetime.utcnow()
    reg.verified_by = user.id
    
    log_activity(
        club_id=reg.event.club_id, # Use event's club_id for logging
        actor_id=user.id,
        action="REG_VERIFIED",
        details=f"Registration for '{reg.event.title}' by {reg.student.name} verified"
    )
    
    db.session.commit()
    return jsonify({"message": "Registration verified successfully", "registration": reg.to_dict()}), 200

@club_coordinator_bp.route("/registrations/<int:reg_id>/reject", methods=["PUT"])
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def reject_registration(reg_id):
    user = get_current_coordinator()
    reg = EventRegistration.query.get_or_404(reg_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and reg.event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and reg.event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({"message": "Unauthorized"}), 403
        
    reason = request.json.get("reason", "Payment verification failed")
    reg.status = "REJECTED"
    reg.rejection_reason = reason
    
    log_activity(
        club_id=reg.event.club_id, # Use event's club_id for logging
        actor_id=user.id,
        action="REG_REJECTED",
        details=f"Registration for '{reg.event.title}' by {reg.student.name} rejected. Reason: {reason}"
    )
    
    db.session.commit()
    return jsonify({"message": "Registration rejected", "registration": reg.to_dict()}), 200

@club_coordinator_bp.route("/registrations/<int:reg_id>", methods=["DELETE"])
@jwt_required()
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def delete_registration(reg_id):
    user = get_current_coordinator()
    reg = EventRegistration.query.get_or_404(reg_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and reg.event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and reg.event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({"message": "Unauthorized"}), 403
    
    log_activity(
        club_id=reg.event.club_id, # Use event's club_id for logging
        actor_id=user.id,
        action="REG_DELETED",
        details=f"Registration for '{reg.event.title}' by {reg.student.name} deleted"
    )
    
    db.session.delete(reg)
    db.session.commit()
    return jsonify({"message": "Registration deleted"}), 200

@club_coordinator_bp.route("/events/<int:event_id>/reset-all", methods=["DELETE"])
@jwt_required()
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def reset_all_registrations(event_id):
    user = get_current_coordinator()
    event = Event.query.get_or_404(event_id)
    
    # Check authorization
    is_authorized = False
    if user.role == 'CLUB_COORDINATOR' and event.club_id == user.club_id:
        is_authorized = True
    elif user.role == 'COLLEGE_ADMIN' and event.college_id == user.college_id:
        is_authorized = True
        
    if not is_authorized:
        return jsonify({"message": "Unauthorized"}), 403
    EventRegistration.query.filter_by(event_id=event_id).delete()
    db.session.commit()
    return jsonify({"message": "All registrations reset"}), 200


@club_coordinator_bp.route('/all-registrations', methods=['GET'])
@jwt_required()
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def get_all_registrations():
    user = request.user
    club_id = request.args.get('club_id')
    
    # COLLEGE_ADMIN "God Mode": If no club_id is provided, show all registrations for their college
    if user.role == 'COLLEGE_ADMIN' and not club_id:
        regs = EventRegistration.query.join(Event).filter(
            Event.college_id == user.college_id
        ).order_by(EventRegistration.registered_at.desc()).all()
        
        team_regs = TeamRegistration.query.join(Event).filter(
            Event.college_id == user.college_id
        ).order_by(TeamRegistration.created_at.desc()).all()
        
        return jsonify({
            "individuals": [r.to_dict() for r in regs],
            "teams": [t.to_dict() for t in team_regs]
        }), 200

    # Normal single-club behavior
    club = get_managed_club(user, club_id)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
        
    club_id = club.id
    # Get all registrations for club's events
    regs = EventRegistration.query.join(Event).filter(
        Event.club_id == club_id
    ).order_by(EventRegistration.registered_at.desc()).all()
    
    # 2. Get Team Registrations
    team_regs = TeamRegistration.query.join(Event).filter(
        Event.club_id == club_id
    ).order_by(TeamRegistration.created_at.desc()).all()
    
    return jsonify({
        "individuals": [r.to_dict() for r in regs],
        "teams": [t.to_dict() for t in team_regs]
    }), 200

# --- CLUB STATS ---
@club_coordinator_bp.route("/stats", methods=["GET"])
@jwt_required()
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def get_club_stats():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
    
    club_id = club.id
    
    total_events = Event.query.filter_by(club_id=club_id).count()
    
    # Individual registrations
    individual_count = EventRegistration.query.join(Event).filter(
        Event.club_id == club_id,
        EventRegistration.team_name == None
    ).count()

    # Team registrations as units
    team_count = TeamRegistration.query.join(Event).filter(
        Event.club_id == club_id,
        TeamRegistration.status == "COMPLETED"
    ).count()

    total_regs = individual_count + team_count
    total_members = ClubMembership.query.filter_by(club_id=club_id).count()

    upcoming_count = Event.query.filter_by(club_id=club_id, status='UPCOMING').count()
    ongoing_count = Event.query.filter_by(club_id=club_id, status='ONGOING').count()
    completed_count = Event.query.filter_by(club_id=club_id, status='COMPLETED').count()

    # Registrations by event (for charts)
    events = Event.query.filter_by(club_id=club_id).order_by(Event.created_at.desc()).limit(10).all()
    chart_data = []
    for e in events:
        # For charts, maybe just count all rows or units? Let's count units.
        ind_c = EventRegistration.query.filter_by(event_id=e.id, team_name=None).count()
        team_c = TeamRegistration.query.filter_by(event_id=e.id, status="COMPLETED").count()
        chart_data.append({"name": e.title[:20], "count": ind_c + team_c})

    broadcasts_count = BroadcastMessage.query.filter_by(club_id=club_id).count()

    return jsonify({
        "eventsCount": total_events,
        "registrationsCount": total_regs,
        "individualRegistrations": individual_count,
        "teamRegistrations": team_count,
        "membersCount": total_members,
        "broadcastsCount": broadcasts_count,
        "upcomingCount": upcoming_count,
        "ongoingCount": ongoing_count,
        "completedCount": completed_count,
        "chartData": chart_data
    }), 200

# --- MEMBERSHIP MANAGEMENT ---
@club_coordinator_bp.route("/members", methods=["GET"])
@jwt_required()
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def get_club_members():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404
        
    members = ClubRole.query.filter_by(club_id=club.id).all()
    return jsonify([m.to_dict() for m in members]), 200


# --- TEAM VERIFICATION ---

@club_coordinator_bp.route("/team-leader/<int:team_id>/verify", methods=["PUT"])
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def verify_team_leader(team_id):
    user = get_current_coordinator()
    team = TeamRegistration.query.get_or_404(team_id)
    
    # Authorize: Get the club management context
    club = get_managed_club(user, club_id=team.event.club_id)
    if not club:
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

@club_coordinator_bp.route("/team-leader/<int:team_id>/reject", methods=["PUT"])
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def reject_team_leader(team_id):
    user = get_current_coordinator()
    team = TeamRegistration.query.get_or_404(team_id)
    
    club = get_managed_club(user, club_id=team.event.club_id)
    if not club:
        return jsonify({"message": "Unauthorized"}), 403
        
    team.leader_payment_status = "UNPAID"
    team.leader_payment_ref = None
    team.leader_payment_screenshot = None
    db.session.commit()
    return jsonify({"message": "Leader payment rejected", "team": team.to_dict()}), 200

@club_coordinator_bp.route("/team-member/<int:member_id>/verify", methods=["PUT"])
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def verify_team_member(member_id):
    user = get_current_coordinator()
    member = TeamMember.query.get_or_404(member_id)
    team = member.team
    
    club = get_managed_club(user, club_id=team.event.club_id)
    if not club:
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

@club_coordinator_bp.route("/team-member/<int:member_id>/reject", methods=["PUT"])
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def reject_team_member(member_id):
    user = get_current_coordinator()
    member = TeamMember.query.get_or_404(member_id)
    
    club = get_managed_club(user, club_id=member.team.event.club_id)
    if not club:
        return jsonify({"message": "Unauthorized"}), 403
        
    member.payment_status = "UNPAID"
    member.payment_ref = None
    db.session.commit()
    return jsonify({"message": "Member payment rejected"}), 200

# --- ROLES & BROADCASTS ---

@club_coordinator_bp.route("/roles/assign", methods=["POST"])
@jwt_required()
def assign_club_role():
    try:
        identity = get_jwt_identity()
        identity_user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        
        # Determine club_id context
        r_club_id = request.get_json().get('club_id') or identity_user.club_id
        club = get_managed_club(identity_user, club_id=r_club_id)
        if not club:
            return jsonify({"message": "Unauthorized access to club"}), 403
        
        club_id = club.id
        
        data = request.get_json()
        student_id = data.get("studentId")
        role = data.get("role")

        club = Club.query.get(club_id)
        student = User.query.get(student_id)

        if not club:
            return jsonify({"message": "Club not found"}), 404
        if not student:
            return jsonify({"message": "Student not found"}), 404

        # Block self-assignment
        if student_id == identity_user.id:
            return jsonify({
                "message": "You cannot assign a role to yourself."
            }), 400

        # BLOCK: student must be from the same college as the club
        if student.college_id != club.college_id:
            return jsonify({
                "message": "Student must be from your own college."
            }), 400

        # BLOCK: student can only be a coordinator for ONE club
        if role == 'STUDENT_COORDINATOR':
            other_coord = ClubRole.query.filter_by(
                user_id=student.id, role='STUDENT_COORDINATOR'
            ).filter(ClubRole.club_id != club_id).first()
            if other_coord:
                return jsonify({
                    "message": f"{student.name} is already a Student Coordinator for '{other_coord.club.name}'. A student can only coordinate one club."
                }), 400

        if role not in ("STUDENT_COORDINATOR", "VOLUNTEER"):
            return jsonify({
                "message": "Invalid role. Must be STUDENT_COORDINATOR or VOLUNTEER"
            }), 400

        if student.role != "STUDENT":
            return jsonify({
                "message": "Only students can be assigned roles"
            }), 400

        if role == "STUDENT_COORDINATOR":
            # Check if student is already an SC in ANY club
            any_sc = ClubRole.query.filter_by(
                user_id=student_id,
                role="STUDENT_COORDINATOR"
            ).first()
            if any_sc:
                other_club = Club.query.get(any_sc.club_id)
                return jsonify({
                    "message": f"Student is already a Coordinator for '{other_club.name if other_club else 'another club'}'. A student can only coordinate one club at a time."
                }), 400

            # Check existing role in THIS club
            existing = ClubRole.query.filter_by(
                user_id=student_id,
                club_id=club_id
            ).first()
            if existing:
                return jsonify({
                    "message": f"Student already has a role in this club as {existing.role.replace('_',' ').title()}"
                }), 400

            count = ClubRole.query.filter_by(
                club_id=club_id,
                role="STUDENT_COORDINATOR"
            ).count()
            if count >= 3:
                return jsonify({
                    "message": "Maximum 3 student coordinators per club"
                }), 400
        else:
            # For VOLUNTEER, only check if already has a role in THIS club
            existing = ClubRole.query.filter_by(
                user_id=student_id,
                club_id=club_id
            ).first()
            if existing:
                return jsonify({
                    "message": f"Student already has a role in this club as {existing.role.replace('_',' ').title()}"
                }), 400

        club_role = ClubRole(
            user_id     = student_id,
            club_id     = club_id,
            role        = role,
            assigned_by = identity_user.id
        )
        db.session.add(club_role)

        club_obj = Club.query.get(club_id)
        notif = Notification(
            user_id = student_id,
            title   = f"New Role: {role.replace('_',' ').title()} 🎉",
            message = f"You have been assigned as {'Student Coordinator' if role == 'STUDENT_COORDINATOR' else 'Volunteer'} for {club_obj.name}!",
            type    = "ROLE_ASSIGNED",
            link    = "/student/profile"
        )
        db.session.add(notif)
        log_activity(
            club_id=club_id,
            college_id=club_obj.college_id,
            actor_id=identity_user.id,
            action="ROLE_ASSIGNED",
            details=f"{student.name} → {role.replace('_',' ').title()}"
        )
        db.session.commit()

        return jsonify({
            "message": f"Student assigned as {role.replace('_',' ').title()}",
            "clubRole": club_role.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@club_coordinator_bp.route("/roles/<int:role_id>", methods=["DELETE"])
@jwt_required()
def remove_club_role(role_id):
    identity = get_jwt_identity()
    user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
    
    cr = ClubRole.query.get_or_404(role_id)
    club = get_managed_club(user, club_id=cr.club_id)
    if not club:
        return jsonify({"message":"Unauthorized"}),403
    
    club_id = club.id
    
    student_id = cr.user_id
    role_name = cr.role.replace('_', ' ').title()
    club = Club.query.get(club_id)

    # Send notification before deleting
    notif = Notification(
        user_id = student_id,
        title   = f"Role Removed: {role_name}",
        message = f"You are no longer a {role_name} for {club.name}.",
        type    = "ROLE_REMOVED",
        link    = "/student/profile"
    )
    db.session.add(notif)
    
    db.session.delete(cr)
    db.session.commit()
    return jsonify({"message":"Role removed"}), 200

@club_coordinator_bp.route("/roles", methods=["GET"])
@jwt_required()
def get_club_roles():
    try:
        identity = get_jwt_identity()
        identity_user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        club = get_managed_club(identity_user)
        if not club:
            return jsonify({"roles": [], "error": "Unauthorized"}), 403
        club_id = club.id
        
        # Get all roles for this club
        roles = ClubRole.query.filter_by(club_id=club_id).all()
        return jsonify({
            "roles": [r.to_dict() for r in roles]
        }), 200
    except Exception as e:
        return jsonify({"roles": [], "error": "An internal server error occurred"}), 200

@club_coordinator_bp.route("/broadcasts", methods=["GET"])
@jwt_required()
def get_broadcasts():
    try:
        identity = get_jwt_identity()
        identity_user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        club = get_managed_club(identity_user)
        if not club:
            return jsonify({"broadcasts": [], "error": "Unauthorized"}), 403
        
        club_id = club.id

        # Get all broadcasts for this club
        msgs = BroadcastMessage.query.filter_by(club_id=club_id).order_by(BroadcastMessage.created_at.desc()).all()
        return jsonify({
            "broadcasts": [m.to_dict() for m in msgs]
        }), 200
    except Exception as e:
        return jsonify({"broadcasts": [], "error": "An internal server error occurred"}), 200

@club_coordinator_bp.route("/broadcast", methods=["POST"])
@jwt_required()
def send_broadcast():
    identity = get_jwt_identity()
    identity_user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
    club = get_managed_club(identity_user)
    if not club:
        return jsonify({"message": "Unauthorized"}), 403
        
    club_id = club.id
    user_id = identity_user.id
    
    data = request.get_json()
    message = (data.get("message") or "").strip()
    audience = data.get("audience", "ALL")
    # audience values: "ALL" | "COORDINATORS" | "VOLUNTEERS"

    if not message:
        return jsonify({"message":"Message cannot be empty"}),400

    # Get recipients based on audience
    if audience == "ALL":
        receivers = ClubRole.query.filter_by(
            club_id=club_id
        ).filter(ClubRole.role.in_(
            ["STUDENT_COORDINATOR", "VOLUNTEER", "MEMBER"]
        )).all()
    elif audience == "REGISTRANTS":
        # Get unique user IDs of everyone who registered for any event of this club
        reg_users = User.query.join(Registration).join(Event).filter(
            Event.club_id == club_id
        ).with_entities(User.id).distinct().all()
        # Map to common structure for notification loop
        receivers = [type('Recipient', (), {'user_id': u.id}) for u in reg_users]
    elif audience == "COORDINATORS":
        receivers = ClubRole.query.filter_by(
            club_id=club_id, role="STUDENT_COORDINATOR"
        ).all()
    elif audience == "VOLUNTEERS":
        receivers = ClubRole.query.filter_by(
            club_id=club_id, role="VOLUNTEER"
        ).all()
    else:
        receivers = []

    bcast = BroadcastMessage(
        club_id   = club_id,
        sender_id = user_id,
        message   = message
    )
    db.session.add(bcast)
    db.session.flush()

    club = Club.query.get(club_id)

    for r in receivers:
        notif = Notification(
            user_id = r.user_id,
            title   = f"📢 Message from {club.name}",
            message = message,
            type    = "BROADCAST",
            link    = "/student/notifications",
            is_read = False
        )
        db.session.add(notif)

    log_activity(
        club_id=club_id,
        actor_id=user_id,
        action="BROADCAST_SENT",
        details=f"To: {audience} — {message[:50]}"
    )
    db.session.commit()
    return jsonify({
        "message": f"Broadcast sent to {len(receivers)} users"
    }), 201




@club_coordinator_bp.route("/search-student", methods=["GET"])
@jwt_required()
@role_required("CLUB_COORDINATOR", "COLLEGE_ADMIN")
def search_student():
    try:
        identity = get_jwt_identity()
        identity_user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        club = get_managed_club(identity_user)
        if not club:
            return jsonify({"student": None, "message": "Unauthorized"}), 403
            
        club_id = club.id
        q = request.args.get("q", "").strip()

        if not q:
            return jsonify({
                "student": None,
                "message": "Enter email or student ID"
            }), 200

        club = Club.query.get(club_id)

        # Try to find by email (case-insensitive)
        student = User.query.filter(
            User.role == "STUDENT",
            User.email.ilike(q)
        ).first()

        # If not found by email, try by ID
        if not student and q.isdigit():
            student = User.query.filter_by(
                id=int(q),
                role="STUDENT"
            ).first()

        # If not found by exact email, try partial match
        if not student:
            student = User.query.filter(
                User.role == "STUDENT",
                db.or_(
                    User.email.ilike(f"%{q}%"),
                    User.name.ilike(f"%{q}%")
                )
            ).first()

        if not student:
            return jsonify({
                "student": None,
                "message": f"No student found with '{q}'. "
                           f"Make sure they are registered "
                           f"on the platform."
            }), 404

        same_college = (
            student.college_id == club.college_id
            if club else False
        )

        return jsonify({
            "student": {
                "id":        student.id,
                "name":      student.name,
                "email":     student.email,
                "collegeId": student.college_id,
            },
            "sameCollege": same_college,
            "message": None
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@club_coordinator_bp.route("/members/add", methods=["POST"])
@jwt_required()
def add_member_by_email():
    try:
        identity = get_jwt_identity()
        identity_user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        club = get_managed_club(identity_user)
        if not club:
            return jsonify({"message": "Unauthorized"}), 403
            
        club_id = club.id
        user_id = identity_user.id
        
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        
        student = User.query.filter_by(email=email).first()
        if not student:
            return jsonify({"message": "Student not found"}), 404
            
        if student.college_id != club.college_id:
            return jsonify({"message": f"Student must be from the same college ({club.college.name})."}), 403
            
        # Default to Volunteer if no role specified
        role = data.get("role", "VOLUNTEER")
        
        existing = ClubRole.query.filter_by(user_id=student.id, club_id=club_id).first()
        if existing:
            return jsonify({"message": "Student is already a member"}), 400
            
        new_role = ClubRole(
            user_id=student.id,
            club_id=club_id,
            role=role,
            assigned_by=user_id
        )
        db.session.add(new_role)
        
        log_activity(
            club_id=club_id,
            actor_id=user_id,
            action="MEMBER_ADDED",
            details=f"Added {student.name} as {role}"
        )
        db.session.commit()
        return jsonify({"message": "Member added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "An internal server error occurred"}), 500

@club_coordinator_bp.route("/members/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_member(user_id):
    identity = get_jwt_identity()
    me = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
    
    club = get_managed_club(me)
    if not club:
        return jsonify({"message": "Unauthorized"}), 403
        
    club_id = club.id
    me_id = me.id
    
    club = Club.query.get(club_id)
    
    # Send notification before deleting roles
    notif = Notification(
        user_id = user_id,
        title   = "Removed from Club",
        message = f"You have been removed from {club.name}.",
        type    = "MEMBER_REMOVED",
        link    = "/student/notifications"
    )
    db.session.add(notif)

    # Remove all roles for this user in this club
    ClubRole.query.filter_by(user_id=user_id, club_id=club_id).delete()
    
    log_activity(
        club_id=club_id,
        actor_id=me_id,
        action="MEMBER_REMOVED",
        details=f"User ID: {user_id}"
    )
    db.session.commit()
    return jsonify({"message": "Member removed from club"}), 200

@club_coordinator_bp.route("/categories", methods=["GET"])
@jwt_required()
def get_club_categories():
    try:
        identity = get_jwt_identity()
        user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        club = get_managed_club(user)

        if not club:
            return jsonify({
                "categories": [],
                "clubCategory": None
            }), 200

        # Return only the club's own category
        # Club coordinator can only create events in their category
        return jsonify({
            "categories": [club.category] if club.category else [],
            "clubCategory": club.category
        }), 200
    except Exception as e:
        return jsonify({"categories": []}), 500

@club_coordinator_bp.route("/categories", methods=["POST"])
@jwt_required()
def save_club_category():
    try:
        identity = get_jwt_identity()
        user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        club = get_managed_club(user)
        
        if not club:
            return jsonify({'error': 'Club not found or access denied'}), 404
            
        college = club.college
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
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(college, "custom_categories")
            db.session.commit()
            
        return jsonify({'categories': categories}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "categories": [],
            "clubCategory": None,
            "error": "An internal server error occurred"
        }), 200  # return 200 with empty so modal doesn't crash

@club_coordinator_bp.route('/fellow-coordinators', methods=['GET'])
@jwt_required()
def get_fellow_coordinators():
    """
    Returns all staff (CLUB_COORDINATOR role) users assigned to the same club
    as the logged-in coordinator. Also works for COLLEGE_ADMIN god-mode.
    """
    try:
        identity = get_jwt_identity()
        user = User.query.get(identity['id'] if isinstance(identity, dict) else identity)
        if not user:
            return jsonify([]), 200

        club = get_managed_club(user)
        if not club:
            # Fallback for coordinators
            if user.role == 'CLUB_COORDINATOR' and user.club_id:
                club = Club.query.get(user.club_id)
        
        if not club:
            return jsonify([]), 200

        club_id = club.id

        # Get all users with CLUB_COORDINATOR role who belong to this club
        from models import ClubCoordinator
        # Check ClubCoordinator table first (newer model)
        cc_entries = ClubCoordinator.query.filter_by(club_id=club_id).all()
        
        result = []
        seen_ids = set()

        for cc in cc_entries:
            u = cc.user
            if u and u.id not in seen_ids:
                seen_ids.add(u.id)
                result.append({
                    'id': u.id,
                    'name': u.name,
                    'email': u.email,
                    'profilePic': u.profile_pic,
                    'clubId': club_id,
                    'clubName': club.name,
                    'isPrimary': cc.is_primary,
                    'role': 'CLUB_COORDINATOR'
                })

        # Also include users with role=CLUB_COORDINATOR and club_id=this club
        coord_users = User.query.filter_by(role='CLUB_COORDINATOR', club_id=club_id).all()
        for u in coord_users:
            if u.id not in seen_ids:
                seen_ids.add(u.id)
                result.append({
                    'id': u.id,
                    'name': u.name,
                    'email': u.email,
                    'profilePic': u.profile_pic,
                    'clubId': club_id,
                    'clubName': club.name,
                    'isPrimary': (club.coordinator_id == u.id),
                    'role': 'CLUB_COORDINATOR'
                })

        return jsonify(result), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify([]), 200


@club_coordinator_bp.route('/branding', methods=['POST'])
@role_required('CLUB_COORDINATOR', 'COLLEGE_ADMIN')
def update_branding():
    user = get_current_coordinator()
    club = get_managed_club(user)
    if not club:
        return jsonify({'error': 'Club not found or access denied'}), 404

    logo = request.files.get('logo')
    cover = request.files.get('cover')

    if logo:
        logo_url = save_upload_file(logo, 'logos')
        if logo_url:
            club.logo_url = logo_url

    if cover:
        cover_url = save_upload_file(cover, 'covers')
        if cover_url:
            club.cover_url = cover_url

    db.session.commit()
    
    log_activity(
        club_id=club.id,
        actor_id=user.id,
        action="BRANDING_UPDATED",
        details="Club logo or cover photo updated"
    )
    db.session.commit()

    return jsonify({
        'message': 'Branding updated',
        'logoUrl': club.logo_url,
        'coverUrl': club.cover_url
    }), 200

