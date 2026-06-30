# ルイとミオのギャラリー

ルイ（男の子）とミオ（女の子）の作った画像を、全端末で共有してクラウドに累積保存するPWA。

## 機能

- **タブ切替**: ルイ（ブラック基調）/ ミオ（ピンク基調）
- **クラウド共有**: Supabase Storage + Postgres。どの端末から開いても同じデータ
- **パスコード保護**: 4桁の合言葉で家族だけがアクセス可能
- **アップロード**: ファイル選択（複数OK）→「ほぞん」で確定
- **削除**: 編集モードで個別削除
- **拡大表示**: タップで全画面プレビュー → ダウンロード可能
- **PWA**: スマホのホーム画面に追加でアプリ化

## 初期セットアップ

**重要**: 動かす前にSupabaseの設定が必要です。詳細は [SETUP.md](./SETUP.md) を参照。

必要な環境変数（Vercelで設定）:

| Key | 説明 |
|---|---|
| `VITE_SUPABASE_URL` | SupabaseプロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_GALLERY_PASSCODE` | 4桁の合言葉 |

## 開発

```bash
npm install
cp .env.example .env.local  # 値を埋める
npm run dev
npm run build
```

## デプロイ（Vercel）

GitHubに push すれば自動デプロイ。環境変数は [SETUP.md](./SETUP.md) を参照。

## 技術スタック

- Vite + React + TypeScript
- Tailwind CSS v3
- Supabase（Storage + Postgres）
- vite-plugin-pwa（Service Worker + Manifest）
