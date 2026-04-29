# Contributing to girilog

Thank you for your interest in contributing to girilog! We welcome contributions from the community. This guide will help you get started.

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/girilog.git
   cd girilog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Making Changes

1. Create a new branch from `main` for your feature or bug fix
2. Make your changes following our code style guidelines
3. Test your changes thoroughly
4. Commit your changes with clear, descriptive messages

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Keep functions small and focused
- Add comments for complex logic
- Write meaningful variable and function names

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add new feature description
fix: Fix bug description
docs: Update documentation
refactor: Refactor code section
test: Add or update tests
```

## Submitting Changes

### Before You Submit a PR

1. Update your branch with latest changes from `main`
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Run tests and linting
   ```bash
   npm test
   npm run lint
   ```

3. Ensure your code builds without errors
   ```bash
   npm run build
   ```

### Creating a Pull Request

1. Push your branch to your fork
2. Go to the original repository and create a Pull Request
3. Fill out the PR template with:
   - Clear description of changes
   - References to any related issues
   - Screenshots or examples (if applicable)
   - Testing notes

4. Wait for review and be ready to make adjustments

## Pull Request Review Process

- Your PR will be reviewed for:
  - Code quality and style
  - Functionality
  - Test coverage
  - Documentation updates
  - Performance implications

- Address review feedback promptly
- Once approved, your PR will be merged to `main`

## Reporting Issues

### Bug Reports

When reporting bugs, include:

- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, npm version)
- Relevant logs or error messages

### Feature Requests

For feature requests, provide:

- Clear description of the feature
- Use cases or examples
- Why this feature would be useful
- Any alternatives you've considered

## Testing

- Write tests for new features
- Ensure all existing tests pass
- Aim for >80% code coverage for new code

```bash
npm test
npm run coverage
```

## Documentation

- Update README.md if your changes affect usage
- Add JSDoc comments to new functions
- Update CHANGELOG if making a notable change
- Keep documentation examples up to date

## Questions?

Have questions? Feel free to:
- Open an issue with the `question` label
- Check existing issues for similar questions
- Email us at josue.d.tello@gmail.com

## License

By contributing to girilog, you agree that your contributions will be licensed under the GPL v3.0 License.

---

**Thank you for contributing to girilog! 🚀**
