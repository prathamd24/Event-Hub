from extensions import db
from datetime import datetime
import json


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(500), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    college_id = db.Column(
        db.Integer, db.ForeignKey('colleges.id'), nullable=True
    )
    college_name_manual = db.Column(db.String(200), nullable=True)
    club_id = db.Column(db.Integer, db.ForeignKey('clubs.id'), nullable=True)
    profile_pic = db.Column(db.String(500), nullable=True)
    google_auth = db.Column(db.Boolean, default=False, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Volunteer specifics
    volunteer_points = db.Column(db.Integer, default=0)
    volunteer_badges = db.Column(db.JSON, nullable=True) # list of badge strings

    college = db.relationship(
        'College', foreign_keys=[college_id], backref='students', lazy=True
    )
    club = db.relationship(
        'Club', foreign_keys=[club_id], backref='coordinator_user', lazy=True
    )
    club_roles = db.relationship(
        'ClubRole', foreign_keys='ClubRole.user_id', overlaps='target_user,user', lazy=True
    )

    def to_dict(self):
        # Get active club roles with club names
        roles_list = []
        roles_legacy = []
        for cr in self.club_roles:
            roles_legacy.append(cr.role)
            roles_list.append({
                'role': cr.role,
                'clubId': cr.club_id,
                'clubName': cr.club.name if cr.club else 'Unknown Club'
            })
        
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'collegeId': self.college_id,
            'clubId': self.club_id,
            'profilePic': self.profile_pic,
            'googleAuth': self.google_auth,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'collegeName': (
                self.college.name if self.college
                else (self.college_name_manual if self.college_name_manual and self.college_name_manual != 'Not specified' else 'Not specified')
            ),
            'volunteerPoints': getattr(self, 'volunteer_points', 0),
            'volunteerBadges': getattr(self, 'volunteer_badges', []),
            'clubRoles': roles_list,
            'clubRolesLegacy': roles_legacy
        }


class College(db.Model):
    __tablename__ = 'colleges'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    location = db.Column(db.String(300))
    description = db.Column(db.Text)
    website = db.Column(db.String(300))
    logo_url = db.Column(db.String(500))
    banner_url = db.Column(db.String(500))
    status = db.Column(db.String(50), default='PENDING')
    is_verified = db.Column(db.Boolean, default=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    instagram = db.Column(db.String(200), nullable=True)
    affiliation = db.Column(db.String(300), nullable=True) # deprecated
    affiliations = db.Column(db.JSON, nullable=True)
    college_photos = db.Column(db.JSON, nullable=True)
    custom_categories = db.Column(db.JSON, nullable=True)
    contact_email = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    twitter = db.Column(db.String(100), nullable=True)
    linkedin = db.Column(db.String(300), nullable=True)
    facebook = db.Column(db.String(300), nullable=True)
    established_year = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(100), nullable=True) # e.g. Engineering, Arts, Medical
    naac_grade = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship(
        'User', foreign_keys=[admin_id], backref='administered_college',
        lazy=True
    )
    clubs = db.relationship(
        'Club', foreign_keys='Club.college_id', backref='college',
        lazy=True
    )
    events = db.relationship(
        'Event', foreign_keys='Event.college_id', backref='college',
        lazy=True
    )

    def to_dict(self, counts=None):
        from models import Club, Event, User
        from sqlalchemy import func

        if counts is None:
            try:
                club_count = db.session.query(func.count(Club.id)).filter(Club.college_id == self.id).scalar() or 0
                event_count = db.session.query(func.count(Event.id)).filter(Event.college_id == self.id).scalar() or 0
                upcoming_count = db.session.query(func.count(Event.id)).filter(
                    Event.college_id == self.id, Event.status == 'UPCOMING'
                ).scalar() or 0
                student_count = db.session.query(func.count(User.id)).filter(
                    User.role == 'STUDENT',
                    User.is_active == True,
                    User.college_id == self.id,
                ).scalar() or 0
            except Exception:
                club_count = event_count = upcoming_count = student_count = 0
        else:
            student_count = counts.get('students', 0)
            club_count = counts.get('clubs', 0)
            event_count = counts.get('events', 0)
            upcoming_count = counts.get('upcoming', 0)

        return {
            "id":           self.id,
            "name":         self.name,
            "location":     self.location,
            "website":      self.website,
            "logoUrl":      self.logo_url,
            "bannerUrl":    self.banner_url,
            "status":       self.status,
            "isVerified":   self.is_verified,
            "description":  self.description,
            "affiliation":  self.affiliation,
            "affiliations": self.affiliations or [],
            "collegePhotos": self.college_photos or [],
            "studentCount": student_count,
            "clubCount":    club_count,
            "eventCount":   event_count,
            "upcomingEventCount": upcoming_count,
            "customCategories": self.custom_categories or [],
            "contactEmail": self.contact_email,
            "phone":        self.phone,
            "twitter":      self.twitter,
            "linkedin":     self.linkedin,
            "facebook":     self.facebook,
            "establishedYear": self.established_year,
            "type":         self.type,
            "naacGrade":    self.naac_grade
        }




