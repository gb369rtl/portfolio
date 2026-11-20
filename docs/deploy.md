# Deployment

The site is on GitHub Pages: <https://gb369rtl.github.io/portfolio/>

## How it gets there

`.github/workflows/deploy.yml` runs on every push to `main`:

1. `npm run verify` (lint, formatting, the content check, the tests). If anything fails, nothing is deployed.
2. `npm run build`, which copies what a browser asks for into `dist/`: `index.html`, `assets/`, `content/` and `src/`.
3. `dist/` is uploaded and published by GitHub's own Pages actions.

So editing a file in `content/` and pushing to `main` updates the live site, usually within two minutes. A deployment can also be started by hand from the Actions tab ("Deploy", "Run workflow").

The page uses relative addresses throughout, so it works the same under `/portfolio/` and at the root of its own domain.

## The address in `content/site.json`

`url` is the site's public address. Link previews (LinkedIn, WhatsApp, Slack) need it, because they only accept an absolute address for the preview image. After changing it, run `npm run sync` to write it into `index.html`.

## Moving to a custom domain

For `geetam.dev`, once the domain is bought:

1. **In the repository:** Settings, Pages, Custom domain: enter `geetam.dev` and save. Because the site is deployed by a workflow, no `CNAME` file is needed in the repository.
2. **At the domain registrar,** add these DNS records:

   | Type  | Name | Value              |
   | ----- | ---- | ------------------ |
   | A     | @    | 185.199.108.153    |
   | A     | @    | 185.199.109.153    |
   | A     | @    | 185.199.110.153    |
   | A     | @    | 185.199.111.153    |
   | CNAME | www  | gb369rtl.github.io |

   These are GitHub's published addresses for Pages; check them against [GitHub's guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) on the day, in case they have changed.

3. **Wait for the certificate.** GitHub issues one itself, usually within an hour of the DNS records being found. Then tick "Enforce HTTPS". A `.dev` domain only works over HTTPS, so the site will not open until this step is done.
4. **Tell the page its new address:** set `"url": "https://geetam.dev/"` in `content/site.json`, run `npm run sync`, and push.

The old `gb369rtl.github.io/portfolio/` address then redirects to the domain.
