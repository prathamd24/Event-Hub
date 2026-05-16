from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required, get_jwt_identity, role_required
from extensions import db
from models import User, Event, EventRegistration, Club, TeamRegistration, TeamMember, ClubRole, BroadcastMessage, College, Registration, Notification
from utils.event_utils import is_registration_open, update_event_status_logic
from datetime import date, datetime

student_bp = Blueprint('student', __name__)


def get_current_student():
    identity = get_jwt_identity()
    user_id = identity.get('userId') or identity.get('id') if isinstance(identity, dict) else identity
    return User.query.get(user_id)


@student_bp.route('/dashboard', methods=['GET'])
@role_required('STUDENT')
def get_dashboard():
    from models import Notification
    user = get_current_student()
    
    events_registered = EventRegistration.query.filter_by(student_id=user.id).filter(EventRegistration.status.in_(["PENDING", "VERIFIED"])).count()
    unread_notifs = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    
    today = date.today()
    upcoming_events = Event.query.filter(
        Event.college_id == user.college_id,
        Event.status.in_(['UPCOMING', 'ONGOING']),
        Event.event_date >= today
    ).count()

    # Get recent registrations
    recent_regs = EventRegistration.query.filter_by(
        student_id=user.id
    ).order_by(EventRegistration.registered_at.desc()).limit(5).all()

    # Get pending teams (where user is leader or member)
    # Teams user is leader of
    led_teams = TeamRegistration.query.filter_by(leader_id=user.id).filter(TeamRegistration.status != 'COMPLETED').all()
    # Teams user is member of
    member_of = TeamMember.query.filter_by(user_id=user.id).all()
    member_teams = [TeamRegistration.query.get(m.team_id) for m in member_of]
    member_teams = [t for t in member_teams if t and t.status != 'COMPLETED' and t.leader_id != user.id]
    
    pending_teams_data = []
    for t in (led_teams + member_teams):
        d = t.to_dict()
        d['isTeam'] = True
        d['isTeamPending'] = True
        pending_teams_data.append(d)

    # Get upcoming events in college
    upcoming_events_list = Event.query.filter(
        Event.college_id == user.college_id,
        Event.status.in_(['UPCOMING', 'ONGOING']),
        Event.event_date >= today
    ).order_by(Event.event_date.asc()).limit(5).all()
    
    for ev in upcoming_events_list:
        update_event_status_logic(ev)

    # Pre-calculate registered events to send a clean dict
    my_reg_event_ids = {r.event_id for r in EventRegistration.query.filter_by(student_id=user.id).all()}
    events_res = []
    for e in upcoming_events_list:
        d = e.to_dict()
        d['isRegistered'] = e.id in my_reg_event_ids
        events_res.append(d)

    return jsonify({
        'stats': {
            'eventsRegistered': events_registered,
            'upcomingEvents': upcoming_events,
            'unreadNotificationCount': unread_notifs
        },
        'registrations': [r.to_dict() for r in recent_regs] + pending_teams_data,
        'events': events_res
    }), 200


@student_bp.route("/events", methods=["GET"])
@jwt_required()
def get_events():
    try:
        user = request.user
        user_id = user.id
        college_id = user.college_id

        from sqlalchemy import or_

        base_filter = Event.status.in_(["UPCOMING", "ONGOING"])

        scope_filter = [Event.event_scope == "INTER", Event.event_scope == None]
        if college_id:
            scope_filter.append(Event.college_id == college_id)

        events = Event.query.filter(
            base_filter,
            or_(*scope_filter)
        ).order_by(Event.event_date.asc()).all()
        
        for ev in events:
            update_event_status_logic(ev)

        # Also mark which ones the student is registered for
        my_reg_event_ids = {
            r.event_id for r in EventRegistration.query.filter_by(
                student_id=user_id
            ).all()
        } if user_id else set()

        result = []
        for e in events:
            d = e.to_dict()
            d['isRegistered'] = e.id in my_reg_event_ids
            result.append(d)

        return jsonify(result), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500


