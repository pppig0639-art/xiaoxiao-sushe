# 小小宿舍

多人共用的虛擬宿舍 PWA：可以建立/加入多個獨立寢室，小人物狀態即時同步、輪值提醒(依工作量公平分配)、留言板、共養寵物，房間需要主人許可才能進入。

完整構想與規劃見 [虛擬宿舍_專案規劃.md](虛擬宿舍_專案規劃.md)（原始構想文件，部分內容已在後續討論中演進，實際邏輯以本 README 和程式碼為準）。

## 目錄結構

```
login.html              個人帳號登入/註冊（Email + 密碼）
dorm-select.html        登入後選「加入寢室」或「建立寢室」
app.html                主應用畫面（地圖 / 輪值+留言 / 寵物 三分頁）
manifest.json           PWA manifest
service-worker.js       快取靜態殼層，不快取 Firestore 資料
firestore.rules         Firestore 安全規則

css/
  base.css              共用變數、reset
  login.css             登入頁樣式
  dorm-select.css       選寢室頁樣式
  app.css               主應用頁樣式

js/
  firebase-config.js    Firebase 初始化（需要填入自己的專案設定）
  auth.js               login.html 的邏輯（Email+密碼登入/註冊）
  dorm-select.js         dorm-select.html 的邏輯（加入/建立寢室）
  store.js              極簡全域狀態 + pub/sub
  app.js                主應用進入點（讀目前寢室、分頁切換、登出、啟動監聽）
  db/                   Firestore 存取層，每個 collection 一支檔案
    accounts.js         個人帳號 profile
    dorms.js            寢室本體（建立/用代碼查詢/加入）
    members.js          寢室成員狀態（取代 v1 的 users.js）
    rooms.js            房間資料（公共區/私人房 + 白名單）
    duties.js
    messages.js
    pet.js
  views/                畫面渲染層，只透過 store 拿資料、透過 db/*.js 寫資料
    map.js
    duties.js
    messages.js
    pet.js
    status.js

assets/
  icons/                PWA icons（目前是預留路徑，尚未放實際圖檔）
  sprites/
    furniture/          房間家具素材，見下方「美術素材來源」
```

## 美術素材來源

房間家具用 [Kenney.nl](https://kenney.nl) 的免費素材 [Furniture Kit](https://kenney.nl/assets/furniture-kit)，
CC0 授權（公共領域，不需要標示來源也可以商用，這裡列出來只是方便之後找同系列素材）。
小人物目前還是純 CSS 畫的圓形，之後想找同風格的角色素材可以先看 Kenney 有沒有搭配的角色包，
或去 [itch.io](https://itch.io/game-assets/free) 搜尋 "free character sprite"。

## 資料模型

多租戶架構，個人身分 = Firebase Auth（Email/密碼）的 uid，一切內容掛在 `dorms/{dormId}` 底下：

```
accounts/{uid}                  displayName, email, currentDormId
dorms/{dormId}                  name, dormCode, dormPassword, capacity, ownerUid, memberUids[]
dorms/{dormId}/members/{uid}    displayName, currentRoomId, status, activity, mood, taskCompletedCount
dorms/{dormId}/rooms/{roomId}   type(private/common), ownerUid, allowedUids[]
dorms/{dormId}/duties/{id}
dorms/{dormId}/messages/{id}
dorms/{dormId}/pet/shared
```

## 目前狀態

- **Phase A（已完成）**：帳號系統(Email+密碼)、建立/加入寢室、地圖/輪值/留言/寵物都已改成寢室範圍運作。
- **Phase B（規劃中）**：房間白名單管理畫面 + 進房權限檢查、任務依工作量自動分配的 UI。
- **Phase C（規劃中）**：人物換成有動作動畫的角色素材，依「活動狀態」觸發走位+動作。

## Firebase 設定需求

1. Firestore Database 已啟用。
2. Authentication 需要開啟 **Email/Password** 登入方式（原本 v1 用的 Anonymous 已經不需要了，可以關掉）。
3. `firestore.rules` 部署最新版本。

## 本地啟動

這個專案不需要打包工具，但因為用了 ES module（`<script type="module">`）和 PWA/Firebase，
必須透過 http(s) 開啟，不能直接雙擊 html 檔用 `file://` 打開。任選一種方式：

```bash
# 方式一：npx serve
npx serve .

# 方式二：VSCode 安裝 "Live Server" 套件，右鍵 login.html -> Open with Live Server
```

開啟後預設會先看到 `login.html`，登入/註冊後導到 `dorm-select.html`，加入或建立寢室後導到 `app.html`。
