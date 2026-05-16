from flask import Blueprint, jsonify, request
from models import College, Club, Event, User
from datetime import date
from extensions import db
from sqlalchemy import or_, and_
from utils.event_utils import update_event_status_logic

public_bp = Blueprint('public', __name__)

def get_viewer_college_id():
    try:
        from middleware.auth_middleware import verify_firebase_token, resolve_user
        decoded = verify_firebase_token()
        user = resolve_user(decoded)
        return user.college_id if user else None
    except:
        return None

@public_bp.route('/colleges', methods=['GET'])
def get_colleges():
    try:
        limit = request.args.get('limit', type=int)
        query = College.query.filter(College.status.ilike('APPROVED'))
        if limit:
            query = query.limit(limit)
        colleges = query.all()
        return jsonify([c.to_dict() for c in colleges])
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f'COLLEGES ERROR: {e}\n{traceback_str}')
        return jsonify({
            'error': str(e),
            'traceback': traceback_str,
            'message': 'Internal Server Error'
        }), 500


@public_bp.route('/colleges/<int:college_id>', methods=['GET'])
def get_college(college_id):
    college = College.query.get_or_404(college_id)
    viewer_college_id = get_viewer_college_id()
    
    # Auto-update statuses on fetch
    raw_events = Event.query.filter(Event.college_id == college_id).all()
    for ev in raw_events:
        update_event_status_logic(ev)

    # Filter events based on status, scope and viewer's college
    all_events = Event.query.filter(
        Event.college_id == college_id,
        Event.status.in_(["UPCOMING", "ONGOING"])
    ).order_by(Event.event_date.asc()).all()
    
    all_past_events = Event.query.filter(
        Event.college_id == college_id,
        Event.status == "COMPLETED"
    ).order_by(Event.event_date.desc()).all()
    
    def filter_scope(events_list):
        filtered = []
        for e in events_list:
            if e.event_scope in ["INTER", None]:
                filtered.append(e.to_dict())
            elif e.event_scope == "INTRA" and e.college_id == viewer_college_id:
                filtered.append(e.to_dict())
        return filtered

    return jsonify({
        **college.to_dict(),
        "clubs": [c.to_dict() for c in college.clubs if c.status == 'APPROVED'],
        "events": filter_scope(all_events),
        "past_events": filter_scope(all_past_events)
    }), 200

@public_bp.route('/colleges/<int:college_id>/clubs', methods=['GET'])
def get_college_clubs(college_id):
    clubs = Club.query.filter_by(college_id=college_id, status='APPROVED').all()
    return jsonify([c.to_dict() for c in clubs]), 200

@public_bp.route('/clubs/<int:club_id>', methods=['GET'])
def get_club(club_id):
    from models import Registration
    club = Club.query.get_or_404(club_id)
    raw_events = Event.query.filter_by(club_id=club_id).all()
    for ev in raw_events:
        update_event_status_logic(ev)
    
    events = Event.query.filter(
        Event.club_id == club_id,
        Event.status.in_(["UPCOMING", "ONGOING"])
    ).order_by(Event.event_date.asc()).all()
    
    past_events = Event.query.filter(
        Event.club_id == club_id,
        Event.status == "COMPLETED"
    ).order_by(Event.event_date.desc()).all()

    coordinator = User.query.get(club.coordinator_id)
    return jsonify({
        **club.to_dict(),
        'events': [e.to_dict() for e in events],
        'past_events': [e.to_dict() for e in past_events],
        'coordinatorName': coordinator.name if coordinator else None,
        'coordinatorEmail': coordinator.email if coordinator else None,
        'collegeName': club.college.name if club.college else None,
        'collegeId': club.college_id,
        'memberCount': Registration.query.join(Event).filter(Event.club_id==club_id).distinct(Registration.user_id).count(),
        'eventCount': len(events)
    }), 200

@public_bp.route('/events', methods=['GET'])
def get_public_events():
    try:
        # Auto-update statuses on fetch
        all_active = Event.query.filter(Event.status.in_(["UPCOMING", "ONGOING"])).all()
        for ev in all_active:
            update_event_status_logic(ev)
            
        from sqlalchemy import or_
        events = Event.query.filter(
            Event.status.in_(["UPCOMING", "ONGOING"]),
            or_(
                Event.event_scope == "INTER",
                Event.event_scope == None
            )
        ).order_by(Event.event_date.asc()).all()

        return jsonify({
            "events": [e.to_dict() for e in events]
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "An internal server error occurred"}), 500

