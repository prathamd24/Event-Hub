from datetime import date, datetime, time
from extensions import db

def update_event_status_logic(event):
    """
    Updates the event status based on current date and time.
    UPCOMING: event_date > today OR (event_date == today AND current_time < start_time)
    ONGOING: (event_date <= today <= end_date) and not yet finished
    COMPLETED: today > end_date OR (today == end_date AND current_time > end_time)
    """
    if not event.event_date:
        return event.status

    now = datetime.now()
    today = now.date()
    current_time = now.time()
    
    original_status = event.status
    new_status = original_status

    # If status is CANCELLED, don't auto-update it
    if original_status == 'CANCELLED':
        return original_status

    start_date = event.event_date
    end_date = event.end_date or start_date

    # 1. Check COMPLETED
    if today > end_date:
        new_status = 'COMPLETED'
    elif today == end_date:
        if event.end_time:
            try:
                # Parse "HH:MM"
                h, m = map(int, event.end_time.split(':'))
                e_time = time(h, m)
                if current_time > e_time:
                    new_status = 'COMPLETED'
                else:
                    new_status = 'ONGOING' # It's end_date and before end_time
            except:
                new_status = 'ONGOING' if today >= start_date else 'UPCOMING'
        else:
            # If no end_time on end_date, we keep it ONGOING until the day ends
            new_status = 'ONGOING' if today >= start_date else 'UPCOMING'
    
    # 2. Check UPCOMING vs ONGOING if not already COMPLETED
    if new_status != 'COMPLETED':
        if today < start_date:
            new_status = 'UPCOMING'
        elif today == start_date:
            if event.start_time:
                try:
                    h, m = map(int, event.start_time.split(':'))
                    s_time = time(h, m)
                    if current_time >= s_time:
                        new_status = 'ONGOING'
                    else:
                        new_status = 'UPCOMING'
                except:
                    new_status = 'ONGOING'
            else:
                new_status = 'ONGOING'
        elif start_date < today < end_date:
            # Middle of a multi-day event
            new_status = 'ONGOING'
        else:
            # This covers edges where today == end_date but we already handled it.
            # But let's be safe.
            new_status = 'ONGOING'

    if new_status != original_status:
        try:
            event.status = new_status
            db.session.commit()
        except:
            db.session.rollback()
    
    return new_status

def calculate_duration(event):
    """
    Calculates duration in hours.
    If multi-day, it considers the full days + start/end times.
    Returns: float (hours) or None if insufficient info.
    """
    if not event.event_date or not event.start_time:
        return None
    
    try:
        start_dt = datetime.combine(event.event_date, datetime.strptime(event.start_time, "%H:%M").time())
        
        end_date = event.end_date or event.event_date
        if event.end_time:
            end_dt = datetime.combine(end_date, datetime.strptime(event.end_time, "%H:%M").time())
        else:
            # If no end time, we can't accurately calculate duration
            return None
        
        diff = end_dt - start_dt
        hours = diff.total_seconds() / 3600
        return round(hours, 1) if hours > 0 else 0
    except:
        return None

def is_registration_open(event):
    """
    Checks if registration is allowed for the event.
    Blocked if:
    - Today > registration_deadline
    - Event status is ONGOING or COMPLETED
    - Current registrations >= max_participants (unless unlimited)
    """
    today = date.today()
    
    if event.registration_deadline and today > event.registration_deadline:
        return False, "Registration deadline has passed."
    
    # Auto-update status before check
    status = update_event_status_logic(event)
    
    if status in ['ONGOING', 'COMPLETED']:
        return False, f"Registration is closed. Event is {status.lower()}."
    
    if event.max_participants and event.current_registrations >= event.max_participants:
        return False, "Event is at full capacity."
        
    return True, "Open"

def notify_event_organizers(event_id, title, message, link="/club-coordinator/events"):
    """
    Notifies all coordinators for the club organizing the event, 
    or all college admins if organized by college.
    """
    try:
        from models import Event, User, Notification
        from extensions import db
        
        event = Event.query.get(event_id)
        if not event: return
        
        organizers = []
        if getattr(event, 'organized_by', '') == 'CLUB' and event.club_id:
            organizers = User.query.filter_by(role='CLUB_COORDINATOR', club_id=event.club_id).all()
        elif getattr(event, 'organized_by', '') == 'COLLEGE' and event.college_id:
            organizers = User.query.filter_by(role='COLLEGE_ADMIN', college_id=event.college_id).all()
            
        for org in organizers:
            notif = Notification(
                user_id=org.id,
                title=title,
                message=message,
                type="NEW_REGISTRATION",
                link=link,
                is_read=False
            )
            db.session.add(notif)
    except Exception as e:
        print(f"Error notifying organizers: {e}")
