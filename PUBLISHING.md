# Publishing Guide for r3f-peridot

This guide walks you through the process of publishing your npm package to npm registry.

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **npm CLI**: Make sure you have npm installed (comes with Node.js)

## Step 1: Prepare for Publishing

### 1.1 Update package.json

Make sure to update these fields in `package.json`:

```json
{
  "name": "r3f-peridot",
  "version": "0.1.0",
  "author": "Christian Dimitri",
  "repository": {
    "type": "git",
    "url": "https://github.com/christiandimitri/r3f-peridot.git"
  },
  "bugs": {
    "url": "https://github.com/christiandimitri/r3f-peridot/issues"
  },
  "homepage": "https://github.com/christiandimitri/r3f-peridot#readme"
}
```

### 1.2 Check package name availability

```bash
npm search r3f-peridot
```

If the name is taken, you'll need to choose a different name or use a scoped package like `@christiandimitri/r3f-peridot`.

## Step 2: Test Locally

### 2.1 Build the package

```bash
npm run build
```

### 2.2 Test with npm link

In the package directory:
```bash
npm link
```

In a test project:
```bash
npm link r3f-peridot
```

### 2.3 Test in the example app

```bash
cd examples
npm install
npm run dev
```

Open http://localhost:3000 and verify everything works.

## Step 3: Version Management

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.0.0): Breaking changes
- **MINOR** version (0.1.0): New features, backwards compatible
- **PATCH** version (0.0.1): Bug fixes

Update version:
```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

## Step 4: Login to npm

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

Verify you're logged in:
```bash
npm whoami
```

## Step 5: Publish

### 5.1 Dry run (recommended first time)

```bash
npm publish --dry-run
```

This shows what will be published without actually publishing.

### 5.2 Publish to npm

```bash
npm publish
```

For scoped packages (first time):
```bash
npm publish --access public
```

## Step 6: Verify Publication

1. Visit: `https://www.npmjs.com/package/r3f-peridot`
2. Test installation in a new project:

```bash
mkdir test-install
cd test-install
npm init -y
npm install r3f-peridot
```

## Step 7: Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v0.1.0`
4. Release title: `v0.1.0 - Initial Release`
5. Description: Copy from CHANGELOG or write release notes
6. Publish release

## Automated Publishing with GitHub Actions

The package includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automatically publishes to npm when you create a GitHub release.

### Setup:

1. Get your npm token:
   ```bash
   npm token create
   ```

2. Add it to GitHub Secrets:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

3. Create a release on GitHub, and the workflow will automatically:
   - Run tests
   - Build the package
   - Publish to npm

## Updating the Package

1. Make your changes
2. Update version: `npm version patch` (or minor/major)
3. Push changes: `git push && git push --tags`
4. Create GitHub release (triggers auto-publish)
   
   OR manually:
   ```bash
   npm publish
   ```

## Best Practices

### Before Publishing

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] README is up to date
- [ ] CHANGELOG is updated
- [ ] Examples work correctly
- [ ] Version number is updated

### After Publishing

- [ ] Test installation: `npm install r3f-peridot`
- [ ] Create GitHub release
- [ ] Update documentation if needed
- [ ] Announce on Twitter, Reddit (r/reactjs, r/threejs), Discord communities

## Troubleshooting

### "Package name already exists"

Choose a different name or use a scoped package:
```json
{
  "name": "@christiandimitri/r3f-peridot"
}
```

### "You must verify your email"

Check your email and verify your npm account.

### "You do not have permission to publish"

Make sure you're logged in with the correct account:
```bash
npm whoami
npm logout
npm login
```

### "Version already published"

Update the version number:
```bash
npm version patch
```

## Unpublishing (Use with Caution)

You can unpublish within 72 hours:
```bash
npm unpublish r3f-peridot@0.1.0
```

**Warning**: Unpublishing can break projects that depend on your package. Use `npm deprecate` instead:
```bash
npm deprecate r3f-peridot@0.1.0 "This version has a critical bug, please upgrade"
```

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Creating npm Packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages)

