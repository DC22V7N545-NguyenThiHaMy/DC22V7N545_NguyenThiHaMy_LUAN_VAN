import re
import uuid
from datetime import timedelta
from sqlalchemy import select
from app.database import SessionLocal
from app.models import EmailCode, Session as AuthSession, User
from app.services import mailer

def new_payload(**changes):
    tag = uuid.uuid4().hex[:10]
    payload = {'full_name': 'Người kiểm thử', 'username': f'tester_{tag}', 'email': f'auth-{tag}@example.com', 'phone': '0901234567',
               'password': 'GoodPass123!', 'confirm_password': 'GoodPass123!'}
    payload.update(changes)
    return payload

def last_code(email):
    message = next(m for m in reversed(mailer.outbox) if m['to'] == email)
    return re.search(r'\b(\d{6})\b', message['body']).group(1)

def expire_cooldown(email):
    # Simulate the 2-minute resend window passing.
    with SessionLocal() as db:
        for record in db.scalars(select(EmailCode).where(EmailCode.email == email)):
            record.created_at -= timedelta(minutes=3)
        db.commit()

def register_verified(client, **changes):
    payload = new_payload(**changes)
    assert client.post('/api/auth/register', json=payload).status_code == 202
    assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': last_code(payload['email'])}).status_code == 200
    return payload

def test_register_validation(client):
    assert client.post('/api/auth/register', json=new_payload(confirm_password='Different123!')).status_code == 422
    assert client.post('/api/auth/register', json=new_payload(phone='12345')).status_code == 422
    assert client.post('/api/auth/register', json=new_payload(username='a b')).status_code == 422
    assert client.post('/api/auth/register', json=new_payload(email='bad')).status_code == 422

def test_register_requires_email_verification(client):
    payload = new_payload()
    result = client.post('/api/auth/register', json=payload)
    assert result.status_code == 202 and result.json()['status'] == 'verification_required'
    assert client.get('/api/auth/me').json() is None, 'registration must not log in before verification'
    blocked = client.post('/api/auth/login', json={'identifier': payload['email'], 'password': payload['password']})
    assert blocked.status_code == 403 and blocked.json()['detail']['code'] == 'email_unverified'
    # Pending sign-ups are never overwritten by a second registration.
    again = client.post('/api/auth/register', json=new_payload(email=payload['email']))
    assert again.status_code == 409 and again.json()['detail']['code'] == 'email_unverified'
    wrong = '000000' if last_code(payload['email']) != '000000' else '111111'
    assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': wrong}).status_code == 400
    assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': last_code(payload['email'])}).status_code == 200
    assert client.get('/api/auth/me').json()['username'] == payload['username']
    client.post('/api/auth/logout')
    by_username = client.post('/api/auth/login', json={'identifier': payload['username'].upper(), 'password': payload['password']})
    assert by_username.status_code == 200 and by_username.json()['phone'] == payload['phone']

def test_duplicates_rejected(client):
    payload = register_verified(client)
    assert client.post('/api/auth/register', json=new_payload(email=payload['email'])).status_code == 409
    assert client.post('/api/auth/register', json=new_payload(username=payload['username'])).status_code == 409

def test_resend_limited_to_once_per_two_minutes(client):
    payload = new_payload()
    client.post('/api/auth/register', json=payload)
    first = last_code(payload['email'])
    limited = client.post('/api/auth/resend-code', json={'email': payload['email']})
    assert limited.status_code == 429 and 'giây' in limited.json()['detail']
    expire_cooldown(payload['email'])
    assert client.post('/api/auth/resend-code', json={'email': payload['email']}).status_code == 200
    second = last_code(payload['email'])
    if first != second:
        assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': first}).status_code == 400, 'old code is replaced'
    assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': second}).status_code == 200

def test_code_attempts_are_limited(client):
    payload = new_payload()
    client.post('/api/auth/register', json=payload)
    code = last_code(payload['email'])
    wrong = f'{(int(code) + 1) % 10 ** 6:06d}'
    for _ in range(5):
        assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': wrong}).status_code == 400
    assert client.post('/api/auth/verify-email', json={'email': payload['email'], 'code': code}).status_code == 400, 'code is burned after 5 failures'

