# セキュリティ方針

## レビューチェックリスト

### 1. OWASP Top 10

- **Injection**: SQL injection, command injection, XSS
- **Broken Authentication**: Auth bypass, privilege escalation, session management issues
- **Sensitive Data Exposure**: Hardcoded secrets, improper logging
- **Security Misconfiguration**: Default settings, unnecessary features enabled
- **Vulnerable Components**: Dependencies with known vulnerabilities

### 2. Input Validation

- ユーザー入力の適切なサニタイズ
- 型チェックとバリデーション（Effect Schema）
- パストラバーサル攻撃の防止

### 3. Authentication & Authorization

- API キー認証（`x-api-key` ヘッダー）
- 認可チェックの実装
- セッション管理のセキュリティ

### 4. Data Protection

- 機密データの暗号化
- HTTPS によるセキュアなデータ転送
- 適切なエラーハンドリング（情報漏洩の防止）

### 5. Dependencies

- 既知の脆弱性を持つパッケージ
- 不要な依存関係
- バージョン固定の確認

## 報告形式

| レベル | 意味 |
|--------|------|
| Critical (緊急) | 即時対応が必要 |
| High (高) | 早急な対応が必要 |
| Medium (中) | 計画的に対応 |
| Low (低) | 改善推奨 |
| Info (情報) | 参考情報 |

## プロジェクト固有の考慮事項

- Cloudflare Workers: エッジでの実行、Workers KV/D1 のアクセス制御
- Next.js: RSC でのデータ取得時のサーバーサイドセキュリティ
- AWS Lambda: IAM ロール、環境変数でのシークレット管理
