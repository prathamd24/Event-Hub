"""
One-time seed script:
  - Ensure ONLY prathamkumarhr@gmail.com is PLATFORM_ADMIN (demote any others)
  - Set up eit@gmail.com as COLLEGE_ADMIN of Echelon Institute of Technology Faridabad
"""

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import User, College

PLATFORM_ADMIN_EMAIL = 'prathamkumarhr@gmail.com'
COLLEGE_ADMIN_EMAIL  = 'eit@gmail.com'
COLLEGE_NAME         = 'Echelon Institute of Technology Faridabad'

def run():
    app = create_app()
    with app.app_context():

        # ── 1. Enforce single platform admin ─────────────────────────────────
        rogue_admins = User.query.filter(
            User.role == 'PLATFORM_ADMIN',
            User.email != PLATFORM_ADMIN_EMAIL
        ).all()
        for u in rogue_admins:
            print(f"⚠️  Demoting rogue PLATFORM_ADMIN: {u.email} → STUDENT")
            u.role = 'STUDENT'

        # Make sure the real admin exists and has the right role
        real_admin = User.query.filter_by(email=PLATFORM_ADMIN_EMAIL).first()
        if real_admin:
            real_admin.role = 'PLATFORM_ADMIN'
            print(f"✅ Confirmed PLATFORM_ADMIN: {PLATFORM_ADMIN_EMAIL}")
        else:
            real_admin = User(
                name='Pratham Kumar',
                email=PLATFORM_ADMIN_EMAIL,
                role='PLATFORM_ADMIN',
                is_active=True,
                password_hash='firebase_managed'
            )
            db.session.add(real_admin)
            db.session.flush()
            print(f"✅ Created PLATFORM_ADMIN: {PLATFORM_ADMIN_EMAIL}")

        # ── 2. Create / update Echelon Institute of Technology Faridabad ──────
        college = College.query.filter(College.name.ilike(COLLEGE_NAME)).first()
        if not college:
            college = College(
                name=COLLEGE_NAME,
                location='Faridabad, Haryana',
                status='APPROVED',
                is_verified=True
            )
            db.session.add(college)
            db.session.flush()
            print(f"✅ Created college: {COLLEGE_NAME}")
        else:
            college.status = 'APPROVED'
            college.is_verified = True
            print(f"✅ College already exists, ensured APPROVED: {COLLEGE_NAME}")

        # ── 3. Create / update eit@gmail.com as COLLEGE_ADMIN ────────────────
        college_admin = User.query.filter_by(email=COLLEGE_ADMIN_EMAIL).first()
        if college_admin:
            college_admin.role = 'COLLEGE_ADMIN'
            college_admin.college_id = college.id
            print(f"✅ Updated {COLLEGE_ADMIN_EMAIL} → COLLEGE_ADMIN of {COLLEGE_NAME}")
        else:
            college_admin = User(
                name='EIT Admin',
                email=COLLEGE_ADMIN_EMAIL,
                role='COLLEGE_ADMIN',
                is_active=True,
                password_hash='firebase_managed',
                college_id=college.id
            )
            db.session.add(college_admin)
            print(f"✅ Created {COLLEGE_ADMIN_EMAIL} as COLLEGE_ADMIN of {COLLEGE_NAME}")

        # Link the college's admin_id to this user
        db.session.flush()
        college.admin_id = college_admin.id

        db.session.commit()
        print("\n🎉 Done! All changes committed.")

if __name__ == '__main__':
    run()
