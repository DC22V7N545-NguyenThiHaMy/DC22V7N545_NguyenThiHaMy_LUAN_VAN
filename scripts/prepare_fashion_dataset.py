"""Download 240 distinct, matching, high-resolution fashion sample assets.

The source name, colour, category and gender are retained. Vietnamese display
names, prices, stock assumptions, material and style tags are illustrative demo
editorial data, never claimed as current merchant offers.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import random
from collections import Counter, defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'app/static/images'
STYLES_URL = 'https://raw.githubusercontent.com/Fetching-Korea/fashion-product-images-sample/main/styles.json'
LINKS_URL = 'https://raw.githubusercontent.com/Akash-100805/Fashion_Recommendation_V2/main/images.csv'
DATASET_URL = 'https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset'

# type -> Vietnamese article name, website category, illustrative price, material tag
TYPES = {
    'Tshirts': ('Áo thun', 'Áo & sơ mi', 290000, 'Cotton'),
    'Shirts': ('Áo sơ mi', 'Áo & sơ mi', 490000, 'Cotton'),
    'Tops': ('Áo kiểu', 'Áo & sơ mi', 390000, 'Vải dệt'),
    'Tunics': ('Áo dáng dài', 'Áo & sơ mi', 590000, 'Vải dệt'),
    'Dresses': ('Đầm', 'Đầm & váy', 890000, 'Vải dệt'),
    'Jumpsuit': ('Jumpsuit', 'Bộ trang phục', 790000, 'Vải dệt'),
    'Casual Shoes': ('Giày thường ngày', 'Giày', 690000, 'Chất liệu tổng hợp'),
    'Sports Shoes': ('Giày thể thao', 'Giày', 990000, 'Vải dệt'),
    'Formal Shoes': ('Giày công sở', 'Giày', 1090000, 'Chất liệu tổng hợp'),
    'Heels': ('Giày cao gót', 'Giày', 790000, 'Chất liệu tổng hợp'),
    'Flats': ('Giày bệt', 'Giày', 590000, 'Chất liệu tổng hợp'),
    'Sandals': ('Giày sandal', 'Giày', 490000, 'Chất liệu tổng hợp'),
    'Sports Sandals': ('Sandal thể thao', 'Giày', 590000, 'Chất liệu tổng hợp'),
    'Flip Flops': ('Dép xỏ ngón', 'Giày', 190000, 'Chất liệu tổng hợp'),
    'Handbags': ('Túi xách', 'Túi & phụ kiện', 790000, 'Chất liệu tổng hợp'),
    'Clutches': ('Ví cầm tay', 'Túi & phụ kiện', 490000, 'Chất liệu tổng hợp'),
    'Wallets': ('Ví gấp', 'Túi & phụ kiện', 390000, 'Chất liệu tổng hợp'),
    'Backpacks': ('Balo', 'Túi & phụ kiện', 690000, 'Vải dệt'),
    'Rucksacks': ('Balo du lịch', 'Túi & phụ kiện', 890000, 'Vải dệt'),
    'Laptop Bag': ('Túi laptop', 'Túi & phụ kiện', 690000, 'Vải dệt'),
    'Belts': ('Thắt lưng', 'Túi & phụ kiện', 290000, 'Chất liệu tổng hợp'),
    'Watches': ('Đồng hồ', 'Túi & phụ kiện', 1290000, 'Chất liệu tổng hợp'),
    'Sunglasses': ('Kính mát', 'Túi & phụ kiện', 490000, 'Chất liệu tổng hợp'),
    'Caps': ('Mũ lưỡi trai', 'Túi & phụ kiện', 250000, 'Cotton'),
    'Ties': ('Cà vạt', 'Túi & phụ kiện', 290000, 'Vải dệt'),
    'Socks': ('Tất', 'Túi & phụ kiện', 99000, 'Cotton'),
    'Earrings': ('Hoa tai', 'Túi & phụ kiện', 290000, 'Chất liệu tổng hợp'),
    'Pendant': ('Mặt dây chuyền', 'Túi & phụ kiện', 390000, 'Chất liệu tổng hợp'),
    'Necklace and Chains': ('Dây chuyền', 'Túi & phụ kiện', 490000, 'Chất liệu tổng hợp'),
    'Bracelet': ('Vòng tay', 'Túi & phụ kiện', 290000, 'Chất liệu tổng hợp'),
    'Ring': ('Nhẫn', 'Túi & phụ kiện', 290000, 'Chất liệu tổng hợp'),
    'Trousers': ('Quần dài', 'Quần', 590000, 'Vải dệt'),
    'Jeans': ('Quần jeans', 'Quần', 690000, 'Denim'),
    'Shorts': ('Quần short', 'Quần', 390000, 'Vải dệt'),
    'Leggings': ('Quần legging', 'Quần', 390000, 'Vải dệt'),
    'Jeggings': ('Quần jegging', 'Quần', 490000, 'Vải dệt'),
    'Capris': ('Quần lửng', 'Quần', 490000, 'Vải dệt'),
    'Track Pants': ('Quần thể thao', 'Quần', 590000, 'Vải dệt'),
    'Jackets': ('Áo khoác', 'Áo khoác', 990000, 'Vải dệt'),
    'Shrug': ('Áo khoác lửng', 'Áo khoác', 590000, 'Vải dệt'),
    'Sweaters': ('Áo len', 'Áo khoác', 690000, 'Vải dệt'),
    'Sweatshirts': ('Áo nỉ', 'Áo khoác', 690000, 'Vải dệt'),
}
COLOURS = {
    'Black': 'Đen', 'White': 'Trắng', 'Blue': 'Xanh dương',
    'Navy Blue': 'Xanh navy', 'Red': 'Đỏ', 'Green': 'Xanh lá',
    'Yellow': 'Vàng', 'Pink': 'Hồng', 'Purple': 'Tím', 'Grey': 'Xám',
    'Grey Melange': 'Xám melange', 'Brown': 'Nâu', 'Beige': 'Be',
    'Cream': 'Kem', 'Off White': 'Trắng ngà', 'Silver': 'Bạc',
    'Gold': 'Vàng ánh kim', 'Orange': 'Cam', 'Maroon': 'Đỏ rượu',
    'Olive': 'Xanh olive', 'Teal': 'Xanh teal', 'Turquoise Blue': 'Xanh ngọc',
    'Khaki': 'Khaki', 'Multi': 'Đa sắc', 'Peach': 'Hồng đào',
    'Magenta': 'Hồng tím', 'Lavender': 'Tím lavender', 'Burgundy': 'Đỏ burgundy',
    'Tan': 'Nâu tan', 'Copper': 'Đồng', 'Bronze': 'Đồng',
    'Nude': 'Nude', 'Mauve': 'Tím khói', 'Mustard': 'Vàng mù tạt',
    'Lime Green': 'Xanh chanh', 'Metallic': 'Ánh kim', 'Rust': 'Cam đất',
    'Sea Green': 'Xanh bạc hà', 'Coffee Brown': 'Nâu cà phê',
    'Charcoal': 'Xám than', 'Steel': 'Xám thép', 'Rose': 'Hồng rose',
    'Skin': 'Be nude', 'Fluorescent Green': 'Xanh neon',
}
GENDERS = {'Women': 'Nữ', 'Men': 'Nam', 'Unisex': 'Unisex'}


def get(url):
    response = requests.get(url, timeout=35)
    response.raise_for_status()
    return response


def download(row, links):
    source_url = links.get(f"{row['id']}.jpg", '').replace('http://', 'https://')
    if not source_url.startswith('https://assets.myntassets.com/'):
        return None
    try:
        raw = get(source_url).content
        photo = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
        width, height = photo.size
        if min(width, height) < 300:
            return None
        photo.thumbnail((960, 1280), Image.Resampling.LANCZOS)
        filename = f"catalog-{row['id']}.jpg"
        photo.save(DEST / filename, quality=88, optimize=True)
        article, category, price, material = TYPES[row['articleType']]
        gender = GENDERS[row['gender']]
        colour = COLOURS.get(row['baseColour'])
        if not colour:
            raise ValueError(f"Missing colour translation: {row['baseColour']}")
        usage = row.get('usage', 'Casual')
        style = 'Năng động' if usage == 'Sports' or row['articleType'] in {'Sports Shoes', 'Sports Sandals', 'Track Pants'} else 'Thanh lịch' if usage == 'Formal' or row['articleType'] in {'Formal Shoes', 'Shirts', 'Heels', 'Clutches', 'Watches'} else 'Nữ tính' if row['articleType'] in {'Dresses', 'Tops', 'Flats', 'Earrings'} else 'Tối giản'
        return {
            'source_id': row['id'],
            'name': f"{article} {gender.lower()} {colour.lower()} · {row['id']}",
            'source_name': row['productDisplayName'],
            'source_metadata': row,
            'clip_text': f"{row['productDisplayName']}. {row['gender']} {row['articleType']}, {row['baseColour']}. {usage}. Product photograph.",
            'category': category, 'gender': gender, 'color': colour,
            'material': material, 'style': style,
            'price': price + (int(row['id']) % 5) * 40000,
            'thumbnail': filename,
            'description': f"{article} tông {colour.lower()}, thuộc tuyển chọn {gender.lower()} của VELA. Hình ảnh và thông tin phân loại lấy từ bộ dữ liệu Fashion Product Images. Tên tiếng Việt, giá, chất liệu, phong cách và các lựa chọn mua hàng là dữ liệu minh họa phục vụ đồ án; không phải thông tin xác nhận của nhà sản xuất.",
            'illustrative_fields': ['name', 'description', 'material', 'style', 'price', 'sizes', 'stock'],
            'source_url': source_url,
            'dataset_url': DATASET_URL,
            'original_dimensions': [width, height],
            'dimensions': list(photo.size),
            'original_sha256': hashlib.sha256(raw).hexdigest(),
            'asset_sha256': hashlib.sha256((DEST / filename).read_bytes()).hexdigest(),
        }
    except Exception as exc:
        print(f"Skipped source {row['id']}: {exc}", flush=True)
        return None


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    metadata = get(STYLES_URL).json()
    links = {row['filename']: row['link'] for row in csv.DictReader(io.StringIO(get(LINKS_URL).text))}
    candidates = [row for row in metadata if row['gender'] in GENDERS and row['articleType'] in TYPES]
    # Round-robin by article and gender prevents the large T-shirt group from
    # crowding out dresses, trousers, bags and less common accessories.
    rng = random.Random(20261022)
    rng.shuffle(candidates)
    buckets = defaultdict(deque)
    for row in candidates:
        buckets[(row['articleType'], row['gender'])].append(row)
    ordered = []
    while any(buckets.values()):
        for key in sorted(buckets):
            if buckets[key]:
                ordered.append(buckets[key].popleft())
    manifest, hashes = [], set()
    for start in range(0, len(ordered), 24):
        batch = ordered[start:start + min(24, 240 - len(manifest))]
        if not batch:
            break
        with ThreadPoolExecutor(max_workers=10) as executor:
            for item in executor.map(lambda row: download(row, links), batch):
                if item and item['asset_sha256'] not in hashes:
                    manifest.append(item)
                    hashes.add(item['asset_sha256'])
        print(f"Downloaded {len(manifest)} unique high-resolution fashion products", flush=True)
        if len(manifest) >= 240:
            break
    if len(manifest) < 240:
        raise RuntimeError(f"Only {len(manifest)} usable unique products; expected 240")
    (DEST / 'catalog-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    provenance = {
        'dataset': 'Fashion Product Images Dataset / Small, Param Aggarwal',
        'dataset_url': DATASET_URL,
        'small_dataset_url': 'https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small',
        'metadata_mirror': 'https://github.com/Fetching-Korea/fashion-product-images-sample',
        'image_link_mirror': 'https://github.com/Akash-100805/Fashion_Recommendation_V2/blob/main/images.csv',
        'image_origin': 'Original matching Myntra product photos, assets.myntassets.com, linked by source product ID.',
        'license_listing': 'Kaggle public dataset listing reports MIT. The GitHub metadata mirror has no separate LICENSE file. Product marks belong to their respective owners. No ownership of merchant imagery is asserted.',
        'license_verification_endpoint': 'https://www.kaggle.com/api/v1/datasets/list?search=fashion-product-images-small',
        'demo_notice': 'Vietnamese display names, prices, material/style labels and purchase options are illustrative project data. Original source names, categories, genders and colours are preserved. No invented reviews or ratings.',
        'product_count': len(manifest),
        'unique_image_count': len(hashes),
        'minimum_asset_width': min(item['dimensions'][0] for item in manifest),
        'minimum_asset_height': min(item['dimensions'][1] for item in manifest),
        'categories': dict(Counter(item['category'] for item in manifest)),
        'genders': dict(Counter(item['gender'] for item in manifest)),
        'article_types': dict(Counter(item['source_metadata']['articleType'] for item in manifest)),
    }
    (DEST / 'catalog-provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(provenance, ensure_ascii=False, indent=2), flush=True)


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    main()
