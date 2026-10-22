from datetime import timedelta
from sqlalchemy import select
from app.models import Interaction, now

WEIGHTS = {'view': 1.0, 'favorite': 3.0, 'cart': 4.0, 'purchase': 5.0}

def record(db, user_id, product_id, kind):
    # Debounce refreshes/repeated actions without suppressing separate purchases.
    if kind != 'purchase':
        recent = db.scalar(select(Interaction.id).where(Interaction.user_id == user_id, Interaction.product_id == product_id,
                Interaction.interaction_type == kind, Interaction.created_at > now() - timedelta(minutes=30)))
        if recent:
            return
    db.add(Interaction(user_id=user_id, product_id=product_id, interaction_type=kind, interaction_weight=WEIGHTS[kind]))
