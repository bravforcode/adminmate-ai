# Self-Hosted Fonts

Fonts used in this project:
- Inter (300, 400, 500, 600, 700) — UI
- IBM Plex Sans (400, 600) — UI  
- Noto Sans Thai (300, 400, 500, 600, 700) — Thai UI
- Sarabun (400, 700) — PDF generation

## How to Self-Host
1. Download from Google Fonts: https://fonts.google.com/
2. Use `@font-face` in CSS
3. Update `index.html` — remove Google Fonts CDN link
4. Update `tailwind.config` — update font family

## Note to Developer
Self-hosting fonts requires downloading ~10MB of font files.
For now, fonts are loaded from Google Fonts CDN with crossorigin="anonymous".
To fully self-host, download the font files and place them in this directory.