@student_bp.route('/register-event', methods=['POST'])
@jwt_required()
def register_event():
    try:
        user = request.user
        if user.role != "STUDENT":
            return jsonify({"message": "Only students can register for events."}), 403
            
        user_id = user.id
        data = request.get_json()
        event_id = data.get("eventId")

        if not event_id:
            return jsonify({"message": "eventId required"}), 400

        event = Event.query.get_or_404(event_id)

        # Check already registered
        existing = EventRegistration.query.filter_by(
            student_id=user_id, event_id=event_id
        ).first()
        if existing:
            return jsonify({"message": "Already registered"}), 400

        # Use utility for all registration locks (deadline, status, capacity)
        is_open, reason = is_registration_open(event)
        if not is_open:
            return jsonify({"message": reason}), 400

        # Check registration deadline
        if getattr(event, "registration_deadline", None):
            from datetime import date
            if date.today() > event.registration_deadline:
                return jsonify({"message": "Registration is closed"}), 400

        reg = EventRegistration(
            student_id=user_id,
            event_id=event_id,
            status="VERIFIED" if event.registration_fee == 0 else "PENDING",
            payment_amount=event.registration_fee or 0
        )
        db.session.add(reg)
        db.session.commit()

        # Log activity if club event
        if event.club_id:
            from routes.club_coordinator import log_activity
            log_activity(
                club_id=event.club_id,
                actor_id=user_id,
                action="NEW_REGISTRATION",
                details=f"Student {user.name} registered for '{event.title}'"
            )
            db.session.commit()

        return jsonify({
            "message": "Registered successfully!",
            "registration": reg.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500


@student_bp.route('/registrations/<int:event_id>', methods=['DELETE'])
@role_required('STUDENT')
def cancel_registration(event_id):
    user = get_current_student()
    reg = EventRegistration.query.filter_by(student_id=user.id, event_id=event_id).first()
    if not reg:
        return jsonify({'error': 'Registration not found'}), 404

    event = Event.query.get(event_id)
    # Status handling depends on implementation, for now just delete or mark as CANCELLED if we add that status
    # But EventRegistration doesn't have a CANCELLED status in current logic, it's usually just removed or PENDING/VERIFIED
    # For now let's just delete it to match previous logic's intent of "cancelling"
    db.session.delete(reg)
    db.session.commit()
    return jsonify({'message': 'Registration cancelled'}), 200


@student_bp.route('/registrations', methods=['GET'])
@role_required('STUDENT')
def my_registrations():
    user = get_current_student()
    regs = EventRegistration.query.filter_by(
        student_id=user.id
    ).order_by(EventRegistration.registered_at.desc()).all()
    
    # Also include pending teams
    led_teams = TeamRegistration.query.filter_by(leader_id=user.id).filter(TeamRegistration.status != 'COMPLETED').all()
    member_of = TeamMember.query.filter_by(user_id=user.id).all()
    member_teams = [TeamRegistration.query.get(m.team_id) for m in member_of]
    member_teams = [t for t in member_teams if t and t.status != 'COMPLETED' and t.leader_id != user.id]
    
    pending_teams = []
    for t in (led_teams + member_teams):
        d = t.to_dict()
        d['isTeam'] = True
        d['isTeamPending'] = True
        pending_teams.append(d)
        
    return jsonify([r.to_dict() for r in regs] + pending_teams), 200


@student_bp.route("/my-events", methods=["GET"])
@jwt_required()
def get_my_events():
    try:
        identity = get_jwt_identity()
        user_id = identity.get("userId") or identity.get("id") if isinstance(identity, dict) else identity

        regs = EventRegistration.query.filter_by(
            student_id=user_id
        ).all()

        events = []
        registrations_data = []
        for r in regs:
            event = Event.query.get(r.event_id)
            if event:
                d = event.to_dict()
                d["registrationStatus"] = getattr(r, "status", "VERIFIED")
                d["registeredAt"] = (
                    r.registered_at.isoformat()
                    if getattr(r, "registered_at", None)
                    else r.created_at.isoformat()
                    if getattr(r, "created_at", None)
                    else None
                )
                events.append(d)
                
                # To support existing frontend parsing if it needs registrations array:
                reg_dict = r.to_dict()
                reg_dict['event'] = d
                registrations_data.append(reg_dict)

        return jsonify({"events": events, "registrations": registrations_data}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500


@student_bp.route('/notifications', methods=['GET'])
@role_required('STUDENT')
def get_notifications():
    from models import Notification
    user = get_current_student()
    notifs = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify([n.to_dict() for n in notifs]), 200


@student_bp.route('/notifications/mark-read', methods=['PUT'])
@role_required('STUDENT')
def mark_notifications_read():
    from models import Notification
    user = get_current_student()
    Notification.query.filter_by(user_id=user.id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({'message': 'Notifications marked as read'}), 200


@student_bp.route('/profile', methods=['GET'])
@role_required('STUDENT')
def get_profile():
    user = get_current_student()
    return jsonify(user.to_dict()), 200


import os
from utils.file_upload import save_file

@student_bp.route('/profile', methods=['PUT'])
@role_required('STUDENT')
def update_profile():
    user = get_current_student()
    
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form
        
    user.name = data.get('name', user.name)
    
    college_id = data.get('collegeId')
    college_name_manual = data.get('collegeNameManual')
    if college_id:
        user.college_id = college_id
        user.college_name_manual = None
    elif college_name_manual:
        user.college_id = None
        user.college_name_manual = college_name_manual
    
    if 'profilePic' in request.files:
        url = save_file(request.files['profilePic'], 'logos')
        if url:
            user.profile_pic = url

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict()}), 200

@student_bp.route("/my-roles", methods=["GET"])
@jwt_required()
def get_my_roles():
    identity = get_jwt_identity()
    user_id = identity.get("userId") or identity.get("id") if isinstance(identity, dict) else identity
    
    roles = ClubRole.query.filter_by(user_id=user_id).all()
    return jsonify({"roles": [r.to_dict() for r in roles]}), 200

@student_bp.route("/broadcasts", methods=["GET"])
@jwt_required()
def get_my_broadcasts():
    identity = get_jwt_identity()
    user_id = identity.get("userId") or identity.get("id") if isinstance(identity, dict) else identity
    
    my_roles = ClubRole.query.filter_by(user_id=user_id).all()
    club_ids = [r.club_id for r in my_roles]
    
    if not club_ids:
        return jsonify({"broadcasts": []}), 200
        
    msgs = BroadcastMessage.query.filter(
        BroadcastMessage.club_id.in_(club_ids)
    ).order_by(BroadcastMessage.created_at.desc()).limit(20).all()
    
    return jsonify({"broadcasts": [m.to_dict() for m in msgs]}), 200
