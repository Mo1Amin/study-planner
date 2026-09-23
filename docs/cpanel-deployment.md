# Upload to cPanel

Munazzami is a static site. It does not need PHP, MySQL, a database setup, or environment variables.

## Prepare the files

```bash
npm install
npm run build
```

The production site is generated in `dist/`. Vite copies `public/.htaccess` into that folder. Upload the **contents** of `dist/`, including `.htaccess` and the `assets/` directory.

## Upload with cPanel File Manager

1. Open **File Manager** and choose the document root for the domain or subdomain, commonly `public_html/`.
2. Enable **Show Hidden Files (dotfiles)** in File Manager settings so `.htaccess` is visible.
3. Upload and extract the provided `munazzami-cpanel.zip` into that document root, or upload the contents of `dist/` directly.
4. Confirm that `index.html`, `.htaccess`, and `assets/` are directly inside the document root, not nested inside another `dist/` folder.
5. Open the domain over HTTPS. Enable the cPanel AutoSSL certificate first if the domain does not already have HTTPS.

The `.htaccess` file disables directory listings, falls back to `index.html`, avoids stale HTML caching, and gives fingerprinted build assets long-lived caching. The rules are guarded by Apache module checks where possible; the hosting account must allow `.htaccess` overrides for rewrite and headers.

## Data and backend

Subjects, tasks, schedules, and map links are stored in that browser's IndexedDB, with a local-storage fallback. Each device has its own data. Use **Settings → نزّل نسخة احتياطية** to export a JSON backup and **استعد من نسخة** to restore it on another device.

A backend becomes necessary only for shared accounts, server-side backups, or automatic sync across devices. Those features are not part of this static release.
