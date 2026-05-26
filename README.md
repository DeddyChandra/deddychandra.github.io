# deddychandra.github.io

Personal portfolio for **Deddy Chandra** — Senior Software Engineer @ Traveloka.

Live at **https://deddychandra.github.io/**

## Stack

- Vanilla HTML / CSS / JS — zero build step
- Custom design system with CSS variables (dark / light theme)
- Tiny i18n engine: English / 中文 / Bahasa Indonesia
- Hosted on GitHub Pages

## Project structure

```
.
├── index.html              # main portfolio
├── now.html                # /now page (currently working on)
├── uses.html               # /uses page (tools & gear)
├── 404.html                # custom 404
├── blog/
│   ├── index.html          # blog list — add new posts here
│   └── posts/
│       └── *.html          # individual posts (just copy a template)
├── assets/
│   ├── css/style.css       # full stylesheet (design tokens at the top)
│   ├── js/
│   │   ├── theme.js        # dark/light toggle, runs early (no FOUC)
│   │   ├── i18n.js         # data-i18n attribute loader
│   │   └── main.js         # scroll reveal, mobile nav, age/yoe calc
│   ├── i18n/
│   │   ├── en.json         # English strings
│   │   ├── zh.json         # 中文
│   │   └── id.json         # Bahasa Indonesia
│   ├── img/                # favicon + portfolio images
│   └── files/
│       └── Deddy_Chandra_CV.pdf
├── ksei/                   # side project: KSEI PDF parser
├── trading/                # side project: IDX orderbook viewer
├── JossPaper.html          # side project: Joss paper converter
├── images/joss/            # joss paper assets (used by JossPaper.html)
└── scripts/orderbook.js    # used by trading/
```

## Local preview

The page uses `fetch()` to load i18n JSON, so opening `index.html` directly via `file://` will not work. Use any static server:

```powershell
# Python 3
py -m http.server 8000

# Node
npx http-server -p 8000

# Then open http://localhost:8000
```

## Adding a blog post

1. Copy `blog/posts/welcome.html` to a new file like `blog/posts/my-post.html`.
2. Update the `<title>`, `<meta description>`, the `<h1>`, and the body inside `<article class="prose">`.
3. Add a row to `blog/index.html`:

   ```html
   <a class="post-row" href="/blog/posts/my-post.html">
     <span class="post-date">2026-06-01</span>
     <span class="post-title">My new post title</span>
     <span class="post-meta">5 min read</span>
   </a>
   ```

## Adding a translation string

1. Add the key to all three files: `assets/i18n/en.json`, `zh.json`, `id.json`.
2. In the HTML, reference it: `<span data-i18n="my.key">Fallback English</span>`.
3. For HTML content with `<strong>` etc., use `data-i18n-html="my.key"`.
4. For attributes (alt, title, content, aria-label), use `data-i18n-attr="alt:my.alt_key,title:my.title_key"`.

## Customizing colors

Edit the CSS variables at the top of `assets/css/style.css`. The dark theme is in `:root`, the light theme overrides are in `[data-theme="light"]`. Accent color drives buttons, links, badges, and highlights.

## Updating the CV

Replace `assets/files/Deddy_Chandra_CV.pdf` with the latest export. The "View Resume" button in the hero links to that exact path.
