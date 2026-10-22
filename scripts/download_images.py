"""Restore catalog images using the checked-in source manifest; no model/API key needed."""
import json
import io
import sys
from pathlib import Path
from urllib.parse import urlparse
import httpx
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

if __name__=='__main__':
    records=json.loads((ROOT/'app/static/images/assets.json').read_text(encoding='utf-8-sig'))
    with httpx.Client(timeout=45,follow_redirects=False) as client:
        for record in records:
            filename=record['filename']
            if Path(filename).name!=filename: raise ValueError('Unsafe filename')
            url=record['source_url']
            if urlparse(url).hostname!='images.unsplash.com': raise ValueError('Only the documented Unsplash CDN is allowed')
            target=ROOT/'app/static/images'/filename
            if target.exists(): continue
            response=client.get(url);response.raise_for_status()
            with Image.open(io.BytesIO(response.content)) as image:
                image.convert('RGB').save(target,'JPEG',quality=90)
            print(filename)