class Club(db.Model):
    __tablename__ = 'clubs'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    instagram = db.Column(db.String(200), nullable=True)
    logo_url = db.Column(db.String(500))
    cover_url = db.Column(db.String(300), nullable=True)
    gallery = db.Column(db.Text, nullable=True)  # JSON array of gallery photo URLs
    club_photos = db.Column(db.JSON, nullable=True)  # showcase photos (max 5)
    status = db.Column(db.String(50), default='APPROVED')
    college_id = db.Column(
        db.Integer, db.ForeignKey('colleges.id'), nullable=False
    )
    coordinator_id = db.Column(
        db.Integer, db.ForeignKey('users.id'), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    coordinator = db.relationship(
        'User', foreign_keys=[coordinator_id], backref='coordinated_club',
        lazy=True
    )
    events = db.relationship(
        'Event', foreign_keys='Event.club_id', backref='club', lazy=True
    )

    def to_dict(self, counts=None):
        """
        Accepts optional pre-computed `counts` to avoid N+1 queries in list views.
        """
        from models import ClubRole, EventRegistration
        from sqlalchemy import func

        if counts is None:
            total_members_count = db.session.query(func.count(ClubRole.id)).filter_by(club_id=self.id).scalar() or 0
            registration_count = db.session.query(func.count(EventRegistration.id)).join(Event).filter(
                Event.club_id == self.id
            ).scalar() or 0
            event_count = db.session.query(func.count(Event.id)).filter_by(club_id=self.id).scalar() or 0
        else:
            total_members_count = counts.get('members', 0)
            registration_count = counts.get('registrations', 0)
            event_count = counts.get('events', 0)

        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'instagram': self.instagram,
            'logoUrl': self.logo_url,
            'status': self.status,
            'collegeId': self.college_id,
            'coordinatorId': self.coordinator_id,
            'coordinatorName': self.coordinator.name if self.coordinator else None,
            'coordinatorEmail': self.coordinator.email if self.coordinator else None,
            'registrationCount': registration_count,
            'membersCount': total_members_count,
            'eventCount': event_count,
            'coverUrl': self.cover_url,
            'gallery': json.loads(self.gallery or '[]'),
            'clubPhotos': self.club_photos or [],
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

class Event(db.Model):
    __tablename__ = 'events'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    venue = db.Column(db.String(300))
    event_date = db.Column(db.Date)
    end_date = db.Column(db.Date, nullable=True)
    start_time = db.Column(db.String(20))
    end_time = db.Column(db.String(20))
    registration_deadline = db.Column(db.Date)
    max_participants = db.Column(db.Integer)
    current_registrations = db.Column(db.Integer, default=0)
    registration_fee = db.Column(db.Float, default=0)
    rules = db.Column(db.Text)
    eligibility_criteria = db.Column(db.Text)
    eligibility = db.Column(db.Text, nullable=True)  # free-text eligibility description
    required_materials = db.Column(db.Text)
    themes = db.Column(db.JSON, nullable=True)   # array of tag strings
    prizes = db.Column(db.JSON, nullable=True)   # array of {position, amount, description}
    event_photos = db.Column(db.JSON, nullable=True)  # array of photo URL strings (max 5)
    topics = db.Column(db.JSON, nullable=True)
    highlights = db.Column(db.JSON, nullable=True)
    chief_guests = db.Column(db.JSON, nullable=True)
    judges = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(50), default='UPCOMING')
    cover_url = db.Column(db.String(300), nullable=True)
    organized_by = db.Column(db.String(20), default='COLLEGE')
    event_scope = db.Column(db.String(20), default='INTRA', server_default='INTRA', nullable=False)
    participation_type = db.Column(db.String(20), default='INDIVIDUAL')
    venue_map_link = db.Column(db.String(500), nullable=True)
    payment_qr_url = db.Column(db.String(500), nullable=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    club_id = db.Column(db.Integer, db.ForeignKey('clubs.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    upi_id        = db.Column(db.String(100), nullable=True)
    upi_name      = db.Column(db.String(100), nullable=True)
    payment_qr    = db.Column(db.String(500), nullable=True)
    registration_type = db.Column(db.String(20), default="INDIVIDUAL")
    min_team_size = db.Column(db.Integer, default=1)
    max_team_size = db.Column(db.Integer, default=1)
    max_teams     = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', foreign_keys=[created_by], backref='created_events', lazy=True)
    registrations = db.relationship('Registration', backref='event', lazy=True)
    event_registrations = db.relationship('EventRegistration', back_populates='event', lazy=True)

    def to_dict(self):
        try:
            # Fetch club and college details — use db.session.get (non-deprecated)
            club = db.session.get(Club, self.club_id) if getattr(self, "club_id", None) else None
            college = db.session.get(College, self.college_id) if getattr(self, "college_id", None) else None

            return {
                'id': self.id,
                'title': getattr(self, 'title', 'Unknown Event'),
                'description': getattr(self, 'description', ''),
                'category': getattr(self, 'category', 'General'),
                'venue': getattr(self, 'venue', ''),
                'eventDate': self.event_date.isoformat() if getattr(self, 'event_date', None) else None,
                'endDate': self.end_date.isoformat() if getattr(self, 'end_date', None) else None,
                'startTime': getattr(self, 'start_time', None),
                'endTime': getattr(self, 'end_time', None),
                'registrationDeadline': self.registration_deadline.isoformat() if getattr(self, 'registration_deadline', None) else None,
                'maxParticipants': getattr(self, 'max_participants', None),
                'registrationFee': getattr(self, 'registration_fee', 0) or 0,
                'rules': getattr(self, 'rules', ''),
                'eligibilityCriteria': getattr(self, 'eligibility_criteria', ''),
                'eligibility': getattr(self, 'eligibility', ''),
                'requiredMaterials': getattr(self, 'required_materials', ''),
                'themes': getattr(self, 'themes', []) or [],
                'prizes': getattr(self, 'prizes', []) or [],
                'eventPhotos': getattr(self, 'event_photos', []) or [],
                'topics': getattr(self, 'topics', None) or [],
                'highlights': getattr(self, 'highlights', None) or [],
                'chiefGuests': getattr(self, 'chief_guests', None) or [],
                'judges': getattr(self, 'judges', None) or [],
                'status': self.get_dynamic_status(),
                'organizedBy': getattr(self, 'organized_by', "CLUB" if getattr(self, 'club_id', None) else "COLLEGE"),
                'eventScope': getattr(self, 'event_scope', 'INTRA'),
                'venueMapLink': getattr(self, 'venue_map_link', None),
                'collegeId': getattr(self, 'college_id', None),
                'collegeName': college.name if college else None,
                'clubId': getattr(self, 'club_id', None),
                'clubName': club.name if club else None,
                'clubLogoUrl': club.logo_url if club else None,
                'createdBy': getattr(self, 'created_by', None),
                'createdAt': self.created_at.isoformat() if getattr(self, 'created_at', None) else None,
                'currentRegistrations': EventRegistration.query.filter(
                    EventRegistration.event_id == self.id,
                    EventRegistration.status.in_(["PENDING", "VERIFIED"])
                ).count() if hasattr(self, 'id') else 0,
                'coverUrl': getattr(self, 'cover_url', None),
                'upiId': getattr(self, 'upi_id', None),
                'upiName': getattr(self, 'upi_name', None),
                'paymentQr': getattr(self, 'payment_qr', None),
                'registrationType': getattr(self, "registration_type", "INDIVIDUAL") or "INDIVIDUAL",
                'teamMinSize': getattr(self, "min_team_size", 2),
                'teamMaxSize': getattr(self, "max_team_size", 4),
                'maxTeams': getattr(self, "max_teams", None),
                'durationHours': self.get_duration_hours(),
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "id": getattr(self, 'id', None),
                "title": getattr(self, 'title', 'Unknown Event'),
                "error": str(e)
            }

    def get_duration_hours(self):
        from utils.event_utils import calculate_duration
        return calculate_duration(self)

    def get_dynamic_status(self):
        """Returns the status based on current date and time."""
        from utils.event_utils import update_event_status_logic
        return update_event_status_logic(self)

class EventRegistration(db.Model):
    __tablename__ = "event_registrations"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    status = db.Column(db.String(30), default="PENDING", nullable=False)
    payment_screenshot_url = db.Column(db.String(500), nullable=True)
    payment_amount = db.Column(db.Integer, nullable=True)
    payment_ref = db.Column(db.String(200), nullable=True)

    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime, nullable=True)
    verified_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    team_name = db.Column(db.String(200), nullable=True)
    team_members = db.Column(db.JSON, nullable=True) # List of {name, email}

    # Relationships
    event = db.relationship("Event", foreign_keys=[event_id], back_populates="event_registrations")
    student = db.relationship("User", foreign_keys=[student_id], backref="event_registrations_list")
    verifier = db.relationship("User", foreign_keys=[verified_by])

    # Ensure one registration per student per event
    __table_args__ = (
        db.UniqueConstraint("event_id", "student_id", name="unique_event_student"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "eventId": self.event_id,
            "studentId": self.student_id,
            "status": self.status,
            "paymentScreenshotUrl": self.payment_screenshot_url if self.payment_screenshot_url else None,
            "paymentAmount": self.payment_amount,
            "paymentRef": self.payment_ref,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
            "registeredAt": self.registered_at.isoformat() if self.registered_at else None,
            "createdAt": self.registered_at.isoformat() if self.registered_at else None,
            "verifiedAt": self.verified_at.isoformat() if self.verified_at else None,
            "rejection_reason": self.rejection_reason,
            "rejectionReason": self.rejection_reason,
            # Student details
            "name": self.student.name if self.student else None,
            "email": self.student.email if self.student else None,
            "studentName": self.student.name if self.student else None,
            "studentEmail": self.student.email if self.student else None,
            # Event details
            "event": self.event.to_dict() if self.event else None,
            "eventTitle": self.event.title if self.event else None,
            "eventDate": self.event.event_date.isoformat() if self.event and self.event.event_date else None,
            "eventVenue": self.event.venue if self.event else None,
            "eventFee": self.event.registration_fee if self.event else 0,
            # Club details (for college admin filtering)
            "clubId": self.event.club_id if self.event else None,
            "clubName": self.event.club.name if (self.event and self.event.club) else None,
            "teamName": self.team_name,
            "teamMembers": self.team_members or [],
        }


class Registration(db.Model):
    __tablename__ = 'registrations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False)
    status = db.Column(db.String(50), default='CONFIRMED')
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_id', name='unique_user_event'),
    )

    user = db.relationship('User', foreign_keys=[user_id], backref='registrations', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'eventId': self.event_id,
            'status': self.status,
            'registeredAt': self.registered_at.isoformat() if self.registered_at else None,
            'event': self.event.to_dict() if self.event else None,
            'userName': self.user.name if self.user else None,
            'userEmail': self.user.email if self.user else None,
        }

class OTP(db.Model):
    __tablename__ = 'otps'
    id = db.Column(db.Integer, primary_key=True)
    identifier = db.Column(db.String(200), nullable=False)  # email or phone
    code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(50), default='REGISTRATION')
    is_verified = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'identifier': self.identifier,
            'purpose': self.purpose,
            'isVerified': self.is_verified,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)
    # types: EVENT_OFFER, OFFER_ACCEPTED, NEW_REGISTRATION,
    #        COLLEGE_PENDING, EVENT_UPDATE
    is_read = db.Column(db.Boolean, default=False)
    link = db.Column(db.String(300), nullable=True)
    # link: where to navigate when clicked e.g. /club/dashboard
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "isRead": self.is_read,
            "link": self.link,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None
        }

