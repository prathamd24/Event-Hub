from flask import Blueprint, jsonify, request
from middleware.auth_middleware import get_jwt_identity, jwt_required
from extensions import db
from models import Notification

notifications_bp = Blueprint('notifications', __name__)

# Handle CORS preflight for all notifications routes
@notifications_bp.route('/notifications/<path:path>', methods=['OPTIONS'])
@notifications_bp.route('/notifications', methods=['OPTIONS'])
def notifications_options(path=None):
    return jsonify({}), 200

@notifications_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user = request.user
    user_id = user.id
    
    notifications = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .limit(20).all()
    
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    
    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unreadCount": unread_count
    }), 200

@notifications_bp.route('/notifications/<int:notif_id>/read', methods=['POST'])
@jwt_required()
def mark_read(notif_id):
    identity = get_jwt_identity()
    user_id = identity['id'] if isinstance(identity, dict) else identity
    
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    notif.is_read = True
    db.session.commit()
    
    return jsonify({"message": "Marked as read"}), 200

@notifications_bp.route('/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    identity = get_jwt_identity()
    user_id = identity['id'] if isinstance(identity, dict) else identity
    
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    
    return jsonify({"message": "All marked as read"}), 200

@notifications_bp.route('/notifications/<int:notif_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notif_id):
    user = request.user
    notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first_or_404()
    db.session.delete(notif)
    db.session.commit()
    return jsonify({"message": "Notification deleted"}), 200
