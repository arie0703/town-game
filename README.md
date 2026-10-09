# TOWN

ブラウザで遊べる TOWN ゲーム（町の住民として働き、鍛え、食べ、戦い、恋をする生活シミュレーション）。

- 要件: [docs/spec.md](docs/spec.md)
- 実装計画: [docs/task.md](docs/task.md)

## 必要なもの

- Node.js 24 以上
- npm

## セットアップ

```bash
npm install
```

## 起動（ローカル開発）

```bash
npm run dev
```

- ブラウザで http://localhost:5173 を開く
- フロントエンド（Vite）と API サーバー（Hono、ポート 8787）が同時に起動する。Vite が `/api` を API サーバーへ転送する
- DB は SQLite。初回起動時にプロジェクト直下へ `town.sqlite` が作成され、テーブルも自動で作られる

### DB のリセット

サーバーを止めて `town.sqlite` を削除し、再度 `npm run dev` を実行する。

## コマンド

- `npm run dev`: 開発サーバーを起動する
- `npm run build`: フロントエンドをビルドする（`dist/` に出力）
- `npm run typecheck`: TypeScript の型チェックを行う

## 環境変数

いずれも省略可能（ローカル開発では未設定で動く）。

- `API_PORT`: API サーバーのポート（デフォルト `8787`）
- `DB_PATH`: SQLite ファイルのパス（デフォルト `town.sqlite`）
- `COOKIE_SECRET`: ログイン Cookie の署名鍵。本番（`NODE_ENV=production`）では必須
- `NODE_ENV`: `production` にすると Cookie に Secure 属性が付き、`COOKIE_SECRET` が必須になる

## ディレクトリ構成

```
src/
├── client/          # フロントエンド（SPA、hash ルーティング）
│   ├── main.ts      # 起動・ルーター
│   ├── pages/       # 画面（facilities/ は施設ごとの中身）
│   └── components/  # 共通部品（マップ）
├── server/          # API サーバー（Hono）
│   ├── routes/      # API ルート
│   ├── game/        # ゲームロジック（計算・判定・アクション共通処理）
│   └── db.ts        # DB 接続・テーブル作成
└── shared/          # client / server 共通
    ├── config.ts    # ゲームの調整用定数
    ├── master/      # マスタデータ（職業・アイテム・メニュー・施設・マップ）
    └── types.ts     # API の型定義
```

## ゲームバランスの調整

数値はすべて以下にまとまっており、ロジックを触らずに調整できる。

- `src/shared/config.ts`: 初期値、休息・学校・ジムの効果、丁半の上限、ストリートファイトの係数など
- `src/shared/master/jobs.ts`: 職業ごとの給料・就職条件・消費パワー
- `src/shared/master/items.ts`: お店のアイテムの価格・効果
- `src/shared/master/menus.ts`: 食堂のメニューの価格・効果
- `src/shared/master/map.ts`: マップの配置と土地の価格