class TeamRegistration(db.Model):
    __tablename__ = "team_registrations"

    id             = db.Column(db.Integer, primary_key=True)
    event_id       = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    team_name      = db.Column(db.String(100), nullable=False)
    leader_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status         = db.Column(db.String(30), default="PENDING")
    # status values: PENDING, AWAITING_PAYMENT, COMPLETED, CANCELLED
    payment_status = db.Column(db.String(20), default="UNPAID")
    # payment_status: UNPAID, PAID, FREE
    payment_screenshot = db.Column(db.String(500), nullable=True)
    
    leader_payment_status = db.Column(db.String(20), default="UNPAID")
    leader_payment_ref    = db.Column(db.String(200), nullable=True)
    leader_payment_screenshot = db.Column(db.String(500), nullable=True)
    
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships
    members  = db.relationship("TeamMember", backref="team", lazy=True,
                               cascade="all, delete-orphan")
    leader   = db.relationship("User", foreign_keys=[leader_id])
    event    = db.relationship("Event", backref="team_registrations")

    def to_dict(self):
        try:
            # Use db.session.get (non-deprecated) instead of Model.query.get()
            leader = db.session.get(User, self.leader_id)

            members_data = []
            for m in self.members:
                # Resolve member name: prefer stored invited_name, then look up user ONCE
                invited_name = m.invited_name
                if not invited_name and m.user_id:
                    member_user = m.user  # loaded via relationship — no extra query if joinedload used
                    invited_name = member_user.name if member_user else None
                members_data.append({
                    "id":              m.id,
                    "userId":          m.user_id,
                    "invitedEmail":    m.invited_email,
                    "invitedName":     invited_name,
                    "status":          m.status,
                    "paymentStatus":   getattr(m,"payment_status",
                                               "UNPAID") or "UNPAID",
                    "paymentRef":      getattr(m,"payment_ref",None),
                    "paymentScreenshot": getattr(m,
                                          "payment_screenshot",None),
                    "paidAt":          m.paid_at.isoformat()
                                       if getattr(m,"paid_at",None)
                                       else None,
                    "respondedAt":     m.responded_at.isoformat()
                                       if getattr(m,"responded_at",
                                          None) else None,
                })

            all_accepted = all(
                m["status"] == "ACCEPTED" for m in members_data
            ) if members_data else True

            all_paid = (
                getattr(self,"payment_status","UNPAID") == "PAID"
                or getattr(self,"payment_status","UNPAID") == "FREE"
            ) and all(
                m["paymentStatus"] in ("PAID","FREE")
                for m in members_data
            )

            return {
                "id":               self.id,
                "eventId":          self.event_id,
                "eventTitle":       self.event.title if self.event else None,
                "clubId":           self.event.club_id if self.event else None,
                "clubName":         self.event.club.name if (self.event and self.event.club) else None,
                "teamName":         self.team_name,
                "leaderId":         self.leader_id,
                "leaderName":       leader.name  if leader else None,
                "leaderEmail":      leader.email if leader else None,
                "status":           self.status,
                "paymentStatus":    getattr(self, "leader_payment_status", "UNPAID"),
                "paymentRef":       getattr(self, "leader_payment_ref", None),
                "paymentScreenshot": getattr(self, "leader_payment_screenshot", None),
                "leaderPaymentStatus": getattr(self, "leader_payment_status", "UNPAID"),
                "leaderPaymentRef":    getattr(self, "leader_payment_ref", None),
                "leaderPaymentScreenshot": getattr(self, "leader_payment_screenshot", None),
                "leaderTransactionId": getattr(self, "leader_payment_ref", None),
                "createdAt":        self.created_at.isoformat()
                                    if self.created_at else None,
                "members":          members_data,
                "memberCount":      len(members_data) + 1,
                "allAccepted":      all_accepted,
                "allPaid":          all_paid,
            }
        except Exception as e:
            import traceback; traceback.print_exc()
            return {
                "id":       self.id,
                "teamName": self.team_name,
                "error":    str(e)
            }

