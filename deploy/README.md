# Zero-downtime production deployment

Production uses immutable releases under `/opt/icp-website/releases`, an atomic
`/opt/icp-website/current` symlink, two PM2 cluster workers, and a shared web
asset generation. GitHub Actions invokes `scripts/deploy-production.sh`; do not
run that script directly unless the repository checkout has already been fetched
to the intended commit and the deployment lock is held.

## One-time bootstrap

The droplet must already have Node 22, pnpm 11.3.0, PM2, Nginx, the `deploy`
user, its GitHub deploy key, and `/opt/icp-website/.env`. From the existing
checkout, run:

```bash
sudo bash scripts/bootstrap-zero-downtime.sh
```

The bootstrap adds a persistent 2 GiB `/swapfile`, creates the release layout,
copies the environment to `shared/.env`, builds the first release, converts PM2
to two cluster workers, validates Nginx, and reloads it. It preserves a timestamped
copy of the prior Nginx site and environment file, then leaves the legacy checkout
in place. After bootstrap, edit `shared/.env`; the legacy root `.env` is a symlink
to that file.

Verify afterward:

```bash
readlink -f /opt/icp-website/current
readlink -f /opt/icp-website/web-assets-current
sudo -u deploy -H pm2 list
curl --fail http://127.0.0.1:4000/health/ready
sudo nginx -t
```

Only after those checks and one successful Actions deployment should the unused
legacy root files be removed. Keep `repo`, `releases`, `shared`, `current`,
`web-assets-current`, `.env`, and `.deploy.lock`.

## Rollback and migrations

Activation failures automatically restore the previous release and asset
symlinks, then reload and health-check PM2. Database migrations are never
reversed, so automated deployments accept expand-only migrations. Destructive
contract migrations require a separately scheduled maintenance procedure.
