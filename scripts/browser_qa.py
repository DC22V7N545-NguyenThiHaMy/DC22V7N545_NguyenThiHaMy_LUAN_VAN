"""Optional local UI smoke test: pip install playwright (uses installed Chrome)."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts'
OUTPUT.mkdir(exist_ok=True)

if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width':1440,'height':1100}, device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:8010/',wait_until='networkidle')
        page.get_by_role('heading',name='Phong cách. Là chính bạn.').wait_for()
        page.screenshot(path=str(OUTPUT/'desktop-home.png'),full_page=True)
        assert page.locator('#home-products .product-card').count()==6
        page.locator('[data-quick="1"]').first.click()
        page.get_by_role('dialog').wait_for()
        page.screenshot(path=str(OUTPUT/'quick-view.png'))
        page.get_by_role('button',name='Đóng',exact=True).click()
        page.get_by_role('button',name='Tìm kiếm',exact=True).click()
        page.locator('#search-input').fill('Élise')
        page.locator('#search-input').press('Enter')
        page.get_by_role('heading',name='Kết quả cho “Élise”').wait_for()
        assert page.locator('.product-card').count()==1
        page.screenshot(path=str(OUTPUT/'catalog-search.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/tai-khoan',wait_until='networkidle')
        page.locator('[data-demo="user"]').click()
        page.locator('#auth-form button[type=submit]').click()
        page.get_by_role('heading',name='Một chút cảm hứng cho Linh.').wait_for()
        page.screenshot(path=str(OUTPUT/'recommendations.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/san-pham/1',wait_until='networkidle')
        page.get_by_role('button',name='M',exact=True).click()
        page.get_by_role('button',name='Thêm vào giỏ hàng',exact=True).click()
        page.locator('.toast').filter(has_text='Đã thêm vào giỏ hàng').wait_for()
        page.goto('http://127.0.0.1:8010/gio-hang',wait_until='networkidle')
        page.locator('.cart-item').first.wait_for()
        page.screenshot(path=str(OUTPUT/'cart.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/tim-bang-anh',wait_until='networkidle')
        page.locator('#image-file').set_input_files(str(ROOT/'app/static/images/dress-linen.jpg'))
        page.locator('.image-search-score').first.wait_for(timeout=120000)
        page.screenshot(path=str(OUTPUT/'image-search.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/',wait_until='networkidle')
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(OUTPUT/'mobile-home.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile horizontal overflow'
        page.get_by_role('button',name='Mở menu').click()
        page.locator('#mobile-nav').get_by_role('link',name='Thời trang nữ',exact=True).click()
        page.get_by_role('button',name='Bộ lọc',exact=True).click()
        assert page.locator('#filter-sidebar').is_visible()
        page.screenshot(path=str(OUTPUT/'mobile-catalog.png'),full_page=True)
        assert not errors, errors
        browser.close()
        print('UI smoke passed; desktop, mobile, search, modal, login, cart and real CLIP image search verified.')
