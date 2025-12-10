# NPM Publishing Setup

This project uses GitHub Actions to automatically publish to NPM when code is merged to the `main` branch, with automatic version bumping.

## Setup Instructions

### 1. Configure NPM Trusted Publishing (OIDC)

The workflow uses NPM's **Trusted Publishers** feature, which eliminates the need for long-lived tokens.

**Steps to set up:**

1. Go to [npmjs.com](https://www.npmjs.com/) and sign in
2. Navigate to your package (or create it with `npm publish` for the first time)
3. Go to **Settings** → **Publishing Access**
4. Click **Add Trusted Publisher**
5. Configure the GitHub Actions publisher:
   - **Provider**: GitHub Actions
   - **Repository owner**: `mattapperson`
   - **Repository name**: `poof`
   - **Workflow name**: `publish.yml`
   - **Environment name**: (leave empty)

6. Save the configuration

### 2. First-Time Package Publication

If this is the first time publishing this package to NPM:

```bash
# Build the package
bun run build

# Publish manually for the first time
npm publish --access public
```

After the initial publish, all subsequent releases will be automated.

### 3. How It Works

When code is merged to `main`:

1. **Build**: The project is built using Bun
2. **Version Bump**: The patch version is automatically incremented (e.g., 1.0.0 → 1.0.1)
3. **Git Commit**: The version change is committed with `[skip ci]` to prevent loops
4. **Git Tag**: A version tag (e.g., `v1.0.1`) is created
5. **NPM Publish**: The package is published to NPM using OIDC authentication (no tokens needed!)
6. **Provenance**: NPM attestation is automatically generated for supply chain security

### 4. Security Benefits

Using Trusted Publishers provides:

- ✅ No long-lived tokens to manage or rotate
- ✅ Automatic provenance attestation
- ✅ Reduced attack surface for supply chain attacks
- ✅ Compliance with NPM's new security requirements (classic tokens sunset Nov 2025)

### 5. Manual Version Bumps

To manually control versioning, you can:

- **Patch**: `npm version patch` (1.0.0 → 1.0.1)
- **Minor**: `npm version minor` (1.0.0 → 1.1.0)
- **Major**: `npm version major` (1.0.0 → 2.0.0)

Then push to main:
```bash
git push origin main --tags
```

## Troubleshooting

**Error: "Package not found"**
- Ensure you've done the first manual publish
- Check that the package name in `package.json` is available on NPM

**Error: "Trusted publishing not configured"**
- Verify you've added the GitHub Actions trusted publisher in NPM settings
- Double-check the repository owner and name match exactly

**Error: "Permission denied"**
- Ensure the workflow has `id-token: write` permission (already configured)
- Verify the trusted publisher configuration in NPM matches your repository

## Reference

- [NPM Trusted Publishers Documentation](https://docs.npmjs.com/generating-provenance-statements#using-third-party-package-publishing-tools)
- [GitHub's NPM Security Announcement](https://github.blog/changelog/2025-09-29-strengthening-npm-security-important-changes-to-authentication-and-token-management/)
