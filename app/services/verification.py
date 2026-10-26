"""One-time 6-digit email codes for account verification and password reset."""
import hashlib
import hmac
import logging
import secrets
from datetime import timedelta
from fastapi import HTTPException
from sqlalchemy import select, update
from app.config import settings
from app.models import EmailCode, now
from app.services.mailer import send_mail

log = logging.getLogger(__name__)
MAX_ATTEMPTS = 5
MESSAGES = {
    'verify': ('Mã xác nhận tài khoản VELASTYLE', 'Mã xác nhận email của bạn là: {code}\n\nMã có hiệu lực trong {minutes} phút. Nếu bạn không đăng ký tài khoản VELASTYLE, hãy bỏ qua email này.'),
    'reset': ('Đặt lại mật khẩu VELASTYLE', 'Mã đặt lại mật khẩu của bạn là: {code}\n\nMã có hiệu lực trong {minutes} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu hiện tại vẫn được giữ nguyên.'),
}

def _hash(email, purpose, code):
    return hashlib.sha256(f'{purpose}:{email}:{code}'.encode()).hexdigest()

def resend_wait(db, email, purpose):
    """Seconds until another code may be sent for this email and purpose (0 = allowed)."""
    last = db.scalar(select(EmailCode.created_at).where(EmailCode.email == email, EmailCode.purpose == purpose).order_by(EmailCode.id.desc()).limit(1))
    if not last:
        return 0
    return max(0, int(settings.email_resend_seconds - (now() - last).total_seconds() + 0.999))

def issue_code(db, email, purpose):
    wait = resend_wait(db, email, purpose)
    if wait:
        raise HTTPException(429, f'Vui lòng đợi {wait} giây trước khi yêu cầu gửi lại mã.')
    code = f'{secrets.randbelow(10 ** 6):06d}'
    # A new code replaces any earlier one for the same purpose.
    db.execute(update(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose, EmailCode.used.is_(False)).values(used=True))
    record = EmailCode(email=email, purpose=purpose, code_hash=_hash(email, purpose, code), expires_at=now() + timedelta(minutes=settings.email_code_minutes))
    db.add(record)
    # Commit before SMTP so a slow mail server never holds the SQLite write lock.
    db.commit()
    subject, body = MESSAGES[purpose]
    try:
        send_mail(email, subject, body.format(code=code, minutes=settings.email_code_minutes))
    except Exception:
        log.exception('Sending %s code failed', purpose)
        # A failed send must not start the resend cooldown.
        db.delete(record)
        db.commit()
        raise HTTPException(503, 'Chưa gửi được email. Vui lòng thử lại sau ít phút.')
    return settings.email_resend_seconds

def check_code(db, email, purpose, code):
    record = db.scalar(select(EmailCode).where(EmailCode.email == email, EmailCode.purpose == purpose, EmailCode.used.is_(False)).order_by(EmailCode.id.desc()).limit(1))
    if not record or record.expires_at < now():
        raise HTTPException(400, 'Mã đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.')
    record.attempts += 1
    if not hmac.compare_digest(record.code_hash, _hash(email, purpose, code)):
        if record.attempts >= MAX_ATTEMPTS:
            record.used = True
            db.commit()
            raise HTTPException(400, 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.')
        db.commit()
        raise HTTPException(400, f'Mã chưa đúng. Bạn còn {MAX_ATTEMPTS - record.attempts} lần thử.')
    record.used = True
