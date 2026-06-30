# Supabase セットアップ手順

クラウド共有を有効にするための初期設定です。作業時間は約10分です。

## 1. Supabaseプロジェクト作成

1. [supabase.com](https://supabase.com) にアクセス
2. GitHubアカウントでログイン
3. `New project` をクリック
4. 次のように入力
   - `Project name`: `kidsgazou`
   - `Database Password`: 任意の強いパスワード
   - `Region`: `Northeast Asia (Tokyo)` 推奨
5. `Create new project` をクリック

## 2. images テーブル作成

左サイドバーの `SQL Editor` で `New query` を開き、以下を実行してください。

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

## 3. Storage バケット作成

1. 左サイドバーの `Storage` を開く
2. `New bucket` をクリック
3. 次のように設定
   - `Name`: `images`
   - `Public bucket`: ON
4. `Save` をクリック

## 4. Storage ポリシー設定

`Storage` の `Policies` から `images` バケットへ以下のポリシーを作成してください。

- `Policy name`: `anon all`
- `Allowed operations`: SELECT, INSERT, UPDATE, DELETE
- `Target roles`: `anon`
- `USING expression`: `true`
- `WITH CHECK expression`: `true`

## 5. Vercel 環境変数

Vercelの `kidsgazou` プロジェクトで `Settings` → `Environment Variables` を開き、以下を設定してください。

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | SupabaseのProject URL |
| `VITE_SUPABASE_ANON_KEY` | Supabaseのanon public key |
| `VITE_GALLERY_PASSCODE` | 家族用パスコード |

## 6. ローカル開発

プロジェクト直下に `.env.local` を作成します。

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GALLERY_PASSCODE=1234
```

起動コマンド:

```bash
npm run dev
```

## 7. 動作確認

1. スマホまたはPCでアプリを開く
2. パスコードを入力
3. `🦖ルイ` / `🌸ミオ` に画像を追加して保存
4. `⚔️バトル` で保存済み画像をキャラとして選択
5. バトル結果とランキングが表示されることを確認

## バトル機能の追加SQL

既存環境へバトル機能を追加する場合は、Supabase SQL Editorで以下を実行してください。

```sql
alter table images add column if not exists hp int default 100;
alter table images add column if not exists atk int default 10;
alter table images add column if not exists def int default 10;
alter table images add column if not exists spd int default 10;
alter table images add column if not exists species text;
alter table images add column if not exists ultimate_name text default 'ひっさつわざ';
alter table images add column if not exists level int default 1;
alter table images add column if not exists wins int default 0;
alter table images add column if not exists losses int default 0;
alter table images add column if not exists streak int default 0;

create table if not exists battle_records (
  id text primary key,
  mode text not null,
  winner_id text references images(id) on delete cascade,
  loser_id text references images(id) on delete cascade,
  winner_team text,
  created_at timestamptz default now()
);
create index if not exists battle_records_created_idx on battle_records (created_at desc);
alter table battle_records enable row level security;
create policy "anon read"   on battle_records for select using (true);
create policy "anon insert" on battle_records for insert with check (true);
```
