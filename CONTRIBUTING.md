# Contributing to r3f-gltf-outlines

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node version, browser, etc.)
- **Code sample** that demonstrates the issue

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- **Clear description** of the enhancement
- **Use case** explaining why it would be useful
- **Possible implementation** approach (if you have ideas)
- **Examples** from other libraries (if applicable)

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the coding standards
3. **Add tests** if you're adding functionality
4. **Update documentation** if needed
5. **Ensure tests pass**: `npm test`
6. **Ensure linter passes**: `npm run lint`
7. **Ensure TypeScript compiles**: `npm run typecheck`
8. **Build successfully**: `npm run build`
9. **Submit the pull request**

## Development Setup

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

### Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/r3f-gltf-outlines.git
cd r3f-gltf-outlines

# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run typecheck
```

### Running Examples

```bash
cd examples
npm install
npm run dev
```

Open http://localhost:3000 to see the examples.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid `any` types when possible
- Use meaningful variable and function names

### Code Style

- Follow the existing code style
- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons (configured in Prettier)
- Run `npm run format` before committing

### Comments

- Add JSDoc comments for public APIs
- Explain complex logic with inline comments
- Keep comments up to date with code changes

### Testing

- Write unit tests for new utilities
- Test edge cases and error conditions
- Aim for good test coverage
- Use descriptive test names

## Project Structure

```
r3f-gltf-outlines/
├── src/
│   ├── components/     # React components
│   ├── utils/          # Utility functions
│   └── index.ts        # Main entry point
├── tests/              # Test files
├── examples/           # Example applications
├── dist/               # Built files (generated)
└── docs/               # Additional documentation
```

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(outline): add support for custom outline thickness

fix(shader): correct depth buffer calculation

docs(readme): update installation instructions
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a commit: `chore: release v0.2.0`
4. Create a git tag: `git tag v0.2.0`
5. Push: `git push && git push --tags`
6. Create GitHub release
7. npm publish (or wait for CI/CD)

## Questions?

Feel free to open an issue with the `question` label if you have any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

