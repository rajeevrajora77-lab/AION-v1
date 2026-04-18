# Security Policy — Rajora AI

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅        |

## Reporting a Vulnerability

Report security vulnerabilities **privately** to: **rajeev@rajora.live**

Do NOT open public GitHub issues for security vulnerabilities.

**Response SLA:**
- Acknowledgement within 48 hours
- Critical fix within 14 days
- High severity fix within 30 days

## Security Standards

- All secrets stored in environment variables — never hardcoded
- `.env` files excluded via `.gitignore`
- Dependencies scanned via Dependabot and Trivy
- API keys and tokens must never appear in source code
- All PRs scanned for secret leaks via TruffleHog

## Contact

**Rajora AI**  
🌐 https://rajora.live  
✉️ rajeev@rajora.live
