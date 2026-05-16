from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required, get_jwt_identity
from datetime import datetime
import uuid

from models import (
    db, TeamRegistration, TeamMember,
    Event, User, Notification, EventRegistration
)
from utils.file_upload import save_file
from utils.event_utils import is_registration_open

team_bp = Blueprint('team_registration', __name__)

@team_bp.route('/team/<int:team_id>/status', methods=['GET'])
@jwt_required()
def get_team_status(team_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        team = TeamRegistration.query.get_or_404(team_id)
        
        # Verify user is leader or member
        is_leader = team.leader_id == user_id
        member_rec = next((m for m in team.members if m.user_id == user_id), None)
        if not member_rec and user:
            member_rec = next((m for m in team.members if m.invited_email == user.email.lower()), None)
            
        if not is_leader and not member_rec:
            return jsonify({"message": "You are not authorized to view this team"}), 403
            
        event = team.event
        team_dict = team.to_dict()
        
        # Enrich with extra details for the unified modal
        team_dict.update({
            "eventTitle":      event.title,
            "eventDate":       event.event_date.isoformat() if event.event_date else None,
            "registrationFee": event.registration_fee or 0,
            "upiId":           getattr(event, "upi_id",   None),
            "upiName":         getattr(event, "upi_name", None),
            "paymentQr":       getattr(event, "payment_qr", None),
            "isLeader":        is_leader
        })
        
        # Determine if current user needs to pay
        needs_to_pay = False
        if team.status in ['PENDING', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'COMPLETED']:
            if is_leader:
                needs_to_pay = team.leader_payment_status == 'UNPAID'
            else:
                needs_to_pay = member_rec and member_rec.payment_status == 'UNPAID'
        
        # Add payment references for confirmation
        team_dict["leaderPaymentRef"] = team.leader_payment_ref
        team_dict["leaderPaymentScreenshot"] = team.leader_payment_screenshot
        team_dict["leaderTransactionId"] = team.leader_payment_ref
        
        team_dict["memberPaymentRefs"] = []
        for m in team.members:
            if m.payment_screenshot:
                team_dict["memberPaymentRefs"].append({
                    "name": m.invited_name or (m.user.name if m.user else "Invited"),
                    "ref": m.payment_screenshot,
                    "tid": m.payment_ref
                })
        
        team_dict["needsToPay"] = needs_to_pay
        return jsonify({"team": team_dict}), 200
        
    except Exception as e:
        return jsonify({"message": "Error updating leader profile: An internal server error occurred"}), 500

# --- ADMIN RESET ROUTES ---

@team_bp.route("/teams/<int:team_id>", methods=["DELETE"])
@jwt_required()
def delete_team(team_id):
    user = request.user
    user_role = user.role
    
    if user_role not in ["CLUB_COORDINATOR", "COLLEGE_ADMIN", "PLATFORM_ADMIN"]:
        return jsonify({"message": "Unauthorized"}), 403
        
    team = TeamRegistration.query.get_or_404(team_id)
    
    # Also delete associated EventRegistration if it exists (for COMPLETED teams)
    reg = EventRegistration.query.filter_by(event_id=team.event_id, team_name=team.team_name).first()
    if reg:
        db.session.delete(reg)
        
    db.session.delete(team)
    db.session.commit()
    return jsonify({"message": "Team registration deleted successfully"}), 200

@team_bp.route("/events/<int:event_id>/reset-all-teams", methods=["DELETE"])
@jwt_required()
def reset_all_teams(event_id):
    user = request.user
    user_role = user.role
    
    if user_role not in ["CLUB_COORDINATOR", "COLLEGE_ADMIN", "PLATFORM_ADMIN"]:
        return jsonify({"message": "Unauthorized"}), 403
        
    teams = TeamRegistration.query.filter_by(event_id=event_id).all()
    for t in teams:
        # Delete associated EventRegistration
        reg = EventRegistration.query.filter_by(event_id=event_id, team_name=t.team_name).first()
        if reg:
            db.session.delete(reg)
        db.session.delete(t)
        
    db.session.commit()
    return jsonify({"message": "All team registrations reset successfully"}), 200

@team_bp.route('/team/my-teams', methods=['GET'])
@jwt_required()
def get_my_teams():
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"message": "User identity not found"}), 401

        # Teams where user is the leader
        led_teams = TeamRegistration.query.filter_by(
            leader_id=user_id
        ).all()

        # Teams where user is an invited member
        member_records = TeamMember.query.filter(
            TeamMember.user_id == user_id
        ).all()

        # Also match by email
        current_user = User.query.get(user_id)
        if current_user:
            email_records = TeamMember.query.filter_by(
                invited_email=current_user.email.lower()
            ).all()
            # Combine and de-duplicate member records
            member_records = list({
                m.id: m for m in member_records + email_records
            }.values())

        # Collect team ids from membership
        member_team_ids = [m.team_id for m in member_records]
        member_teams = []
        if member_team_ids:
            member_teams = TeamRegistration.query.filter(
                TeamRegistration.id.in_(member_team_ids),
                TeamRegistration.leader_id != user_id
            ).all()

        all_teams = led_teams + member_teams

        result = []
        for team in all_teams:
            event = Event.query.get(team.event_id)
            if not event: continue
            
            team_dict = team.to_dict()
            
            # Enrich with event details
            team_dict.update({
                "eventTitle":      event.title,
                "eventDate":       event.event_date.isoformat() if event.event_date else None,
                "registrationFee": event.registration_fee or 0,
                "upiId":           getattr(event, "upi_id",   None),
                "upiName":         getattr(event, "upi_name", None),
                "paymentQr":       getattr(event, "payment_qr", None),
                "isLeader":        team.leader_id == user_id,
            })
            
            # Determine if current user needs to pay
            needs_to_pay = False
            if team.status in ['AWAITING_PAYMENT', 'PARTIALLY_PAID']:
                if team.leader_id == user_id:
                    needs_to_pay = team.leader_payment_status == 'UNPAID'
                else:
                    member_rec = next((m for m in team.members if m.user_id == user_id), None)
                    if not member_rec: # check by email if user_id not linked yet
                        member_rec = next((m for m in team.members if m.invited_email == current_user.email.lower()), None)
                    needs_to_pay = member_rec and member_rec.payment_status == 'UNPAID'
            
            team_dict["needsToPay"] = needs_to_pay
            result.append(team_dict)

        return jsonify({"teams": result}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Team fetch error: An internal server error occurred"}), 500

@team_bp.route('/team/create', methods=['POST'])
@jwt_required()
def create_team():
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"message": "User identity not found"}), 401
            
        data      = request.get_json()
        event_id  = data.get("eventId")
        team_name = data.get("teamName", "").strip()
        members   = data.get("members", [])

        if not event_id:
            return jsonify({"message": "eventId is required"}), 400
        if not team_name:
            return jsonify({"message": "teamName is required"}), 400

        event = Event.query.get(event_id)
        if not event:
            return jsonify({"message": "Event not found"}), 404

        leader = User.query.get(user_id)
        if not leader:
            return jsonify({"message": "User not found"}), 404
            
        if leader.role != "STUDENT":
            return jsonify({"message": "Only students can register teams."}), 403

        # Registration locks (deadline, status, capacity)
        is_open, reason = is_registration_open(event)
        if not is_open:
            return jsonify({"message": reason}), 400

        # Check team size
        total_size = len(members) + 1  # +1 for leader
        min_size = getattr(event, "min_team_size", 2) or 2
        max_size = getattr(event, "max_team_size", 10) or 10

        if total_size < min_size:
            return jsonify({
                "message": f"Need at least {min_size} total members (including you)"
            }), 400
        if total_size > max_size:
            return jsonify({
                "message": f"Max team size is {max_size}"
            }), 400

        # Check leader not already in a team for this event
        existing = TeamRegistration.query.filter_by(
            event_id=event_id,
            leader_id=user_id
        ).first()
        if existing:
            return jsonify({
                "message": "You already have a team for this event"
            }), 400

        # Intra-college validation
        if event.event_scope == 'INTRA':
            leader_college = leader.college_id
            for m in members:
                m_email = (m.get("email") or "").strip().lower()
                m_user = User.query.filter_by(email=m_email).first()
                if m_user and m_user.college_id != leader_college:
                    return jsonify({
                        "message": f"Member {m_user.name} ({m_email}) belongs to a different college. External students cannot join intra-college teams."
                    }), 400

        # Create team
        fee = event.registration_fee or 0
        team = TeamRegistration(
            event_id  = event_id,
            team_name = team_name,
            leader_id = user_id,
            status    = "PENDING",
            payment_status = "UNPAID" if fee > 0 else "FREE",
            leader_payment_status = "UNPAID" if fee > 0 else "FREE"
        )
        db.session.add(team)
        db.session.flush()

        # Add members
        for m in members:
            email = (m.get("email") or "").strip().lower()
            name  = (m.get("name")  or "").strip()

            if not email:
                continue

            # Look up user by email
            invited_user = User.query.filter_by(email=email).first()

            member = TeamMember(
                team_id       = team.id,
                user_id       = invited_user.id if invited_user else None,
                invited_email = email,
                invited_name  = name or (
                    invited_user.name if invited_user else None
                ),
                status        = "PENDING",
                payment_status = "UNPAID" if fee > 0 else "FREE"
            )
            db.session.add(member)

            # Send notification if user exists
            if invited_user:
                try:
                    notif = Notification(
                        user_id = invited_user.id,
                        title   = "Team Invite 🎯",
                        message = (
                            f"{leader.name} invited you to join "
                            f"team '{team_name}' for '{event.title}'"
                        ),
                        type    = "TEAM_INVITE",
                        link    = "/student/invites",
                        is_read = False
                    )
                    db.session.add(notif)
                except Exception as notif_err:
                    print(f"Notification error: {notif_err}")

        db.session.commit()

        return jsonify({
            "message": "Team created! Invitations sent.",
            "team": team.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Team creation error: An internal server error occurred"}), 500

@team_bp.route('/team/invites', methods=['GET'])
@jwt_required()
def get_invites():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        invites = TeamMember.query.filter(
            db.or_(
                TeamMember.user_id == user_id,
                TeamMember.invited_email == user.email.lower()
            ),
            TeamMember.status == 'PENDING'
        ).all()
        
        results = []
        for invite in invites:
            team = invite.team
            event = team.event
            results.append({
                "memberId": invite.id,
                "teamId": team.id,
                "teamName": team.team_name,
                "eventId": event.id,
                "eventTitle": event.title,
                "eventDate": event.event_date.isoformat() if event.event_date else None,
                "leaderName": team.leader.name,
                "leaderEmail": team.leader.email,
                "status": invite.status
            })
        
        return jsonify({"invites": results}), 200
    except Exception as e:
        return jsonify({"message": "An internal server error occurred"}), 500

@team_bp.route('/team/invites/<int:member_id>/respond', methods=['PUT'])
@jwt_required()
def respond_to_invite(member_id):
    try:
        data = request.get_json()
        action = data.get('action') # ACCEPT or DECLINE
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        member = TeamMember.query.get_or_404(member_id)
        
        # Verify current user matches this invite
        if member.user_id != user_id and member.invited_email != user.email.lower():
            return jsonify({"message": "Unauthorized"}), 403
            
        if action == 'DECLINE':
            member.status = 'DECLINED'
            member.responded_at = datetime.utcnow()
            
            # Notify leader
            notif = Notification(
                user_id=member.team.leader_id,
                title="Invite Declined ❌",
                message=f"{user.name} declined your invite for team '{member.team.team_name}'",
                type="TEAM_INVITE_DECLINED",
                link="/student/my-teams"
            )
            db.session.add(notif)
            db.session.commit()
            return jsonify({"message": "Invitation declined"}), 200
        
        elif action == 'ACCEPT':
            member.status = 'ACCEPTED'
            member.responded_at = datetime.utcnow()
            member.user_id = user_id
            
            team = member.team
            event = team.event
            
            # Check if ALL members accepted
            all_accepted = all(m.status == 'ACCEPTED' for m in team.members)
            
            if all_accepted:
                fee = event.registration_fee or 0
                if fee == 0:
                    team.status = 'COMPLETED'
                    team.payment_status = 'FREE'
                    # All members and leader are FREE
                    team.leader_payment_status = 'FREE'
                    for m in team.members:
                        m.payment_status = 'FREE'
                        
                    # CREATE OFFICIAL REGISTRATIONS
                    create_official_team_registrations(team)
                        
                    # Notify leader
                    notif = Notification(
                        user_id=team.leader_id,
                        title="Team Registered! 🎉",
                        message=f"All members joined! Your team '{team.team_name}' is registered for '{event.title}'.",
                        type="TEAM_REGISTERED",
                        link="/student/my-teams"
                    )
                    db.session.add(notif)
                else:
                    team.status = 'AWAITING_PAYMENT'
                    # Notify all members that payment is now required
                    notif_users = [team.leader_id] + [m.user_id for m in team.members if m.user_id]
                    for uid in set(notif_users):
                        notif = Notification(
                            user_id=uid,
                            title="Team Ready for Payment 💸",
                            message=f"Everyone joined team '{team.team_name}'! Please complete your individual payment.",
                            type="TEAM_AWAITING_PAYMENT",
                            link="/student/my-teams"
                        )
                        db.session.add(notif)
            
            db.session.commit()
            return jsonify({"message": "Invitation accepted", "teamStatus": team.status}), 200
        
        return jsonify({"message": "Invalid action"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "An internal server error occurred"}), 500

@team_bp.route('/team/<int:team_id>/confirm-payment', methods=['POST'])
@jwt_required()
def confirm_team_payment(team_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        team = TeamRegistration.query.get_or_404(team_id)
        
        # Verify user is part of the team
        is_leader = team.leader_id == user_id
        member_rec = None
        if not is_leader:
            member_rec = next((m for m in team.members if m.user_id == user_id), None)
            if not member_rec:
                member_rec = next((m for m in team.members if m.invited_email == user.email.lower()), None)
            
            if not member_rec:
                return jsonify({"message": "You are not a member of this team"}), 403
            
        if team.status not in ['PENDING', 'AWAITING_PAYMENT', 'PARTIALLY_PAID']:
            if team.status == 'COMPLETED':
                return jsonify({"message": "Registration is already complete"}), 400
            return jsonify({"message": f"Cannot pay at this stage (Status: {team.status})"}), 400
            
        # HANDLE DUAL VERIFICATION (SCREENSHOT + REF NO)
        if 'screenshot' not in request.files:
            return jsonify({"message": "Payment screenshot is required"}), 400
        
        payment_ref = request.form.get('paymentRef')
        if not payment_ref:
            return jsonify({"message": "Transaction Reference Number is required"}), 400
        
        file = request.files['screenshot']
        payment_url = save_file(file, 'payments')
        
        if not payment_url:
            return jsonify({"message": "Invalid file type. Please upload an image."}), 400
        
        if is_leader:
            team.leader_payment_status = 'PENDING'
            team.leader_payment_ref = payment_ref
            team.leader_payment_screenshot = payment_url
        elif member_rec:
            member_rec.payment_status = 'PENDING'
            member_rec.payment_ref = payment_ref
            member_rec.payment_screenshot = payment_url
            member_rec.paid_at = datetime.utcnow()
            
        # Update team overall status
        team.status = 'PARTIALLY_PAID'
        
        # Check if EVERYONE (leader + all members) has paid
        leader_paid = (team.leader_payment_status in ['PAID', 'FREE'])
        members_paid = all(m.payment_status in ['PAID', 'FREE'] for m in team.members)
        
        if leader_paid and members_paid:
            team.status = 'COMPLETED'
            team.payment_status = 'PAID'
            
            # CREATE OFFICIAL REGISTRATIONS
            create_official_team_registrations(team)
            
            # Notify everyone of success
            notif_users = [team.leader_id] + [m.user_id for m in team.members if m.user_id]
            for uid in set(notif_users):
                notif = Notification(
                    user_id = uid,
                    title   = f"Registration Successful! 🎉",
                    message = f"Everyone has paid for team '{team.team_name}'. You are now registered for '{team.event.title}'!",
                    type    = "TEAM_REGISTERED",
                    link    = "/student/my-teams"
                )
                db.session.add(notif)
        
        db.session.commit()
        return jsonify({
            "message": "Payment reference submitted!",
            "team": team.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Payment error: An internal server error occurred"}), 500
def create_official_team_registrations(team):
    """Creates EventRegistration records for all team members when team is COMPLETED."""
    try:
        event = team.event
        # 1. Leader Registration
        existing_leader = EventRegistration.query.filter_by(
            event_id=team.event_id, 
            student_id=team.leader_id
        ).first()
        
        if not existing_leader:
            leader_reg = EventRegistration(
                event_id=team.event_id,
                student_id=team.leader_id,
                status='VERIFIED', # Always confirmed at this stage
                payment_amount=event.registration_fee,
                team_name=team.team_name,
                team_members=[{"name": m.invited_name, "email": m.invited_email} for m in team.members]
            )
            db.session.add(leader_reg)
            # Update event count
            event.current_registrations = (event.current_registrations or 0) + 1
        else:
            # Sync status if already exists
            if existing_leader.status == 'PENDING':
                existing_leader.status = 'VERIFIED'
            
        # 2. Member Registrations
        for member in team.members:
            if not member.user_id:
                continue # Skip if user not registered yet
                
            existing_member = EventRegistration.query.filter_by(
                event_id=team.event_id,
                student_id=member.user_id
            ).first()
            
            if not existing_member:
                member_reg = EventRegistration(
                    event_id=team.event_id,
                    student_id=member.user_id,
                    status='VERIFIED', # Always confirmed at this stage
                    payment_amount=event.registration_fee,
                    team_name=team.team_name,
                    team_members=[{"name": team.leader.name, "email": team.leader.email}] + 
                                 [{"name": m.invited_name, "email": m.invited_email} for m in team.members if m.id != member.id]
                )
                db.session.add(member_reg)
                # Update event count
                event.current_registrations = (event.current_registrations or 0) + 1
            else:
                # Sync status if already exists
                if existing_member.status == 'PENDING':
                    existing_member.status = 'VERIFIED'
                
        db.session.flush()
    except Exception as e:
        print(f"Error creating official registrations: {e}")
        # Don't raise, just log