class TeamMember(db.Model):
    __tablename__ = "team_members"

    id         = db.Column(db.Integer, primary_key=True)
    team_id    = db.Column(db.Integer,
                    db.ForeignKey("team_registrations.id"), nullable=False)
    user_id    = db.Column(db.Integer,
                    db.ForeignKey("users.id"), nullable=True)
    invited_email = db.Column(db.String(200), nullable=False)
    invited_name  = db.Column(db.String(100), nullable=True)
    status     = db.Column(db.String(20), default="PENDING")
    # status: PENDING, ACCEPTED, DECLINED
    payment_status = db.Column(db.String(20), default="UNPAID")
    payment_ref    = db.Column(db.String(200), nullable=True)
    payment_screenshot = db.Column(db.String(500), nullable=True)
    paid_at      = db.Column(db.DateTime, nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id":           self.id,
            "teamId":       self.team_id,
            "userId":       self.user_id,
            "invitedEmail": self.invited_email,
            "invitedName":  self.invited_name or (self.user.name if self.user else None),
            "status":       self.status,
            "paymentStatus": self.payment_status,
            "paymentRef":    self.payment_ref,
            "paymentScreenshot": self.payment_screenshot,
            "paidAt":       self.paid_at.isoformat() if self.paid_at else None,
            "respondedAt":  self.responded_at.isoformat()
                            if self.responded_at else None,
        }

