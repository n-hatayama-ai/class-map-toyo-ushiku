# 各中学在籍数マップ（東洋大牛久高校）

出身中学校別の在籍生徒数を地図・一覧表で可視化する静的Webアプリ（React + TypeScript + Vite + Leaflet）。

- 公開URL: https://n-hatayama-ai.github.io/class-map-toyo-ushiku/ （合言葉あり）
- `main` への push で GitHub Actions が GitHub Pages にデプロイします。

## ローカル実行

```sh
npm install
npm run dev     # http://localhost:3000
npm run lint    # 型チェック
npm run build
```

## データ

在籍データは合言葉で暗号化した `public/data.enc.json` だけを公開します（AES-GCM、鍵は合言葉から PBKDF2 で導出）。平文の `src/data/schoolsData.json` / `studentsData.json` は `.gitignore` 済みでリポジトリに入りません。

データ更新の手順:
1. 校務システムの学年別学籍データCSV（高1〜高3）から平文JSONを生成
   ```sh
   python3 scripts/build_dataset.py 【高１学籍データ】.csv 【高２学籍データ】.csv 【高３学籍データ】.csv
   ```
   座標データに無い出身校名があると一覧を表示して停止するので、`MANUAL_ALIASES` に対応を追加して再実行します。元CSVは生徒IDを含むためリポジトリに置かないこと。
2. 暗号化して `public/data.enc.json` を更新（合言葉は macOS キーチェーンの `class-map-toyo-ushiku` に保存）
   ```sh
   MAP_PASSCODE="$(security find-generic-password -s class-map-toyo-ushiku -w)" node scripts/encrypt_data.mjs
   ```
   合言葉を変えるときは、キーチェーンの値を変えてから同じコマンドを実行します（各端末で再入力が必要になります）。
3. `public/data.enc.json` をコミットして push

- `src/data/knownSchoolsGeo.json` — 中学校の座標データベース
- 画面の「取込」から Excel/CSV を読み込むと、ブラウザ内（localStorage）だけで差し替え表示されます。サーバーには送信されません。

公開リポジトリ・公開サイトのため、生徒IDなど個人を特定し得る情報はコミットしないでください。
