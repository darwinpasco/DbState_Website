# DbState Private Beta Website

This folder contains a small static website for DbState's private beta.

## Open locally

Open `website/index.html` directly in a browser, or serve the folder with any static file server.

Example:

```powershell
python -m http.server 8000 --directory website
```

Then open `http://localhost:8000`.

## Update the private beta form URL

Edit the `privateBetaFormUrl` value in `website/index.html` inside the `window.DBSTATE_CONFIG` block.

Use the published Google Form link.

If the URL is blank, the CTA stays on the page and a visible note tells visitors the form URL has not been configured yet.

## Update the demo video

Edit the `demoVideoEmbedUrl` value in `website/index.html` inside the same `window.DBSTATE_CONFIG` block.

Use the YouTube no-cookie embed URL, not the public watch URL, if you want to keep the embed configuration in one place.

## Deploy later

This is a static site with no build step. You can deploy the `website/` folder to any static host later, such as:

- GitHub Pages
- Netlify
- Vercel static hosting
- A basic web server or object storage bucket
