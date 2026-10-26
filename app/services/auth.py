import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import timedelta
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession
from app.database import get_db
from app.models import User, Session, now
from app.config import settings

hasher = PasswordHasher()
_dummy_hash = hasher.hash(secrets.token_urlsafe(32))
_attempts = defaultdict(deque)

def throttle(request: Request):
    key = request.client.host if request.client else 'local'
    attempts = _attempts[key]
    cutoff = time.monotonic() - 60
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    if len(attempts) >= settings.rate_limit_per_minute:
        raise HTTPException(429, 'Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.')
    attempts.append(time.monotonic())

def verify_password(password, encoded):
    try:
        return hasher.verify(encoded or _dummy_hash, password)
    except (VerificationError, InvalidHashError):
        return False

def start_session(db, user, response: Response):
    token = secrets.token_urlsafe(48)
    db.add(Session(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=now() + timedelta(days=settings.session_days)))
    db.commit()
    response.set_cookie('vela_session', token, httponly=True, secure=settings.cookie_secure, samesite=settings.cookie_samesite, max_age=settings.session_days * 86400, path='/')

def optional_user(request: Request, db: DBSession = Depends(get_db)):
    token = request.cookies.get('vela_session')
    if not token:
        return None
    session = db.get(Session, hashlib.sha256(token.encode()).hexdigest())
    if session and session.expires_at > now():
        return db.get(User, session.user_id)
    return None

def current_user(user=Depends(optional_user)):
    if not user:
        raise HTTPException(401, 'Đăng nhập để tiếp tục hành trình phong cách của bạn.')
    return user

def admin_user(user=Depends(current_user)):
    if user.role != 'admin':
        raise HTTPException(403, 'Chỉ quản trị viên được sử dụng chức năng này.')
    return user

def revoke_sessions(db, user_id):
    db.execute(delete(Session).where(Session.user_id == user_id))

def public_user(user):
    import json
    return {'id': user.id, 'full_name': user.full_name, 'email': user.email, 'username': user.username, 'phone': user.phone,
            'role': user.role, 'google_linked': bool(user.google_sub), 'has_password': bool(user.password_hash),
            'preferences': json.loads(user.preferences)}