def test_forgot_and_reset_password(client):
    payload = register_verified(client)
    with SessionLocal() as db:
        user_id = db.scalar(select(User.id).where(User.email == payload['email']))
    unknown = client.post('/api/auth/forgot-password', json={'email': f'nobody-{uuid.uuid4().hex}@example.com'})
    assert unknown.status_code == 200, 'same answer for unknown emails'
    assert client.post('/api/auth/forgot-password', json={'email': payload['email']}).status_code == 200
    code = last_code(payload['email'])
    reset = {'email': payload['email'], 'code': code, 'password': 'NewPass456!', 'confirm_password': 'NewPass456!'}
    assert client.post('/api/auth/reset-password', json={**reset, 'confirm_password': 'Mismatch456!'}).status_code == 422
    assert client.post('/api/auth/reset-password', json=reset).status_code == 200
    with SessionLocal() as db:
        assert db.scalar(select(AuthSession.user_id).where(AuthSession.user_id == user_id)) is not None
        assert len(list(db.scalars(select(AuthSession).where(AuthSession.user_id == user_id)))) == 1, 'old sessions revoked'
    client.post('/api/auth/logout')
    assert client.post('/api/auth/login', json={'identifier': payload['email'], 'password': payload['password']}).status_code == 401
    assert client.post('/api/auth/login', json={'identifier': payload['email'], 'password': 'NewPass456!'}).status_code == 200
    assert client.post('/api/auth/reset-password', json=reset).status_code == 400, 'reset code is single-use'

def test_legacy_login_field_still_works(client):
    assert client.post('/api/auth/login', json={'email': 'linh@velastyle.vn', 'password': 'Vela@12345'}).status_code == 200

def test_google_disabled_without_configuration(client):
    assert client.get('/api/auth/providers').json()['google'] is False
    assert client.get('/api/auth/google/start', follow_redirects=False).status_code == 503

def test_google_callback_rejects_bad_state(client):
    client.cookies.set('vela_oauth_state', 'expected', path='/api/auth/google')
    result = client.get('/api/auth/google/callback?code=x&state=forged', follow_redirects=False)
    assert result.status_code == 302 and result.headers['location'].endswith('google=state')
    assert client.get('/api/auth/me').json() is None

def test_google_callback_creates_and_links_account(client, monkeypatch):
    from app.services import google_oauth
    email = f'google-{uuid.uuid4().hex[:8]}@example.com'
    monkeypatch.setattr(google_oauth, 'fetch_userinfo', lambda code: {'sub': 'sub-' + email, 'email': email, 'email_verified': True, 'name': 'Google User'})
    client.cookies.set('vela_oauth_state', 'ok-state', path='/api/auth/google')
    result = client.get('/api/auth/google/callback?code=abc&state=ok-state', follow_redirects=False)
    assert result.status_code == 302 and result.headers['location'].endswith('google=ok')
    me = client.get('/api/auth/me').json()
    assert me['email'] == email and me['google_linked'] and not me['has_password']
    client.post('/api/auth/logout')
    assert client.post('/api/auth/login', json={'identifier': email, 'password': ''}).status_code == 401, 'Google-only account has no password'

def test_google_takeover_of_pending_signup_is_prevented(client, monkeypatch):
    from app.services import google_oauth
    payload = new_payload()
    client.post('/api/auth/register', json=payload)  # someone else squats this email with their password
    monkeypatch.setattr(google_oauth, 'fetch_userinfo', lambda code: {'sub': 'sub-' + payload['email'], 'email': payload['email'], 'email_verified': True})
    client.cookies.set('vela_oauth_state', 's', path='/api/auth/google')
    client.get('/api/auth/google/callback?code=abc&state=s', follow_redirects=False)
    client.post('/api/auth/logout')
    assert client.post('/api/auth/login', json={'identifier': payload['email'], 'password': payload['password']}).status_code == 401