@public_bp.route('/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    event = Event.query.get_or_404(event_id)
    update_event_status_logic(event)
    return jsonify(event.to_dict()), 200

@public_bp.route('/stats', methods=['GET'])
def get_stats():
    try:
        total_colleges = College.query.filter_by(status='APPROVED').count()
        total_clubs = Club.query.filter_by(status='APPROVED').count()
        total_events = Event.query.filter_by(status='UPCOMING').count()
        total_students = User.query.filter_by(role='STUDENT').count()
        return jsonify({
            'totalColleges': total_colleges,
            'totalClubs': total_clubs,
            'totalEvents': total_events,
            'totalStudents': total_students
        })
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f'STATS ERROR: {e}\n{traceback_str}')
        return jsonify({
            'error': str(e),
            'traceback': traceback_str,
            'message': 'Internal Server Error'
        }), 500


@public_bp.route('/search', methods=['GET'])
def search():
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return jsonify({'colleges': [], 'events': [], 'clubs': []}), 200

    pattern = f'%{q}%'

    colleges = College.query.filter(
        College.status == 'APPROVED',
        College.name.ilike(pattern)
    ).limit(10).all()

    # Search should also only show INTER events for public as per prompt context
    events = Event.query.filter(
        Event.status.in_(['UPCOMING', 'ONGOING']),
        Event.event_scope == 'INTER',
        (Event.title.ilike(pattern) | Event.description.ilike(pattern) | Event.category.ilike(pattern))
    ).limit(10).all()

    clubs = Club.query.filter(
        Club.status == 'APPROVED',
        (Club.name.ilike(pattern) | Club.description.ilike(pattern) | Club.category.ilike(pattern))
    ).limit(10).all()

    return jsonify({
        'colleges': [c.to_dict() for c in colleges],
        'events': [e.to_dict() for e in events],
        'clubs': [c.to_dict() for c in clubs],
    }), 200
@public_bp.route("/clubs/<int:club_id>/stats",
                 methods=["GET"])
def get_club_stats_public(club_id):
    try:
        from models import ClubRole
        coords = ClubRole.query.filter_by(
            club_id=club_id,
            role="STUDENT_COORDINATOR"
        ).count()
        vols = ClubRole.query.filter_by(
            club_id=club_id,
            role="VOLUNTEER"
        ).count()
        return jsonify({
            "coordinators": coords,
            "volunteers":   vols
        }), 200
    except:
        return jsonify({"coordinators":0,"volunteers":0}),200

@public_bp.route("/clubs/<int:club_id>/coordinators", methods=["GET"])
def get_club_coordinators_public(club_id):
    try:
        from models import ClubCoordinator, ClubRole, User, Club
        club = Club.query.get(club_id)
        if not club:
            return jsonify([]), 404
            
        coordinators = []
        seen_user_ids = set()
        
        # 1. Staff Coordinators from ClubCoordinator table
        staff_coords = ClubCoordinator.query.filter_by(club_id=club_id).all()
        for sc in staff_coords:
            u = sc.user
            if u and u.id not in seen_user_ids:
                seen_user_ids.add(u.id)
                coordinators.append({
                    "name": u.name,
                    "email": u.email,
                    "role": "CLUB_COORDINATOR",
                    "isPrimary": sc.is_primary
                })
                
        # 2. Staff Coordinators from User table (Legacy/fallback support)
        legacy_staff = User.query.filter_by(role='CLUB_COORDINATOR', club_id=club_id).all()
        for u in legacy_staff:
            if u.id not in seen_user_ids:
                seen_user_ids.add(u.id)
                coordinators.append({
                    "name": u.name,
                    "email": u.email,
                    "role": "CLUB_COORDINATOR",
                    "isPrimary": (club.coordinator_id == u.id)
                })
                
        # 3. Student Coordinators from ClubRole table
        student_roles = ClubRole.query.filter_by(club_id=club_id, role="STUDENT_COORDINATOR").all()
        for sr in student_roles:
            u = sr.user
            if u and u.id not in seen_user_ids:
                seen_user_ids.add(u.id)
                coordinators.append({
                    "name": u.name,
                    "email": u.email,
                    "role": "STUDENT_COORDINATOR",
                    "isPrimary": False
                })
                
        # Sort so primary comes first, then other staff, then students
        def coord_sort_key(c):
            if c['isPrimary']: return 0
            if c['role'] == 'CLUB_COORDINATOR': return 1
            return 2
            
        coordinators.sort(key=coord_sort_key)
        
        return jsonify(coordinators), 200
        
    except Exception as e:
        print(f'COORDINATORS ERROR: {e}')
        return jsonify([]), 500

