from playwright.sync_api import sync_playwright
import os

output_dir = r'C:\Users\menum\Downloads\adminmate-ai\screenshots'
os.makedirs(output_dir, exist_ok=True)

pages_to_capture = [
    ('login', '/login'),
    ('register', '/register'),
    ('dashboard', '/dashboard'),
    ('jobs', '/recruitment/jobs'),
    ('pipeline', '/recruitment/pipeline'),
    ('candidates', '/recruitment/candidates'),
    ('interviews', '/recruitment/interviews'),
    ('hiring', '/hiring'),
    ('documents', '/documents'),
    ('onboarding', '/onboarding'),
    ('chat', '/chat'),
    ('reports', '/reports'),
    ('settings', '/settings'),
    ('settings-compliance', '/settings/compliance'),
    ('monitoring', '/monitoring'),
    ('health', '/health'),
    ('notfound', '/nonexistent-page'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()

    for name, path in pages_to_capture:
        try:
            page.goto(f'http://localhost:5173{path}', wait_until='networkidle', timeout=10000)
            page.wait_for_timeout(500)
            filepath = os.path.join(output_dir, f'{name}.png')
            page.screenshot(path=filepath, full_page=True)
            print(f'OK  {name:20s} -> {path}')
        except Exception as e:
            print(f'ERR {name:20s} -> {str(e)[:80]}')

    browser.close()
    print(f'\nDone. Screenshots in: {output_dir}')