class ClubMembership(db.Model):
    __tablename__ = "club_memberships"
    id         = db.Column(db.Integer, primary_key=True)
    club_id    = db.Column(db.Integer, db.ForeignKey("clubs.id"))
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"))
    role       = db.Column(db.String(20), default="MEMBER")
    joined_at  = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="club_memberships")

    def to_dict(self):
        u = self.user
        return {
            "id":         self.id,
            "userId":     self.user_id,
            "name":       u.name  if u else None,
            "email":      u.email if u else None,
            "role":       self.role,
            "joinedAt":   self.joined_at.isoformat() if self.joined_at else None,
        }

class ClubRole(db.Model):
    __tablename__ = "club_roles"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    club_id    = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    role       = db.Column(db.String(30), nullable=False)
    assigned_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    user       = db.relationship("User", foreign_keys=[user_id], overlaps="club_roles,target_user")
    club       = db.relationship("Club")
    assigner   = db.relationship("User", foreign_keys=[assigned_by])

    def to_dict(self):
        try:
            u = self.user
            return {
                "id":         self.id,
                "userId":     self.user_id,
                "clubId":     self.club_id,
                "role":       self.role,
                "name":       u.name  if u else None,
                "email":      u.email if u else None,
                "assignedAt": self.assigned_at.isoformat()
                              if self.assigned_at else None,
            }
        except Exception as e:
            return {"id": self.id, "role": self.role, "userId": self.user_id}

