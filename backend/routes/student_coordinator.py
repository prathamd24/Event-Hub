from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required
from models import db, User, Club, Event, EventRegistration, TeamRegistration, ClubRole, Notification, BroadcastMessage, ActivityLog
import json
from utils.event_utils import update_event_status_logic
from datetime import datetime

sc_bp = Blueprint("student_coordinator", __name__)

# Helper to get club_id for current user
def get_sc_club_id(user_id):
    role = ClubRole.query.filter_by(
        user_id=user_id,
        role="STUDENT_COORDINATOR"
    ).first()
    return role.club_id if role else None

@sc_bp.route("/my-club", methods=["GET"])
@jwt_required()
def get_my_club():
    try:
        user    = request.user
        user_id = user.id

        role = ClubRole.query.filter_by(
            user_id=user_id,
            role="STUDENT_COORDINATOR"
        ).first()

        if not role:
            return jsonify({"club": None}), 200

        club = Club.query.get(role.club_id)
        return jsonify({
            "club": club.to_dict() if club else None,
            "roleId": role.id
        }), 200

    except Exception as e:
        return jsonify({"club": None}), 200

@sc_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def sc_dashboard():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    if not club_id:
        return jsonify({"events":[]}), 403
    events = Event.query.filter_by(club_id=club_id).order_by(Event.event_date.asc()).all()
    for ev in events:
        update_event_status_logic(ev)
    return jsonify({"events": [e.to_dict() for e in events]}), 200

@sc_bp.route("/events", methods=["GET"])
@jwt_required()
def sc_get_events():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    if not club_id:
        return jsonify([]), 200
    events = Event.query.filter_by(club_id=club_id).order_by(Event.event_date.desc()).all()
    for ev in events:
        update_event_status_logic(ev)
    return jsonify([e.to_dict() for e in events]), 200

@sc_bp.route("/volunteers", methods=["GET"])
@jwt_required()
def get_volunteers():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    if not club_id:
        return jsonify({"roles":[]}), 200
    roles = ClubRole.query.filter_by(
        club_id=club_id, role="VOLUNTEER"
    ).all()
    return jsonify({"roles":[r.to_dict() for r in roles]}),200

@sc_bp.route("/coordinators", methods=["GET"])
@jwt_required()
def get_coordinators():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    if not club_id:
        return jsonify({"roles":[]}), 200
    roles = ClubRole.query.filter_by(
        club_id=club_id, role="STUDENT_COORDINATOR"
    ).all()
    return jsonify({"roles":[r.to_dict() for r in roles]}),200

@sc_bp.route("/broadcasts", methods=["GET"])
@jwt_required()
def get_sc_broadcasts():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    if not club_id:
        return jsonify({"broadcasts":[]}), 200
    msgs = BroadcastMessage.query.filter_by(
        club_id=club_id
    ).order_by(BroadcastMessage.created_at.desc()
    ).limit(30).all()
    return jsonify({"broadcasts":[m.to_dict() for m in msgs]}),200

@sc_bp.route("/broadcast", methods=["POST"])
@jwt_required()
def sc_send_broadcast():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    if not club_id:
        return jsonify({"message":"Not a coordinator"}),403
    data    = request.get_json()
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"message":"Message required"}),400
    # Save broadcast
    bcast = BroadcastMessage(
        club_id=club_id, sender_id=user_id, message=message
    )
    db.session.add(bcast)
    db.session.flush()
    # Notify volunteers only
    volunteers = ClubRole.query.filter_by(
        club_id=club_id, role="VOLUNTEER"
    ).all()
    club   = Club.query.get(club_id)
    sender = User.query.get(user_id)
    for v in volunteers:
        n = Notification(
            user_id=v.user_id,
            title=f"📢 {club.name}",
            message=message,
            type="BROADCAST",
            link="/student/notifications",
            is_read=False
        )
        db.session.add(n)
    db.session.commit()
    return jsonify({"message":
        f"Sent to {len(volunteers)} volunteers"}), 201

