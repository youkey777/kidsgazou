# ルイとミオのギャラリー

ルイ（男の子）とミオ（女の子）が作った画像を、スマホやPCで共有してクラウドに保存できるPWAです。画像はSupabase StorageとPostgresに保存します。

## 機能

- **タブ構成**: ルイ/ミオを横並び、下に大きなBattleボタン
- **クラウド保存**: Supabase Storage + Postgresで画像を累積保存
- **パスコード保護**: `VITE_GALLERY_PASSCODE` でロック
- **画像アップロード**: 複数画像をまとめて選択して保存
- **編集モード**: 画像削除、長押しによるキャラステータス編集
- **キャラクターバトル**: 保存済み画像をキャラ化して遊べる
- **統合バトル**: じゃんけんに勝つとサイコロを振り、出目で攻撃・必殺技が発動
- **必殺技**: キャラごとに4/5/6の必殺技を手動設定、6は一撃必殺
- **固有技**: ブルーベリーハシニーニのドリアン反撃、キャプテンフロッグのダイナマイト、キングカルビの第2ターン以降・毎ターン30%全回復
- **名前編集**: OCRに頼らず、キャラ詳細から手動で名前を保存
- **育成**: 2桁入りの算数5問に挑戦してキャラごとのクリスタルを獲得
- **再抽選**: クリスタルで攻撃力、防御力、素早さ、運、技術力、属性を再抽選
- **属性相性**: 15属性すべてにマークと段階相性を設定し、相性表で確認可能
- **初期能力**: 追加キャラの能力はランダム付与、初期値は50以下
- **兄妹チーム戦**: ルイチーム vs ミオチームの3vs3勝ち抜き
- **ふたりで対戦**: スマホとiPadなど別端末で部屋コードを使って同時対戦
- **派手な演出**: 3Dダイス、CG攻撃素材、必殺カットイン、揺れ、吹っ飛び、ダメージ数字、紙吹雪、Web Audio効果音、BGM
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
