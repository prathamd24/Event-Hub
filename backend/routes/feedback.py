from flask import Blueprint, request, jsonify
from middleware.auth_middleware import jwt_required
from extensions import db
from models import Feedback

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_feedback():
    current_user = request.user
    data = request.get_json()
    
    rating = data.get('rating')
    comment = data.get('comment')
    
    if not rating:
        return jsonify({'error': 'Rating is required'}), 400
        
    try:
        new_feedback = Feedback(
            user_id=current_user.id,
            rating=int(rating),
            comment=comment
        )
        db.session.add(new_feedback)
        db.session.commit()
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback': new_feedback.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f'[Internal Error] {e}')
        return jsonify({'error': "An internal server error occurred"}), 500

@feedback_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_feedback():
    current_user = request.user
    if current_user.role != 'PLATFORM_ADMIN':
        return jsonify({'error': 'Unauthorized'}), 403
        
    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    
    return jsonify([f.to_dict() for f in feedbacks]), 200
