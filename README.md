# ルイとミオのギャラリー

ルイ（男の子）とミオ（女の子）の作った画像を、それぞれ個別に端末内へ累積保存できるPWA。

## 機能

- **タブ切替**: ルイ（ブラック基調）/ ミオ（ピンク基調）
- **画像アップロード**: ファイル選択（複数OK）→「ほぞん」で確定
- **削除**: 編集モード＋画像タップ、または拡大表示中の「さくじょ」ボタン
- **拡大表示**: タップで全画面プレビュー → ダウンロードも可能
- **完全オフライン**: 画像はIndexedDBに保存。サーバーや通信不要
- **PWA**: スマホのホーム画面に追加で、ネイティブアプリのように起動

## 開発

```bash
npm install
npm run dev     # 開発サーバー
npm run build   # 本番ビルド（dist/）
npm run preview
```

## デプロイ（Vercel）

1. このフォルダをGitHubにpush
2. [vercel.com](https://vercel.com) でImport Project
3. フレームワーク自動検出（Vite） → デプロイ
4. 発行URLをスマホで開く → 「ホーム画面に追加」でアプリ化

## 技術スタック

- Vite + React + TypeScript
- Tailwind CSS v3
- idb（IndexedDB wrapper）
- vite-plugin-pwa（Service Worker + Manifest）
