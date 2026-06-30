# Supabase セットアップ手順

クラウド共有を有効にするための初期設定。所要時間 約10分。

## 1. Supabaseプロジェクト作成

1. [supabase.com](https://supabase.com) にアクセス
2. **Sign in with GitHub** でログイン（既存GitHubアカウントでOK）
3. **New project** をクリック
4. 入力：
   - **Project name**: `kidsgazou`（何でもOK）
   - **Database Password**: 適当な強いパスワード（後で使わないので忘れてOK）
   - **Region**: `Northeast Asia (Tokyo)` ←推奨
5. **Create new project** → 2分くらい待つ

## 2. テーブル作成

左サイドバーの **SQL Editor** → **New query** を開いて以下を貼り付け→ **Run**:

```sql
create table images (
  id text primary key,
  child text not null check (child in ('rui', 'mio')),
  path text not null,
  name text not null,
  created_at timestamptz default now()
);
create index images_child_created_idx on images (child, created_at desc);

alter table images enable row level security;
create policy "anon read"   on images for select using (true);
create policy "anon insert" on images for insert with check (true);
create policy "anon delete" on images for delete using (true);
```

## 3. Storageバケット作成

1. 左サイドバー **Storage** → **New bucket**
2. 入力：
   - **Name**: `images`
   - **Public bucket**: ✅ ON（クリックして緑にする）
3. **Save**

### バケットの書き込み権限

**Storage** → **Policies** タブ → `images` バケットの **New policy**:

- **Policy name**: `anon all`
- **Allowed operations**: SELECT, INSERT, UPDATE, DELETE 全部チェック
- **Target roles**: `anon`
- **USING expression**: `true`
- **WITH CHECK expression**: `true`
- **Save policy**

（または「Get started quickly」テンプレから「Give anon users full access」を選択でもOK）

## 4. APIキーをコピー

左サイドバー **Project Settings** （歯車） → **API**:

- **Project URL** — 後で使う
- **Project API keys** の **anon / public** の方をコピー — 後で使う

## 5. Vercelに環境変数を設定

[vercel.com/dashboard](https://vercel.com/dashboard) で `kidsgazou` プロジェクトを開く:

1. **Settings** → **Environment Variables**
2. 以下3つを追加（**All Environments** にチェック）:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | (手順4で取得したProject URL) |
| `VITE_SUPABASE_ANON_KEY` | (手順4で取得したanon public key) |
| `VITE_GALLERY_PASSCODE` | 4桁の数字（例: `2580`）家族で共有 |

3. **Save** で各項目を保存

## 6. 再デプロイ

**Deployments** タブ → 最新のデプロイの **⋯** メニュー → **Redeploy** → **Redeploy** ボタン

（または GitHub に何かpushすれば自動再デプロイされる）

## 7. 動作確認

1. スマホで [kidsgazou.vercel.app](https://kidsgazou.vercel.app/) を開く
2. パスコード入力画面 → 設定した4桁を入力
3. ルイ/ミオに切り替えて画像を追加・保存
4. **別のスマホ・PC** で同じURL＋パスコードを入れて、同じ画像が見えれば成功

---

## ローカル開発（任意）

ローカルで動かすなら、プロジェクト直下に `.env.local` ファイルを作成:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GALLERY_PASSCODE=1234
```

`npm run dev` で起動。

## トラブルシュート

| 症状 | 原因 / 対処 |
|---|---|
| 「Supabase 未設定」と表示 | Vercel環境変数が反映されてない。再デプロイ必要 |
| パスコード突破できない | 環境変数 `VITE_GALLERY_PASSCODE` の値を確認 |
| 画像アップロードでエラー | Storageバケット `images` が無い / Public OFF / バケットPolicyが無い |
| 画像が他端末で見えない | Storageバケットが Public じゃない |
| 「DB保存失敗」 | テーブル `images` が無い / RLSポリシー未設定 |