class BroadcastMessage(db.Model):
    __tablename__ = "broadcast_messages"
    id         = db.Column(db.Integer, primary_key=True)
    club_id    = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    sender_id  = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship("User", foreign_keys=[sender_id])

    def to_dict(self):
        s = self.sender
        # Check if sender is club coordinator or student coordinator
        sender_role = "MEMBER"
        if s:
            if s.role == "CLUB_COORDINATOR":
                sender_role = "CLUB_COORDINATOR"
            else:
                # Check if they have a special role in this club
                cr = ClubRole.query.filter_by(
                    user_id=s.id,
                    club_id=self.club_id
                ).first()
                if cr:
                    sender_role = cr.role
                elif s.role == "COLLEGE_ADMIN":
                    sender_role = "COLLEGE_ADMIN"

        return {
            "id":          self.id,
            "clubId":      self.club_id,
            "senderId":    self.sender_id,
            "senderName":  s.name if s else "Unknown",
            "senderRole":  sender_role,
            "message":     self.message,
            "createdAt":   self.created_at.isoformat() + "Z" if self.created_at else None
        }

class ActivityLog(db.Model):
    __tablename__ = "activity_logs"
    id         = db.Column(db.Integer, primary_key=True)
    club_id    = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=True)
    college_id = db.Column(db.Integer, db.ForeignKey("colleges.id"), nullable=True)
    actor_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action     = db.Column(db.String(100), nullable=False)
    # e.g. "BROADCAST_SENT", "MEMBER_ADDED", "EVENT_CREATED"
    details    = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    actor = db.relationship("User", foreign_keys=[actor_id])

    def to_dict(self):
        a = self.actor
        return {
            "id":        self.id,
            "actor":     a.name if a else "System",
            "action":    self.action,
            "details":   self.details,
            "createdAt": self.created_at.isoformat()
        }

