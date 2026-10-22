"""Visual QA of the seasonal cover and personalized selection, in local Chrome."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:8010'

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True)
        errors=[]
        context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce')
        page=context.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(BASE,wait_until='networkidle')
        page.locator('.atelier-hero').wait_for()
        page.screenshot(path=str(ROOT/'artifacts/atelier-home-desktop.png'))
        assert page.locator('.cover-collection-tabs button').count()==3
        page.locator('[data-hero-slide="1"]').click()
        assert page.locator('.hero-copy h1').inner_text().startswith('Một chút nắng.')
        assert 'dress-floral.jpg' in page.locator('#hero-inset-photo').get_attribute('src')
        assert 'Nữ' in page.locator('.cover-inset').get_attribute('href')
        page.locator('[data-hero-slide="0"]').click()
        page.locator('.cover-personal-link').click()
        page.locator('.style-quiz').wait_for()
        page.get_by_role('button',name='Đóng',exact=True).click()
        page.goto(BASE+'/danh-rieng-cho-ban',wait_until='networkidle')
        assert page.locator('.muse-portrait').count()==3
        assert page.locator('.muse-page h1').inner_text().startswith('Gu của bạn.')
        page.screenshot(path=str(ROOT/'artifacts/atelier-foryou-guest.png'))
        page.goto(BASE+'/tai-khoan',wait_until='networkidle')
        page.locator('[data-demo="user"]').click()
        page.locator('#auth-form button[type=submit]').click()
        page.locator('.muse-hero').wait_for()
        assert page.get_by_role('heading',name='Một chút cảm hứng cho Linh.').count()==1
        page.screenshot(path=str(ROOT/'artifacts/atelier-foryou-desktop.png'))
        page.locator('[data-muse-about]').click()
        page.locator('.muse-explainer').wait_for()
        assert page.locator('.muse-explainer h3').count()==3
        page.get_by_role('button',name='Đóng',exact=True).click()
        page.locator('[data-method="clip"]').click()
        page.wait_for_function("document.querySelector('[data-method=clip]')?.getAttribute('aria-pressed')==='true'")
        assert page.locator('.muse-products .product-card').count()>0
        page.locator('#recommend-gender').select_option('Nam')
        page.wait_for_function("new URL(location.href).searchParams.get('gender')==='Nam' && !document.body.classList.contains('is-navigating')")
        assert page.locator('.muse-products .product-card').count()>0
        page.goto(BASE+'/danh-rieng-cho-ban',wait_until='networkidle')
        page.locator('[data-muse-scroll]').click()
        assert page.locator('#muse-selection').bounding_box()['y']<160
        for width in [320,390,768,1280,1920]:
            page.set_viewport_size({'width':width,'height':1050 if width>600 else 844})
            for route,name in [('/','home'),('/danh-rieng-cho-ban','foryou')]:
                page.goto(BASE+route,wait_until='networkidle')
                dimensions=page.evaluate('({content:document.documentElement.scrollWidth,viewport:innerWidth})')
                assert dimensions['content']<=dimensions['viewport'],(route,width,dimensions)
                if width in [390,1920]:
                    page.screenshot(path=str(ROOT/f'artifacts/atelier-{name}-{width}.png'),full_page=False)
                    if name=='foryou' and width==390:
                        page.evaluate("document.querySelector('#muse-selection').scrollIntoView({block:'start',behavior:'instant'})")
                        page.wait_for_load_state('networkidle')
                        page.screenshot(path=str(ROOT/'artifacts/atelier-foryou-mobile-controls.png'))
        assert not errors,errors
        # Motion enabled: slider remains operable and can be explicitly paused.
        moving=browser.new_page(viewport={'width':1440,'height':1100})
        moving.on('pageerror',lambda error:errors.append(str(error)))
        moving.goto(BASE,wait_until='networkidle')
        moving.locator('[data-hero-pause]').click()
        assert moving.locator('[data-hero-pause]').get_attribute('aria-pressed')=='true'
        moving.locator('[data-hero-direction="1"]').click()
        assert moving.locator('#slide-number').inner_text()=='02'
        assert not errors,errors
        browser.close()
        print('Atelier QA passed: desktop/mobile, 320–1920 px, sliders, pause, inset sync, quiz, personalized/guest hero, model/filter selection, explanation and scroll CTA; no JS errors.')
