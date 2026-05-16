from app import create_app, db
from models import User

def test_init():
    app = create_app()
    with app.app_context():
        try:
            count = User.query.count()
            print(f"Connection Successful. User count: {count}")
            
            admin_email = 'prathamkumarhr@gmail.com'
            admin = User.query.filter_by(email=admin_email).first()
            if admin:
                print(f"Platform Admin found: {admin.email}")
            else:
                print("Platform Admin NOT found. This might be expected if seeding hasn't run or email changed.")
                
            non_admins = User.query.filter(User.email != admin_email).all()
            if non_admins:
                print(f"Found {len(non_admins)} non-admin users. Cleanup may not have completed or triggered.")
            else:
                print("No non-admin users found. Cleanup successful.")
                
        except Exception as e:
            print(f"Test Failed: {e}")

if __name__ == "__main__":
    test_init()
