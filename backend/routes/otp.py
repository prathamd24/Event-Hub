from flask import Blueprint, request, jsonify
from extensions import db
from models import OTP
import random
import string
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

otp_bp = Blueprint('otp', __name__)

# Email configuration from environment
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '') # User needs to set this
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '') # User needs to set this

def send_otp_email(email, code):
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"DEBUG: OTP for {email} is {code} (SMTP not configured)")
        return True # Return true so developer can test via console logs

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = email
        msg['Subject'] = f"{code} is your Event Hub Verification Code"

        body = f"""
        <html>
            <body style="font-family: sans-serif; background-color: #0f172a; color: white; padding: 40px; border-radius: 20px;">
                <h1 style="color: #6366f1;">College Event Hub</h1>
                <p>Use the code below to verify your email address and join the hub.</p>
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
                    {code}
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">This code will expire in 10 minutes.</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

@otp_bp.route('/send-email', methods=['POST'])
def send_email_otp():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    # Generate 6-digit code
    code = ''.join(random.choices(string.digits, k=6))
    
    # Store in DB
    new_otp = OTP(
        identifier=email,
        code=code,
        purpose='REGISTRATION',
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.session.add(new_otp)
    db.session.commit()

    # Send via Email
    success = send_otp_email(email, code)
    
    if success:
        return jsonify({'message': f'OTP sent to {email}'}), 200
    else:
        return jsonify({'error': 'Failed to send OTP email'}), 500

@otp_bp.route('/verify', methods=['POST'])
def verify_otp():
    data = request.get_json()
    identifier = data.get('identifier')
    code = data.get('code')

    if not identifier or not code:
        return jsonify({'error': 'Identifier and code are required'}), 400

    otp_record = OTP.query.filter_by(identifier=identifier, code=code, is_verified=False)\
                    .order_by(OTP.created_at.desc()).first()

    if not otp_record or otp_record.is_expired():
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    otp_record.is_verified = True
    db.session.commit()

    return jsonify({'message': 'OTP verified successfully'}), 200
