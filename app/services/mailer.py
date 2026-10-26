"""Outgoing email over SMTP (stdlib). Without SMTP_HOST the app runs in dev mode: messages are logged, not sent."""
import logging
import smtplib
import ssl
from collections import deque
from email.message import EmailMessage
from app.config import settings

log = logging.getLogger(__name__)
# Dev mode only: last messages kept in memory so local testing can read the code.
outbox = deque(maxlen=50)

def configured():
    return bool(settings.smtp_host)

def send_mail(to, subject, body):
    message = EmailMessage()
    message['From'] = settings.smtp_from or settings.smtp_user
    message['To'] = to
    message['Subject'] = subject
    message.set_content(body)
    if not configured():
        outbox.append({'to': to, 'subject': subject, 'body': body})
        log.warning('SMTP chưa cấu hình - email KHÔNG được gửi (chế độ dev). Tới %s: %s\n%s', to, subject, body)
        return
    context = ssl.create_default_context()
    if settings.smtp_security == 'ssl':
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=20)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)
    with server:
        if settings.smtp_security == 'starttls':
            server.starttls(context=context)
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)
