"""Optional browser checks for admin and checkout, against running local instance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

ROOT=Path(__file__).resolve().parents[1]

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1100})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto('http://127.0.0.1:8010/tai-khoan',wait_until='networkidle')
        page.fill('#identifier','admin@velastyle.vn');page.fill('#password','Vela@12345')
        page.locator('#auth-form button[type=submit]').click()
        page.locator('.admin-head').wait_for()
        page.goto('http://127.0.0.1:8010/quan-tri/ai',wait_until='networkidle')
        page.locator('[data-ai-task="rebuild-cf"]').click()
        page.locator('#ai-runs').get_by_text('Hoàn tất',exact=True).first.wait_for(timeout=30000)
        page.screenshot(path=str(ROOT/'artifacts/admin-ai.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/quan-tri/danh-gia',wait_until='networkidle')
        page.locator('#evaluation-k').select_option('5')
        page.locator('[data-ai-task="evaluate"]').click()
        page.locator('.evaluation-chart-grid').wait_for(timeout=30000)
        page.screenshot(path=str(ROOT/'artifacts/admin-evaluation.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/quan-tri/san-pham',wait_until='networkidle')
        page.locator('[data-action="admin-add-product"]').click()
        page.locator('#product-name').fill('Thiết kế kiểm tra giao diện')
        page.locator('#product-description').fill('Sản phẩm tạm dùng để kiểm tra luồng thêm thiết kế và upload ảnh thật.')
        page.locator('#product-clip-text').fill('A burgundy button front midi dress')
        page.locator('#product-photo-upload').set_input_files(str(ROOT/'app/static/images/dress-linen.jpg'))
        page.locator('#admin-product-form button[type=submit]').click()
        page.get_by_role('cell',name='Thiết kế kiểm tra giao diện',exact=True).wait_for()
        row=page.get_by_role('row').filter(has_text='Thiết kế kiểm tra giao diện')
        row.get_by_role('button',name='Chỉnh sửa',exact=True).click()
        assert page.locator('#product-clip-text').input_value()=='A burgundy button front midi dress'
        page.get_by_role('button',name='Đóng',exact=True).click()
        row.get_by_role('button',name='Ngừng bán',exact=True).click()
        page.get_by_role('button',name='Xác nhận ngừng bán',exact=True).click()
        page.get_by_role('cell',name='Thiết kế kiểm tra giao diện',exact=True).wait_for(state='detached')
        page.goto('http://127.0.0.1:8010/quan-tri',wait_until='networkidle')
        page.screenshot(path=str(ROOT/'artifacts/admin-dashboard.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/tai-khoan',wait_until='networkidle')
        page.get_by_role('button',name='Đăng xuất',exact=True).click()
        page.locator('.hero').wait_for()
        page.goto('http://127.0.0.1:8010/tai-khoan',wait_until='networkidle')
        page.fill('#identifier','linh@velastyle.vn');page.fill('#password','Vela@12345')
        page.locator('#auth-form button[type=submit]').click()
        page.locator('.for-you-hero').wait_for()
        page.goto('http://127.0.0.1:8010/gio-hang',wait_until='networkidle')
        if not page.locator('.cart-item').count():
            page.goto('http://127.0.0.1:8010/san-pham/1',wait_until='networkidle')
            page.get_by_role('button',name='Thêm vào giỏ hàng',exact=True).click()
            page.locator('.toast').filter(has_text='Đã thêm vào giỏ hàng').wait_for()
        page.goto('http://127.0.0.1:8010/thanh-toan',wait_until='networkidle')
        page.locator('#checkout-phone').fill('0901234567')
        page.locator('#checkout-address').fill('Địa chỉ kiểm thử mô phỏng, Thành phố Hồ Chí Minh')
        page.get_by_role('button',name='Xác nhận đặt hàng',exact=True).click()
        page.locator('.success-state').wait_for()
        page.screenshot(path=str(ROOT/'artifacts/checkout-success.png'),full_page=True)
        page.goto('http://127.0.0.1:8010/don-hang',wait_until='networkidle')
        assert page.locator('.order-card').count()>0
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(ROOT/'artifacts/mobile-orders.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        browser.close()
    print('Admin CRUD, real image upload, CLIP metadata preservation, CF rebuild, evaluation charts and simulated checkout passed.')
