from flask import Blueprint, request, jsonify
from middleware.auth_middleware import get_jwt_identity, role_required
from extensions import db, bcrypt
from models import User, College, Club, Event, Registration

platform_admin_bp = Blueprint('platform_admin', __name__)

# Only this email may hold the PLATFORM_ADMIN role — enforced system-wide
PLATFORM_ADMIN_EMAIL = 'prathamkumarhr@gmail.com'


@platform_admin_bp.route('/stats', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_stats():
    print(">>> TRACE: get_stats started")
    try:
        total_colleges = College.query.count()
        print(f">>> TRACE: total_colleges={total_colleges}")
        pending_colleges = College.query.filter_by(status='PENDING').count()
        print(f">>> TRACE: pending_colleges={pending_colleges}")
        total_clubs = Club.query.count()
        print(f">>> TRACE: total_clubs={total_clubs}")
        total_events = Event.query.count()
        print(f">>> TRACE: total_events={total_events}")
        
        # Exclude platform admins from user counts
        total_users = User.query.filter(User.role != 'PLATFORM_ADMIN').count()
        print(f">>> TRACE: total_users={total_users}")
        active_users = User.query.filter(User.role != 'PLATFORM_ADMIN', User.is_active == True).count()
        print(f">>> TRACE: active_users={active_users}")
        
        # Check if Registration exists and is correct name
        print(">>> TRACE: querying Registration count")
        total_registrations = Registration.query.count()
        print(f">>> TRACE: total_registrations={total_registrations}")
        
        # Data for frontend charts
        roles_distribution = [
            {'name': 'Students', 'value': User.query.filter_by(role='STUDENT').count()},
            {'name': 'College Admins', 'value': User.query.filter_by(role='COLLEGE_ADMIN').count()},
            {'name': 'Club Coordinators', 'value': User.query.filter_by(role='CLUB_COORDINATOR').count()}
        ]
        
        events_distribution = [
            {'name': 'Upcoming', 'value': Event.query.filter_by(status='UPCOMING').count()},
            {'name': 'Ongoing', 'value': Event.query.filter_by(status='ONGOING').count()},
            {'name': 'Completed', 'value': Event.query.filter_by(status='COMPLETED').count()}
        ]

        print(">>> TRACE: get_stats SUCCESS")
        return jsonify({
            'totalColleges': total_colleges,
            'pendingColleges': pending_colleges,
            'totalClubs': total_clubs,
            'totalEvents': total_events,
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalRegistrations': total_registrations,
            'rolesDistribution': roles_distribution,
            'eventsDistribution': events_distribution
        }), 200
    except Exception as e:
        import traceback
        error_msg = f">>> TRACE ERROR in get_stats: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@platform_admin_bp.route('/colleges', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_colleges():
    print(">>> TRACE: get_colleges started")
    try:
        colleges = College.query.order_by(College.created_at.desc()).all()
        print(f">>> TRACE: colleges_count={len(colleges)}")
        result = []
        for c in colleges:
            print(f">>> TRACE: serializing college={c.name}")
            try:
                result.append(c.to_dict())
            except Exception as inner_e:
                print(f">>> TRACE: to_dict FAILED for college={c.name}: {str(inner_e)}")
                result.append({'id': c.id, 'name': c.name, 'status': c.status, 'error': str(inner_e)})
        
        print(">>> TRACE: get_colleges SUCCESS")
        return jsonify(result), 200
    except Exception as e:
        import traceback
        error_msg = f">>> TRACE ERROR in get_colleges: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500



@platform_admin_bp.route('/colleges', methods=['POST'])
@role_required('PLATFORM_ADMIN')
def create_college():
    data = request.get_json()
    college_name = data.get('collegeName', '').strip()
    location = data.get('location', '').strip()
    description = data.get('description', '')
    website = data.get('website', '')
    admin_name = data.get('adminName', '').strip()
    admin_email = data.get('adminEmail', '').strip().lower()
    admin_password = data.get('adminPassword', '')

    if not college_name or not admin_name or not admin_email or not admin_password:
        return jsonify({'error': 'College name, admin name, email, and password are required'}), 400

    if User.query.filter_by(email=admin_email).first():
        return jsonify({'error': 'Admin email already exists'}), 409

    hashed = bcrypt.generate_password_hash(admin_password).decode('utf-8')
    admin_user = User(
        name=admin_name,
        email=admin_email,
        password_hash=hashed,
        role='COLLEGE_ADMIN',
        is_active=True
    )
    db.session.add(admin_user)
    db.session.flush()

    college = College(
        name=college_name,
        location=location,
        description=description,
        website=website,
        affiliation=data.get('affiliation', '').strip() or None,
        type=data.get('type', '').strip() or None,
        established_year=int(data.get('establishedYear')) if data.get('establishedYear') else None,
        contact_email=data.get('contactEmail', '').strip() or None,
        phone=data.get('phone', '').strip() or None,
        naac_grade=data.get('naacGrade', '').strip() or None,
        instagram=data.get('instagram', '').strip() or None,
        linkedin=data.get('linkedin', '').strip() or None,
        twitter=data.get('twitter', '').strip() or None,
        facebook=data.get('facebook', '').strip() or None,
        admin_id=admin_user.id,
        status='APPROVED',
        is_verified=True
    )
    db.session.add(college)
    db.session.flush()

    admin_user.college_id = college.id
    db.session.commit()

    return jsonify({'message': 'College created', 'college': college.to_dict()}), 201

@platform_admin_bp.route('/colleges/<int:college_id>/approve', methods=['PUT'])
@role_required('PLATFORM_ADMIN')
def approve_college(college_id):
    college = College.query.get_or_404(college_id)
    college.status = 'APPROVED'
    college.is_verified = True
    
    # Link students who registered with this college name manually
    from sqlalchemy import func
    manual_students = User.query.filter(
        User.role == "STUDENT",
        User.college_id == None,
        User.college_name_manual.ilike(f"%{college.name}%")
    ).all()

    for student in manual_students:
        student.college_id = college.id
        student.college_name_manual = None # clean up
        
    db.session.commit()
    return jsonify({'message': 'College approved and students linked', 'college': college.to_dict()}), 200

@platform_admin_bp.route('/colleges/<int:college_id>/reject', methods=['PUT'])
@role_required('PLATFORM_ADMIN')
def reject_college(college_id):
    college = College.query.get_or_404(college_id)
    college.status = 'REJECTED'
    college.is_verified = False
    db.session.commit()
    return jsonify({'message': 'College rejected'}), 200

@platform_admin_bp.route('/colleges/<int:college_id>/suspend', methods=['PUT'])
@role_required('PLATFORM_ADMIN')
def suspend_college(college_id):
    college = College.query.get_or_404(college_id)
    college.status = 'SUSPENDED'
    if college.admin:
        college.admin.is_active = False
    db.session.commit()
    return jsonify({'message': 'College suspended', 'college': college.to_dict()}), 200

@platform_admin_bp.route('/pending-approvals', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_pending_approvals():
    pending_colleges = College.query.filter_by(status='PENDING').all()
    pending_clubs = Club.query.filter_by(status='PENDING').all()
    return jsonify({
        'pendingColleges': [c.to_dict() for c in pending_colleges],
        'pendingClubs': [c.to_dict() for c in pending_clubs],
    }), 200

@platform_admin_bp.route('/recent-activity', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_recent_activity():
    recent_colleges = College.query.filter(College.admin_id != None).order_by(College.created_at.desc()).limit(5).all()
    recent_events = Event.query.order_by(Event.created_at.desc()).limit(5).all()
    recent_users = User.query.filter_by(role='STUDENT').order_by(User.created_at.desc()).limit(5).all()

    activity = []
    for c in recent_colleges:
        activity.append({
            'type': 'college_created',
            'message': f'College "{c.name}" was added',
            'time': c.created_at.isoformat() if c.created_at else None,
        })
    for e in recent_events:
        activity.append({
            'type': 'event_created',
            'message': f'Event "{e.title}" was created',
            'time': e.created_at.isoformat() if e.created_at else None,
        })
    for u in recent_users:
        activity.append({
            'type': 'student_registered',
            'message': f'Student "{u.name}" registered',
            'time': u.created_at.isoformat() if u.created_at else None,
        })

    activity.sort(key=lambda x: x['time'] or '', reverse=True)
    return jsonify(activity[:20]), 200

@platform_admin_bp.route('/users', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_users():
    users = User.query.filter(User.role != 'PLATFORM_ADMIN').order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200

@platform_admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@role_required('PLATFORM_ADMIN')
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.role == 'PLATFORM_ADMIN':
        return jsonify({'error': 'Cannot delete platform admin'}), 403
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'}), 200

@platform_admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PUT'])
@role_required('PLATFORM_ADMIN')
def toggle_user_active(user_id):
    user = User.query.get_or_404(user_id)
    if user.role == 'PLATFORM_ADMIN':
        return jsonify({'error': 'Cannot deactivate platform admin'}), 403
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'message': 'User updated', 'is_active': user.is_active}), 200


@platform_admin_bp.route('/all-clubs', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_all_clubs():
    clubs = Club.query.order_by(Club.created_at.desc()).all()
    result = []
    for club in clubs:
        d = club.to_dict()
        d['collegeName'] = club.college.name if club.college else None
        result.append(d)
    return jsonify(result), 200


@platform_admin_bp.route('/all-events', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_all_events():
    events = Event.query.order_by(Event.created_at.desc()).all()
    result = []
    for e in events:
        d = e.to_dict()
        d['collegeName'] = e.college.name if e.college else None
        d['clubName'] = e.club.name if e.club else None
        result.append(d)
    return jsonify(result), 200


@platform_admin_bp.route('/all-registrations', methods=['GET'])
@role_required('PLATFORM_ADMIN')
def get_all_registrations():
    total = Registration.query.count()
    confirmed = Registration.query.filter_by(status='CONFIRMED').count()
    recent = Registration.query.order_by(Registration.registered_at.desc()).limit(50).all()
    result = []
    for r in recent:
        result.append({
            'id': r.id,
            'studentName': r.user.name if r.user else 'Unknown',
            'studentEmail': r.user.email if r.user else None,
            'eventTitle': r.event.title if r.event else 'Unknown',
            'collegeName': r.event.college.name if r.event and r.event.college else None,
            'registeredAt': r.registered_at.isoformat() if r.registered_at else None,
            'status': r.status,
        })
    return jsonify({'total': total, 'confirmed': confirmed, 'recent': result}), 200


@platform_admin_bp.route('/nuke-test-data', methods=['POST'])
@role_required('PLATFORM_ADMIN')
def nuke_test_data():
    """
    DESTRUCTIVE: Wipes all data except the Platform Admin user.
    Requires confirmation key in the request body: { "confirm": "NUKE_ALL_DATA" }
    """
    data = request.get_json() or {}
    if data.get('confirm') != 'NUKE_ALL_DATA':
        return jsonify({'error': 'Confirmation key required. Send { "confirm": "NUKE_ALL_DATA" }'}), 400

    try:
        from models import (
            TeamMember, TeamRegistration, EventRegistration, Registration,
            Notification, ClubRole, ClubCoordinator, ClubMembership,
            BroadcastMessage, ActivityLog, Feedback, PlatformEvent,
            Event, Club, College, OTP
        )

        # Delete in dependency order (children before parents)
        TeamMember.query.delete()
        TeamRegistration.query.delete()
        EventRegistration.query.delete()
        Registration.query.delete()
        Notification.query.delete()
        ClubRole.query.delete()
        ClubCoordinator.query.delete()
        ClubMembership.query.delete()
        BroadcastMessage.query.delete()
        ActivityLog.query.delete()
        Feedback.query.delete()
        PlatformEvent.query.delete()
        OTP.query.delete()
        Event.query.delete()
        Club.query.delete()

        # Delete all colleges and non-admin users
        College.query.delete()
        
        # Keep only the designated Platform Admin
        # Keep designated Platform Admins
        admin_emails = ['prathamkumarhr@gmail.com', 'eit@gmail.com']
        User.query.filter(~User.email.in_(admin_emails)).delete(synchronize_session='fetch')


        db.session.commit()

        return jsonify({'message': 'All test data wiped. Only Platform Admin remains.'}), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
