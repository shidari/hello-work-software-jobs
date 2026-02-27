# テスト

## Property-Based Testing (PBT)

PBT は振る舞いを記述するためにも使う。PBT で書かれたテストはドキュメントである。

- スキーマや変換関数には PBT を優先して書く
- `effect/Arbitrary` + `effect/FastCheck` を使う（Effect コアに内蔵）
- `Arbitrary.make(schema)` で Schema から arbitrary を自動生成できる
- テスト名は「何が成り立つか」を日本語で明記する（例: `有効な賃金文字列 → min <= max`）
