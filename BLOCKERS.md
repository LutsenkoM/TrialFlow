# Blockers

- **GitHub Pages must be enabled once by the repo owner.** The workflow deploys with `actions/deploy-pages`, but switching the repository's Pages source to "GitHub Actions" needs admin rights that the workflow token doesn't have (and `gh` wasn't available locally). Settings → Pages → Build and deployment → Source: **GitHub Actions**, then re-run the CI workflow on `main`.