@sc_bp.route("/assign-volunteer", methods=["POST"])
@jwt_required()
def sc_assign_volunteer():
    user_id    = request.user.id
    club_id    = get_sc_club_id(user_id)
    if not club_id:
        return jsonify({"message":"Not a coordinator"}),403
    data       = request.get_json()
    student_id = data.get("studentId")
    student    = User.query.get_or_404(student_id)
    
    # Block self-assignment
    if student_id == user_id:
        return jsonify({
            "message": "You cannot assign yourself as a volunteer."
        }), 400

    club       = Club.query.get(club_id)
    # Same college check
    if student.college_id != club.college_id:
        return jsonify({"message":
            "Student is from a different college"}),400
    existing = ClubRole.query.filter_by(
        user_id=student_id, club_id=club_id
    ).first()
    if existing:
        return jsonify({"message":
            "Student already has a role in this club"}),400
    role = ClubRole(
        user_id=student_id, club_id=club_id,
        role="VOLUNTEER", assigned_by=user_id
    )
    db.session.add(role)
    db.session.commit()
    return jsonify({"message":"Volunteer assigned!"}), 201

@sc_bp.route("/search-student", methods=["GET"])
@jwt_required()
def sc_search_student():
    user_id  = request.user.id
    club_id  = get_sc_club_id(user_id)
    q        = request.args.get("q","").strip()
    
    if not q:
        return jsonify({"student":None}), 200
        
    club = Club.query.get(club_id)
    if not club:
        return jsonify({"message": "Club not found or you are not a coordinator"}), 404

    # Search for student
    student = User.query.filter(
        User.role=="STUDENT",
        db.or_(
            User.email.ilike(q),
            User.email.ilike(f"%{q}%"),
            User.name.ilike(f"%{q}%")
        )
    ).first()
    
    if not student and q.isdigit():
        try:
            student = User.query.filter_by(id=int(q), role="STUDENT").first()
        except: pass

    if not student:
        return jsonify({"student": None, "message": f"No student found matching '{q}'"}), 404

    # College Check
    if student.college_id != club.college_id:
        from models import College
        student_college = College.query.get(student.college_id)
        club_college = College.query.get(club.college_id)
        
        msg = f"Student {student.name} belongs to {student_college.name if student_college else 'another college'}. You can only assign volunteers from {club_college.name if club_college else 'your own college'}."
        print(f"COLLEGE MISMATCH: SC {user_id} tried to search {student.id}. {student.college_id} != {club.college_id}")
        return jsonify({"student": None, "message": msg}), 400

    return jsonify({
        "student": {
            "id": student.id, 
            "name": student.name,
            "email": student.email,
            "college": getattr(student.college, 'name', 'Your College')
        }
    }), 200

@sc_bp.route("/events/<int:event_id>/registrations",
             methods=["GET"])
@jwt_required()
def sc_event_registrations(event_id):
    try:
        user_id  = request.user.id
        club_id  = get_sc_club_id(user_id)
        if not club_id:
            return jsonify({"message":"Not a coordinator"}),403
        from models import Event, EventRegistration, TeamRegistration, User
        event = Event.query.get_or_404(event_id)
        if event.club_id != club_id:
            return jsonify({"message":"Unauthorized"}),403
        regs = EventRegistration.query.filter_by(event_id=event_id).all()
        teams = TeamRegistration.query.filter_by(event_id=event_id).all()

        # Create a lookup for team status
        team_status_map = {t.team_name.lower(): t.status for t in teams}

        result = []
        for r in regs:
            s = User.query.get(r.student_id)
            if s:
                # If the individual registration is PENDING but belongs to a COMPLETED team,
                # we show it as VERIFIED to the coordinator.
                current_status = getattr(r, "status", "PENDING")
                t_name = getattr(r, "team_name", None)
                if current_status == "PENDING" and t_name:
                    if team_status_map.get(t_name.lower()) == "COMPLETED":
                        current_status = "VERIFIED"

                result.append({
                    "id":           r.id,
                    "studentName":  s.name,
                    "studentEmail": s.email,
                    "status":       current_status,
                    "teamName":     t_name,
                    "registeredAt": r.registered_at.isoformat() if r.registered_at else None
                })

        return jsonify({
            "registrations": result,
            "teams": [t.to_dict() for t in teams]
        }), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500
