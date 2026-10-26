import hashlib
import hmac
import logging
import re
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, Session as AuthSession
from app.schemas import Register, Login, VerifyEmail, ResendCode, EmailIn, ResetPassword
from app.services import google_oauth, mailer
from app.services.auth import optional_user, start_session, hasher, verify_password, public_user, throttle, revoke_sessions
from app.services.verification import issue_code, check_code

log = logging.getLogger(__name__)
router = APIRouter(prefix='/api/auth')
STATE_COOKIE = 'vela_oauth_state'

def unverified_error(email):
    return HTTPException(403, {'code': 'email_unverified', 'email': email,
                               'message': 'Email chưa được xác nhận. Nhập mã đã gửi tới email của bạn hoặc yêu cầu gửi lại mã.'})

@router.get('/providers')
def providers():
    return {'google': google_oauth.configured(), 'email_delivery': mailer.configured()}

@router.post('/register', status_code=202)
def register(payload: Register, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing and existing.email_verified:
        raise HTTPException(409, 'Email này đã được đăng ký.')
    if existing:
        # Never overwrite a pending sign-up: it would let someone else set the password on this email.
        # The inbox owner can verify with the code, or take the address back through password reset.
        raise HTTPException(409, {'code': 'email_unverified', 'email': existing.email,
                                  'message': 'Email này đã đăng ký nhưng chưa xác nhận. Nhập mã đã gửi hoặc yêu cầu gửi lại mã.'})
    if db.scalar(select(User.id).where(User.username == payload.username)):
        raise HTTPException(409, 'Tên đăng nhập đã có người sử dụng.')
    user = User(full_name=payload.full_name.strip(), email=payload.email, username=payload.username, phone=payload.phone,
                password_hash=hasher.hash(payload.password), email_verified=False)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Email hoặc tên đăng nhập đã được sử dụng.')
    return {'status': 'verification_required', 'email': user.email, 'resend_after': issue_code(db, user.email, 'verify')}

@router.post('/login')
def login(payload: Login, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    identifier = (payload.identifier or payload.email).strip().lower()
    user = db.scalar(select(User).where(or_(User.email == identifier, User.username == identifier))) if identifier else None
    valid = verify_password(payload.password, user.password_hash if user else None)
    if not user or not valid:
        raise HTTPException(401, 'Email, tên đăng nhập hoặc mật khẩu chưa chính xác.')
    if not user.email_verified:
        raise unverified_error(user.email)
    start_session(db, user, response)
    return public_user(user)

@router.post('/verify-email')
def verify_email(payload: VerifyEmail, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(400, 'Mã đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.')
    if user.email_verified:
        raise HTTPException(409, 'Email đã được xác nhận. Bạn có thể đăng nhập.')
    check_code(db, payload.email, 'verify', payload.code)
    user.email_verified = True
    db.commit()
    start_session(db, user, response)
    return public_user(user)

@router.post('/resend-code')
def resend_code(payload: ResendCode, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    user = db.scalar(select(User).where(User.email == payload.email))
    eligible = user and (not user.email_verified if payload.purpose == 'verify' else True)
    # Same answer whether or not the account exists, so the endpoint does not reveal registered emails.
    resend_after = issue_code(db, payload.email, payload.purpose) if eligible else settings.email_resend_seconds
    return {'ok': True, 'resend_after': resend_after, 'message': 'Nếu email hợp lệ, mã mới đã được gửi. Vui lòng kiểm tra hộp thư (cả mục Spam).'}

@router.post('/forgot-password')
def forgot_password(payload: EmailIn, request: Request, db: Session = Depends(get_db)):
    return resend_code(ResendCode(email=payload.email, purpose='reset'), request, db)

@router.post('/reset-password')
def reset_password(payload: ResetPassword, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(400, 'Mã đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.')
    check_code(db, payload.email, 'reset', payload.code)
    user.password_hash = hasher.hash(payload.password)
    # Receiving the code proves ownership of the inbox.
    user.email_verified = True
    revoke_sessions(db, user.id)
    db.commit()
    start_session(db, user, response)
    return public_user(user)

@router.post('/logout')
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get('vela_session')
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hashlib.sha256(token.encode()).hexdigest()))
        db.commit()
    response.delete_cookie('vela_session', path='/')
    return {'ok': True}

@router.get('/me')
def me(user=Depends(optional_user)):
    return public_user(user) if user else None

@router.get('/google/start')
def google_start():
    if not google_oauth.configured():
        raise HTTPException(503, 'Đăng nhập bằng Google chưa được cấu hình.')
    state = secrets.token_urlsafe(24)
    response = RedirectResponse(google_oauth.authorization_url(state), 302)
    response.set_cookie(STATE_COOKIE, state, httponly=True, secure=settings.cookie_secure, samesite='lax', max_age=600, path='/api/auth/google')
    return response

def unique_username(db, email):
    base = re.sub(r'[^a-z0-9_.]', '', email.split('@')[0].lower())[:24] or 'user'
    base = base if len(base) >= 3 else base + 'vela'
    candidate = base
    while db.scalar(select(User.id).where(User.username == candidate)):
        candidate = f'{base}{secrets.randbelow(10000):04d}'
    return candidate

@router.get('/google/callback')
def google_callback(request: Request, code: str = '', state: str = '', error: str = '', db: Session = Depends(get_db)):
    def finish(result, user=None):
        response = RedirectResponse(f'/tai-khoan?google={result}', 302)
        response.delete_cookie(STATE_COOKIE, path='/api/auth/google')
        if user:
            start_session(db, user, response)
        return response
    expected = request.cookies.get(STATE_COOKIE, '')
    if error:
        return finish('cancelled')
    if not code or not expected or not hmac.compare_digest(expected, state):
        return finish('state')
    try:
        info = google_oauth.fetch_userinfo(code)
    except Exception:
        log.exception('Google OAuth exchange failed')
        return finish('error')
    if not info.get('sub') or not info.get('email') or not info.get('email_verified'):
        return finish('unverified')
    email = info['email'].strip().lower()
    user = db.scalar(select(User).where(User.google_sub == info['sub'])) or db.scalar(select(User).where(User.email == email))
    if user:
        if not user.email_verified:
            # A pending sign-up may have been created by someone else; drop its password before trusting Google.
            user.password_hash = ''
        user.google_sub, user.email_verified = info['sub'], True
    else:
        user = User(full_name=(info.get('name') or email.split('@')[0])[:100], email=email, username=unique_username(db, email),
                    password_hash='', google_sub=info['sub'], email_verified=True)
        db.add(user)
    db.commit()
    return finish('ok', user)
