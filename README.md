# ルイとミオのギャラリー

ルイ（男の子）とミオ（女の子）が作った画像を、スマホやPCで共有してクラウドに保存できるPWAです。画像はSupabase StorageとPostgresに保存します。

## 機能

- **3タブ構成**: `🦖ルイ`、`🌸ミオ`、`⚔️バトル`
- **クラウド保存**: Supabase Storage + Postgresで画像を累積保存
- **パスコード保護**: `VITE_GALLERY_PASSCODE` でロック
- **画像アップロード**: 複数画像をまとめて選択して保存
- **編集モード**: 画像削除、長押しによるキャラステータス編集
- **キャラクターバトル**: 保存済み画像をキャラ化して遊べる
- **3種類のバトル**: ダイス、じゃんけん、3vs3チーム戦
- **育成**: 算数5問に挑戦してキャラごとのクリスタルを獲得
- **再抽選**: クリスタルで攻撃力、防御力、素早さ、運、技術力、属性を再抽選
- **兄妹チーム戦**: ルイチーム vs ミオチームの3vs3勝ち抜き
- **派手な演出**: 揺れ、吹っ飛び、ダメージ数字、必殺技カットイン、紙吹雪、Web Audio効果音
- **ランキング**: 通算勝利、連勝、今日のMVP、種族別最強、チーム戦履歴
- **PWA**: スマホのホーム画面に追加してアプリ風に起動

## 初期セットアップ

Supabaseの設定が必要です。詳しくは [SETUP.md](./SETUP.md) を確認してください。

Vercelで必要な環境変数:

| Key | 説明 |
|---|---|
| `VITE_SUPABASE_URL` | SupabaseプロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_GALLERY_PASSCODE` | 4桁などの家族用パスコード |

## 開発

```bash
npm install
cp .env.example .env.local
npm run dev
npm run build
```

## デプロイ

GitHubの `main` ブランチにpushすると、Vercelで自動デプロイされます。

## 技術スタック

- Vite + React + TypeScript
- Tailwind CSS v3
- Supabase Storage + Postgres
- framer-motion
- canvas-confetti
- vite-plugin-pwa
