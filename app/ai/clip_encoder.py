import hashlib
import logging
import re
import threading
import numpy as np
from PIL import Image
from sqlalchemy import select
from app.config import settings, ROOT
from app.models import ProductEmbedding, now
from .preprocessing import normalize

log = logging.getLogger(__name__)
_encoder = None
_lock = threading.Lock()

DEFAULT_MODEL = 'openai/clip-vit-base-patch32'

class ClipEncoder:
    """Dual image/text encoder. Works with CLIP and with SigLIP / SigLIP 2 (set CLIP_MODEL, e.g. google/siglip2-base-patch16-224)."""
    def __init__(self):
        import torch
        from transformers import AutoConfig, AutoModel, AutoProcessor, CLIPModel, CLIPProcessor
        self.torch = torch
        self.device = settings.clip_device
        torch.set_num_threads(max(1, min(4, torch.get_num_threads())))
        self.family = AutoConfig.from_pretrained(settings.clip_model).model_type
        if self.family == 'clip':
            self.processor = CLIPProcessor.from_pretrained(settings.clip_model, use_fast=False)
            self.model = CLIPModel.from_pretrained(settings.clip_model, use_safetensors=True).to(self.device).eval()
        elif self.family in ('siglip', 'siglip2'):
            self.processor = AutoProcessor.from_pretrained(settings.clip_model)
            self.model = AutoModel.from_pretrained(settings.clip_model, use_safetensors=True).to(self.device).eval()
        else:
            raise ValueError(f'CLIP_MODEL phải là mô hình CLIP hoặc SigLIP, nhận được "{self.family}".')

    def image(self, image):
        inputs = self.processor(images=image.convert('RGB'), return_tensors='pt').to(self.device)
        with self.torch.inference_mode():
            vector = self.model.get_image_features(**inputs)
        return normalize(vector.cpu().numpy()[0])

    def text(self, text):
        # The catalog's explicit English metadata suits these English text encoders.
        if self.family == 'clip':
            inputs = self.processor(text=[text], return_tensors='pt', padding=True, truncation=True, max_length=77).to(self.device)
        else:
            # SigLIP was trained on lowercase text padded to 64 tokens.
            inputs = self.processor(text=[text.lower()], return_tensors='pt', padding='max_length', truncation=True, max_length=64).to(self.device)
        with self.torch.inference_mode():
            vector = self.model.get_text_features(**inputs)
        return normalize(vector.cpu().numpy()[0])

def get_encoder():
    global _encoder
    with _lock:
        if _encoder is None:
            _encoder = ClipEncoder()
    return _encoder

def embedding_dir():
    # The default model keeps the original flat layout; any other model gets its own folder so files never mix across models.
    if settings.clip_model == DEFAULT_MODEL:
        return 'data/embeddings'
    return 'data/embeddings/' + re.sub(r'[^a-z0-9]+', '-', settings.clip_model.lower()).strip('-')

def image_path(product):
    # Catalog paths are constrained to static images/uploads; never resolve a client path.
    if not product.thumbnail.startswith(('/static/images/', '/static/uploads/')):
        return None
    path = (ROOT / 'app' / product.thumbnail.lstrip('/')).resolve()
    root = (ROOT / 'app/static').resolve()
    return path if path.is_relative_to(root) and path.is_file() else None

def fingerprint(product):
    path = image_path(product)
    metadata = '|'.join(str(getattr(product, key)) for key in ['name', 'description', 'clip_text', 'color', 'material', 'style', 'thumbnail'])
    digest = hashlib.sha256((settings.clip_model + metadata).encode())
    if path:
        digest.update(path.read_bytes())
    return digest.hexdigest()

def generate_embeddings(db, products):
    encoder = get_encoder()
    count = 0
    for product in products:
        current = db.get(ProductEmbedding, product.id)
        stamp = fingerprint(product)
        if current and current.fingerprint == stamp and (ROOT / current.embedding_path).exists():
            continue
        text = product.clip_text or f'{product.name}. {product.description}. {product.color}, {product.material}, {product.style}'
        text_vector = encoder.text(text)
        path = image_path(product)
        image_vector = None
        if path:
            try:
                with Image.open(path) as image:
                    image_vector = encoder.image(image)
            except (OSError, ValueError):
                log.warning('Invalid catalog image for product %s; text embedding only', product.id)
        combined = normalize(0.6 * image_vector + 0.4 * text_vector) if image_vector is not None else text_vector
        relative = f'{embedding_dir()}/product-{product.id}.npz'
        (ROOT / relative).parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(ROOT / relative, image=image_vector if image_vector is not None else np.empty(0), text=text_vector, combined=combined)
        if current is None:
            current = ProductEmbedding(product_id=product.id)
            db.add(current)
        current.fingerprint = stamp
        current.embedding_path = relative
        current.model_version = settings.clip_model
        current.image_available = image_vector is not None
        current.updated_at = now()
        db.commit()
        count += 1
    return {'updated': count, 'total': len(products), 'model': settings.clip_model}