class ClubCoordinator(db.Model):
    __tablename__ = "club_coordinators"
    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)
    added_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    club = db.relationship("Club", foreign_keys=[club_id], backref=db.backref('coordinators_list', cascade='all, delete-orphan'))

    def to_dict(self):
        u = self.user
        return {
            "id": self.id,
            "userId": self.user_id,
            "clubId": self.club_id,
            "name": u.name if u else None,
            "email": u.email if u else None,
            "isPrimary": self.is_primary,
            "addedAt": self.added_at.isoformat() if self.added_at else None
        }

class Feedback(db.Model):
    __tablename__ = 'feedback'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False) # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='feedbacks')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': self.user.name if self.user else 'Anonymous',
            'rating': self.rating,
            'comment': self.comment,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class PlatformEvent(db.Model):
    """
    Telemetry / observability log.
    Every significant user action on the platform is stored here.
    event_type examples: PAGE_VIEW, LOGIN, REGISTRATION, EVENT_VIEW, CLUB_VIEW,
                         SEARCH, FEEDBACK_SUBMITTED, COLLEGE_APPROVED, etc.
    """
    __tablename__ = 'platform_events'
    id          = db.Column(db.Integer, primary_key=True)
    event_type  = db.Column(db.String(100), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=True)   # USER / EVENT / CLUB / COLLEGE
    entity_id   = db.Column(db.Integer, nullable=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    college_id  = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=True)
    extra_data  = db.Column(db.JSON, nullable=True)          # arbitrary metadata
    ip_address  = db.Column(db.String(50), nullable=True)
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user    = db.relationship('User',    foreign_keys=[user_id],    lazy=True)
    college = db.relationship('College', foreign_keys=[college_id], lazy=True)

    def to_dict(self):
        return {
            'id':         self.id,
            'eventType':  self.event_type,
            'entityType': self.entity_type,
            'entityId':   self.entity_id,
            'userId':     self.user_id,
            'userName':   self.user.name if self.user else None,
            'collegeId':  self.college_id,
            'collegeName': self.college.name if self.college else None,
            'extraData':  self.extra_data or {},
            'ipAddress':  self.ip_address,
            'timestamp':  self.timestamp.isoformat() if self.timestamp else None,
        }
