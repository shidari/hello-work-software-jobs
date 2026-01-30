# Security Review

Perform a comprehensive security review of the specified code or files.

**IMPORTANT: All output MUST be in Japanese.**

## Review Target

$ARGUMENTS

### Usage Examples

- `/security-review` - Review currently open file or recent changes
- `/security-review src/api/auth.ts` - Review specific file
- `/security-review apps/backend/` - Review specific directory
- `/security-review --all` - Review entire codebase (focus on critical areas)

## Checklist

### 1. OWASP Top 10

- **Injection**: SQL injection, command injection, XSS
- **Broken Authentication**: Auth bypass, privilege escalation, session management issues
- **Sensitive Data Exposure**: Hardcoded secrets, improper logging
- **Security Misconfiguration**: Default settings, unnecessary features enabled
- **Vulnerable Components**: Dependencies with known vulnerabilities

### 2. Input Validation

- Proper sanitization of user input
- Type checking and validation
- Path traversal attack prevention

### 3. Authentication & Authorization

- Proper authentication mechanisms
- Authorization checks implementation
- Session management security

### 4. Data Protection

- Encryption of sensitive data
- Secure data transfer (HTTPS)
- Proper error handling (prevent information leakage)

### 5. Dependencies

- Packages with known vulnerabilities
- Unnecessary dependencies
- Version pinning verification

## Output Format

Report findings in Japanese using the following format:

### Severity Levels

- 🔴 **Critical (緊急)**: 即時対応が必要
- 🟠 **High (高)**: 早急な対応が必要
- 🟡 **Medium (中)**: 計画的に対応
- 🟢 **Low (低)**: 改善推奨
- ℹ️ **Info (情報)**: 参考情報

### Report Structure

1. **概要**: 発見された問題の概要
2. **詳細**: 各問題の説明、該当箇所、影響、修正方法
3. **推奨事項**: セキュリティ向上のための提案

## Notes

- Consider context to reduce false positives
- Provide actionable, specific remediation steps
- Consider this project's tech stack (Cloudflare Workers, Next.js, AWS Lambda)
