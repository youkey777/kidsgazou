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

## 育成機能の追加SQL

既存環境へ育成・クリスタル・新パラメータを追加する場合は、Supabase SQL Editorで以下を実行してください。

```sql
alter table images add column if not exists luck int default 50;
alter table images add column if not exists tech int default 50;
alter table images add column if not exists crystals int default 0;
alter table images add column if not exists xp int default 0;

update images
set
  atk = coalesce(atk, floor(random() * 50 + 1)::int),
  def = coalesce(def, floor(random() * 50 + 1)::int),
  spd = coalesce(spd, floor(random() * 50 + 1)::int),
  luck = coalesce(luck, floor(random() * 50 + 1)::int),
  tech = coalesce(tech, floor(random() * 50 + 1)::int),
  xp = coalesce(xp, 0),
  species = coalesce(
    species,
    (array[
      'ほのお', 'みず', 'かぜ', 'つち', 'ひかり',
      'やみ', 'でんき', 'こおり', 'くさ', 'はがね',
      'まほう', 'ドラゴン', 'ロボ', 'スター', 'ふしぎ'
    ])[floor(random() * 15 + 1)::int]
  ),
  crystals = coalesce(crystals, 0);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'anon update'
  ) then
    create policy "anon update" on images for update using (true) with check (true);
  end if;
end $$;
```

## 勝敗記録・経験値の追加SQL

バトルの勝利数、連勝、レベル、経験値、クリスタル、能力変更が保存されない場合は、Supabase SQL Editor で以下を実行してください。

```sql
alter table images add column if not exists xp int default 0;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'anon update'
  ) then
    create policy "anon update" on images for update using (true) with check (true);
  end if;
end $$;
```

## 2026-07-01 既存キャラ修復SQL

既存キャラの名前が `file_0000...` のまま、能力が `10/10/10` のまま、クリスタルが保存されない場合は、Supabase SQL Editor で以下を実行してください。

```sql
alter table images add column if not exists luck int default 50;
alter table images add column if not exists tech int default 50;
alter table images add column if not exists crystals int default 0;
alter table images add column if not exists xp int default 0;

alter table images enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'anon update'
  ) then
    create policy "anon update" on images for update using (true) with check (true);
  end if;
end $$;

update images
set
  atk = floor(random() * 50 + 1)::int,
  def = floor(random() * 50 + 1)::int,
  spd = floor(random() * 50 + 1)::int,
  luck = floor(random() * 50 + 1)::int,
  tech = floor(random() * 50 + 1)::int,
  species = (array[
    'ほのお', 'みず', 'かぜ', 'つち', 'ひかり',
    'やみ', 'でんき', 'こおり', 'くさ', 'はがね',
    'まほう', 'ドラゴン', 'ロボ', 'スター', 'ふしぎ'
  ])[floor(random() * 15 + 1)::int],
  crystals = coalesce(crystals, 0),
  xp = coalesce(xp, 0);

update images
set name = case id
  when 'mr1fcffa-zpl3900' then 'ミオぴょんぴょん'
  when 'mr1eqopu-2w31550' then 'オクトパスフロッグ'
  when 'mr0panc5-qvnlm10' then 'タオルケットもふもふしかちゃん'
  when 'mr0pa9q7-lmq4pn0' then 'ストロベリーピョン'
  when 'mr0pa9fv-ypib1x0' then 'キングガルビー'
  when 'mr0pa92q-axyh3w0' then 'キャプテンフロッグ'
  when 'mr0pa7o3-pkaaxx0' then 'ブルーベリーハシニーニ'
  else name
end
where id in (
  'mr1fcffa-zpl3900',
  'mr1eqopu-2w31550',
  'mr0panc5-qvnlm10',
  'mr0pa9q7-lmq4pn0',
  'mr0pa9fv-ypib1x0',
  'mr0pa92q-axyh3w0',
  'mr0pa7o3-pkaaxx0'
);
```

## クリスタル補正SQL

前回の修復SQLで全キャラにクリスタルが3個ついてしまった場合だけ、Supabase SQL Editor で以下を実行してください。

```sql
update images
set crystals = 0;
```

## じゃんけん＋サイコロ統合バトルの追加SQL

必殺技4・必殺技5・必殺技6の名前をキャラごとに保存するため、Supabase SQL Editor で以下を実行してください。

```sql
alter table images add column if not exists ultimate4_name text default 'ひっさつわざ4';
alter table images add column if not exists ultimate5_name text default 'ひっさつわざ5';
alter table images add column if not exists ultimate6_name text default 'ひっさつわざ6';

update images
set
  ultimate4_name = coalesce(ultimate4_name, ultimate_name, 'ひっさつわざ4'),
  ultimate5_name = coalesce(ultimate5_name, ultimate_name, 'ひっさつわざ5'),
  ultimate6_name = coalesce(ultimate6_name, ultimate_name, 'ひっさつわざ6');
```
