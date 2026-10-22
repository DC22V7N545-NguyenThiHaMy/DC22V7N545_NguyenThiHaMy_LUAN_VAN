"""Validate expanded catalog and storefront interactions in installed Chrome."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'
ART.mkdir(exist_ok=True)
BASE='http://127.0.0.1:8010'

def fullshot(page,name):
    for y in range(0,page.locator('body').bounding_box()['height'].__int__(),700):
        page.evaluate('(y)=>window.scrollTo(0,y)',y)
        page.wait_for_timeout(80)
    page.evaluate('window.scrollTo(0,0)')
    page.wait_for_timeout(400)
    page.screenshot(path=str(ART/name),full_page=True)

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True)
        errors=[]
        page=browser.new_page(viewport={'width':1440,'height':1050})
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto(BASE,wait_until='networkidle')
        page.locator('.editorial-hero h1').wait_for()
        assert page.locator('#home-products .product-card').count()==6
        assert page.locator('.category-card').count()==4
        assert page.locator('.product-rail .product-card').count()==8
        assert page.locator('.journal-card').count()==3
        page.locator('[data-hero-pause]').click()
        assert page.locator('[data-hero-pause]').get_attribute('aria-pressed')=='true'
        page.locator('[data-hero-slide="1"]').click()
        assert page.locator('.hero-copy h1').inner_text().startswith('Một chút nắng.')
        assert page.locator('[data-hero-slide="1"]').get_attribute('aria-pressed')=='true'
        page.locator('[data-home-tab="Nam"]').click()
        page.wait_for_function("document.querySelector('#home-products')?.getAttribute('aria-busy') !== 'true'")
        assert page.locator('#home-products .product-card').count()==6
        assert page.locator('.hero-copy h1').inner_text().startswith('Một chút nắng.')
        page.locator('[data-studio-action="quiz"]').click()
        page.locator('[data-quiz-key="gender"][data-quiz-value="Nữ"]').click()
        page.locator('[data-quiz-next]').click()
        page.locator('[data-quiz-key="style"][data-quiz-value="Nữ tính"]').click()
        page.locator('[data-quiz-next]').click()
        page.locator('[data-quiz-value="1500000"]').click()
        page.locator('[data-quiz-next]').click()
        page.locator('.active-filters').wait_for()
        assert 'style=' in page.url
        assert page.locator('.product-card').count()>0
        page.locator('[data-clear-filter="style"]').click()
        page.wait_for_function("!new URL(location.href).searchParams.has('style')")
        page.locator('[data-action="search"]').click()
        page.locator('#search-input').fill('Élise')
        page.locator('.suggestion-list>a').first.wait_for()
        page.locator('.suggestion-list>a').first.click()
        page.locator('.detail-image').wait_for()
        assert '/san-pham/1' in page.url
        page.locator('.detail-image').click()
        page.locator('.zoom-photo').wait_for()
        page.get_by_role('button',name='Đóng',exact=True).click()
        page.locator('[data-size-guide]').click()
        page.locator('.size-guide').wait_for()
        assert page.locator('.size-guide tbody tr').count()==4
        page.get_by_role('button',name='Đóng',exact=True).click()
        if page.locator('[data-expand-description]').count():
            page.locator('[data-expand-description]').click()
            assert page.locator('[data-expand-description]').get_attribute('aria-expanded')=='true'
        page.locator('[data-detail-quantity="1"]').click()
        assert page.locator('#detail-quantity-value').inner_text()=='2'
        page.goto(BASE+'/cam-hung/tu-do-toi-gian',wait_until='networkidle')
        assert page.locator('.article-body>section').count()==4
        assert page.locator('.article-heading h1').inner_text().startswith('Tủ đồ ít hơn.')
        assert not errors,errors
        page.close()
        # Screenshots with reduced motion also verify this accessibility mode.
        context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce')
        page=context.new_page()
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto(BASE,wait_until='networkidle')
        assert page.locator('.scroll-reveal').count()==0
        fullshot(page,'desktop-home-v2.png')
        page.goto(BASE+'/san-pham?sort=newest',wait_until='networkidle')
        assert page.locator('.product-card').count()==12
        assert page.locator('.pagination button').count()>=20
        fullshot(page,'desktop-catalog-v2.png')
        page.goto(BASE+'/san-pham/1',wait_until='networkidle')
        fullshot(page,'desktop-detail-v2.png')
        page.goto(BASE+'/cam-hung',wait_until='networkidle')
        fullshot(page,'journal-v2.png')
        page.set_viewport_size({'width':390,'height':844})
        page.goto(BASE,wait_until='networkidle')
        fullshot(page,'mobile-home-v2.png')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Home overflow'
        page.goto(BASE+'/san-pham?sort=newest',wait_until='networkidle')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Catalog overflow'
        page.get_by_role('button',name='Bộ lọc',exact=True).click()
        assert page.locator('[name=style]').is_visible()
        page.locator('.filter-drawer-head button').click()
        fullshot(page,'mobile-catalog-v2.png')
        page.goto(BASE+'/san-pham/1',wait_until='networkidle')
        assert page.locator('.mobile-buy-bar').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Detail overflow'
        fullshot(page,'mobile-detail-v2.png')
        assert not errors,errors
        browser.close()
    print('V2 UI passed: hero slider, AJAX tabs, quiz, filter chips, search suggestions, zoom, quantity, journals, mobile, reduced motion and no JS errors.')
