from flask import Blueprint, jsonify, request
from middleware.auth_middleware import jwt_required, get_jwt_identity
from models import Event, EventRegistration, User
from utils.logging_utils import log_activity
from extensions import db
from datetime import datetime, date
import os
import uuid
import json

registration_bp = Blueprint('registration', __name__)

@registration_bp.route("/student/events/<int:event_id>/register", methods=["POST"])
@jwt_required()
def register_for_event(event_id):
    try:
        # 1. Identity Check
        user = getattr(request, 'user', None)
        if not user:
            return jsonify({"message": "User not authenticated"}), 401
        student_id = user.id
        
        # 2. Event Check
        event = Event.query.get(event_id)
        if not event:
            return jsonify({"message": "Event not found"}), 404

        from utils.event_utils import update_event_status_logic
        update_event_status_logic(event)

        # 3. Status/Deadline Checks
        if event.status != "UPCOMING":
            return jsonify({"message": f"Registration is closed. Event is {event.status.lower()}"}), 400

        if getattr(event, 'registration_deadline', None):
            if date.today() > event.registration_deadline:
                return jsonify({"message": "Registration deadline passed"}), 400

        # 4. Limit Checks
        part_type = getattr(event, 'participation_type', getattr(event, 'registration_type', 'INDIVIDUAL'))
        if part_type == 'TEAM':
            if event.max_teams:
                team_count = EventRegistration.query.filter(
                    EventRegistration.event_id == event_id,
                    EventRegistration.status.in_(["PENDING", "VERIFIED"])
                ).count()
                if team_count >= event.max_teams:
                    return jsonify({"message": "Event has reached maximum team limit"}), 400
        else:
            if event.max_participants:
                count = EventRegistration.query.filter(
                    EventRegistration.event_id == event_id,
                    EventRegistration.status.in_(["PENDING", "VERIFIED"])
                ).count()
                if count >= event.max_participants:
                    return jsonify({"message": "Event is fully booked"}), 400

        # 5. Duplicate Check
        existing = EventRegistration.query.filter_by(
            event_id=event_id, student_id=student_id
        ).first()
        if existing:
            return jsonify({
                "message": "Already registered",
                "registration": existing.to_dict()
            }), 409

        # 6. Registration Logic
        fee = getattr(event, 'registration_fee', 0) or 0
        if fee == 0:
            reg = EventRegistration(
                event_id=event_id,
                student_id=student_id,
                status="VERIFIED",  # Auto-confirmed for free events
                payment_amount=0,
                team_name=(request.json or {}).get('teamName'),
                team_members=(request.json or {}).get('teamMembers', [])
            )
            db.session.add(reg)
            
            log_activity(
                club_id=event.club_id,
                college_id=event.college_id,
                actor_id=student_id,
                action="NEW_REGISTRATION",
                details=f"{user.name} registered for '{event.title}' (Free)"
            )
            
            db.session.commit()
            return jsonify({
                "message": "Successfully registered!",
                "registration": reg.to_dict()
            }), 201

        # PAID event
        return jsonify({
            "message": "This is a paid event. Please complete payment.",
            "requiresPayment": True,
            "fee": fee,
            "upiId": getattr(event, 'upi_id', None)
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"CRITICAL REGISTRATION ERROR: {error_trace}")
        return jsonify({
            "message": "Registration failed due to server error",
            "error": "An internal server error occurred",
            "debug_trace": error_trace
        }), 500

@registration_bp.route("/student/events/<int:event_id>/submit-payment", methods=["POST"])
@jwt_required()
def submit_payment(event_id):
    identity = get_jwt_identity()
    student_id = identity.get("userId") or identity.get("id") if isinstance(identity, dict) else identity

    event = Event.query.get_or_404(event_id)

    if event.registration_fee == 0:
        return jsonify({"message": "Free event — no payment needed"}), 400

    # Check not already registered
    existing = EventRegistration.query.filter_by(
        event_id=event_id, student_id=student_id
    ).first()
    if existing:
        return jsonify({
            "message": "Already submitted",
            "registration": existing.to_dict()
        }), 409

    screenshot = request.files.get("screenshot")
    if not screenshot or not screenshot.filename:
        return jsonify({"message": "Payment screenshot is required"}), 400

    # Validate file type
    allowed = {"jpg", "jpeg", "png", "webp"}
    ext = screenshot.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        return jsonify({"message": "Only JPG, PNG, WEBP images allowed"}), 400

    # Save screenshot
    screenshot.seek(0, 2)
    size = screenshot.tell()
    screenshot.seek(0)
    if size > 5 * 1024 * 1024:
        return jsonify({"message": "Screenshot must be under 5MB"}), 400

    filename = f"{uuid.uuid4().hex}.{ext}"
    folder = os.path.join("uploads", "payment_screenshots")
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, filename)
    screenshot.save(filepath)
    url = f"/uploads/payment_screenshots/{filename}"

    reg = EventRegistration(
        event_id=event_id,
        student_id=student_id,
        status="PENDING",  # Requires admin verification
        payment_screenshot_url=url,
        payment_amount=event.registration_fee,
        payment_ref=request.form.get('paymentRef'),
        team_name=request.form.get('teamName'),
        team_members=json.loads(request.form.get('teamMembers', '[]'))
    )
    db.session.add(reg)

    log_activity(
        club_id=event.club_id,
        college_id=event.college_id,
        actor_id=student_id,
        action="NEW_REGISTRATION",
        details=f"{getattr(request, 'user', User.query.get(student_id)).name} submitted payment for '{event.title}'"
    )

    db.session.commit()

    return jsonify({
        "message": "Payment submitted and registration confirmed!",
        "registration": reg.to_dict()
    }), 201

@registration_bp.route("/my-registrations", methods=["GET"])
@jwt_required()
def get_my_registrations():
    user = request.user
    student_id = user.id

    registrations = EventRegistration.query.filter_by(
        student_id=student_id
    ).order_by(EventRegistration.registered_at.desc()).all()

    return jsonify({
        "registrations": [r.to_dict() for r in registrations]
    }), 200

# --- ADMIN RESET ROUTES ---

@registration_bp.route("/registrations/<int:reg_id>", methods=["DELETE"])
@jwt_required()
def delete_registration(reg_id):
    # Only Admin or Coordinator of the club can delete
    identity = get_jwt_identity()
    user_role = identity.get("role")
    
    reg = EventRegistration.query.get_or_404(reg_id)
    
    # Simple check: Only Coordinators or Platform/College Admins
    if user_role not in ["CLUB_COORDINATOR", "COLLEGE_ADMIN", "PLATFORM_ADMIN"]:
        return jsonify({"message": "Unauthorized"}), 403
        
    db.session.delete(reg)
    db.session.commit()
    return jsonify({"message": "Registration deleted successfully"}), 200

@registration_bp.route("/events/<int:event_id>/reset-all", methods=["DELETE"])
@jwt_required()
def reset_all_registrations(event_id):
    identity = get_jwt_identity()
    user_role = identity.get("role")
    
    if user_role not in ["CLUB_COORDINATOR", "COLLEGE_ADMIN", "PLATFORM_ADMIN"]:
        return jsonify({"message": "Unauthorized"}), 403
        
    EventRegistration.query.filter_by(event_id=event_id).delete()
    db.session.commit()
    return jsonify({"message": "All registrations reset successfully"}), 200
