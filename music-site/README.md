# Music site — free, static, no backend needed

A simple music landing page for uploading singles + directing fans to a WhatsApp group and a Telegram group.

Hosted **free** on GitHub Pages (or Netlify / Cloudflare Pages — any static host works).

## What's in here

```
music-site/
  index.html      Public site (music player + join buttons)
  admin.html      "Upload a new single" helper walkthrough
  config.js       Edit artist name / tagline / links here
  style.css
  app.js
  tracks.json     List of all tracks (auto-loaded by the site)
  audio/          MP3 files go here
  covers/         Cover art (JPG / PNG) go here
```

## One-time setup (10 minutes)

1. **Fork or push this repo to your own GitHub account.**
2. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main`, Folder: `/` (or `/music-site` if you keep it in a subfolder).** Save.
3. Wait ~1 minute. GitHub gives you a live URL like `https://<username>.github.io/<repo>/music-site/`.
4. Open `music-site/config.js` and change the `artistName` and (optionally) the tagline. WhatsApp + Telegram links are already filled in.
5. That's it — the site is live.

### Custom domain (optional)

Buy a domain (Namecheap, Porkbun, etc.) and follow the free GitHub Pages custom-domain guide: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>.

## Adding a new single (for the artist, non-dev)

Open your live site and click **Upload** in the top-right nav. It walks through:

1. Drag the MP3 into `music-site/audio/` on GitHub.
2. Drag the cover art into `music-site/covers/` on GitHub.
3. Fill the form on the Upload page → click **Generate the snippet** → **Copy to clipboard**.
4. Open `music-site/tracks.json` on GitHub, click the pencil, paste the snippet as a new entry inside the `"tracks"` array, commit.
5. Refresh the site — the new single shows up automatically.

## Notes

- `tracks.json` is sorted newest-first by `releaseDate`.
- MP3 files should be under ~20 MB each to keep the site snappy. Compress with anything free (e.g. Audacity → export as MP3, 128–192 kbps).
- Cover images: 800×800 JPG works great, keep under 300 KB.
- To hide the sample track, just remove it from `tracks.json`.
