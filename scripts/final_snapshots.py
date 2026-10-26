"""Optional final viewport and dashboard snapshots for the local VELA instance."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:8010'

if __name__=='__main__':
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1050},reduced_motion='reduce')
        page.goto(BASE,wait_until='networkidle')
        page.screenshot(path=str(ROOT/'artifacts/home-first-screen-v2.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(ROOT/'artifacts/mobile-first-screen-v2.png'))
        page.set_viewport_size({'width':1440,'height':1050})
        page.goto(BASE+'/tai-khoan',wait_until='networkidle')
        page.fill('#identifier','admin@velastyle.vn');page.fill('#password','Vela@12345')
        page.locator('#auth-form button[type=submit]').click()
        page.locator('.admin-head').wait_for()
        page.screenshot(path=str(ROOT/'artifacts/admin-dashboard-v2.png'),full_page=True)
        page.goto(BASE+'/quan-tri/danh-gia',wait_until='networkidle')
        page.locator('.evaluation-chart-grid').wait_for()
        page.screenshot(path=str(ROOT/'artifacts/admin-evaluation-v2.png'),full_page=True)
        page.context.clear_cookies()
        results=[]
        for width in [320,768,1280]:
            page.set_viewport_size({'width':width,'height':900})
            for path in ['/','/san-pham?sort=newest','/san-pham/1','/cam-hung/tu-do-toi-gian']:
                page.goto(BASE+path,wait_until='networkidle')
                dimensions=page.evaluate('({viewport:innerWidth,content:document.documentElement.scrollWidth})')
                assert dimensions['content']<=dimensions['viewport'],(width,path,dimensions)
                results.append({'width':width,'path':path,'overflow':False})
        print(json.dumps({'responsive':results,'admin_snapshot':True},ensure_ascii=True))
        browser.close()
