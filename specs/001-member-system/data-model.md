# Phase 1 Data Model: Member System

**Feature**: 001-member-system
**Date**: 2026-05-22
**Source**: spec.md `### Key Entities` + Clarifications（2026-05-21）

## 共通約定

- 主鍵採 `bigint unsigned` auto-increment（Laravel 預設），對外暴露 ID 改用 UUIDv7 字串（`uuid` 欄位 + Sanctum 認證後 binding）
- 所有時間欄位 `timestamp` 含時區（MySQL `TIMESTAMP`，Laravel 自動轉 UTC）
- 軟刪除：本期僅 `members` 用 `deleted_at`（維運手動刪除流程，spec Assumption），其他表硬刪
- 字串長度：Email 254（RFC 5321）、密碼雜湊 bcrypt 預設 60、UUID 36、token 64（hex(32)）

---

## E1. Member（會員）

對應 Laravel users table（重新命名 `members` 以對齊 spec 用語）。

| 欄位 | 型別 | 限制 | 說明 |
|---|---|---|---|
| `id` | bigint UN PK | auto increment | 內部主鍵 |
| `uuid` | char(36) | UNIQUE, NOT NULL | 對外公開 ID |
| `email` | varchar(254) | UNIQUE (case-insensitive collation `utf8mb4_unicode_ci`), NOT NULL | FR-001 |
| `email_verified_at` | timestamp | NULL | NULL = 待驗證；非 NULL = 已驗證 |
| `display_name` | varchar(64) | NULL | FR-006，註冊時可選填 |
| `avatar_path` | varchar(255) | NULL | 相對 `storage/app/public/` 路徑（FR-007） |
| `contact_info` | varchar(255) | NULL | spec Assumptions：單一文字欄位 |
| `locked_until` | timestamp | NULL | NULL = 未鎖定；非 NULL = 鎖定至此時刻（FR-004） |
| `last_login_at` | timestamp | NULL | spec Entity 屬性 |
| `remember_token` | varchar(100) | NULL | Laravel 「記住我」（FR-016） |
| `created_at` / `updated_at` | timestamp | NOT NULL | Laravel 預設 |
| `deleted_at` | timestamp | NULL | 維運手動刪除標記 |

**Indexes**:
- UNIQUE(`email`)（不分大小寫由 collation 保證）
- UNIQUE(`uuid`)
- INDEX(`locked_until`)（清理 expired locks）

**State Machine** (status 由 `email_verified_at` + `locked_until` + `deleted_at` 推導，無單獨欄位)：

```text
PENDING_VERIFICATION (email_verified_at IS NULL)
    │ ─── verify(token) ──→ VERIFIED (email_verified_at = now)
    │ ─── token expired ──→ PENDING (重新申請)

VERIFIED
    │ ─── failed_login × N ─→ LOCKED (locked_until = now + 60s)
    │ ─── manual_delete ────→ DELETED (deleted_at set)

LOCKED
    │ ─── locked_until past ─→ VERIFIED (auto-unlock)
    │ ─── correct_password + still_within_lock ─→ stays LOCKED
```

**Validation rules**:
- Email：FR-001（lowercase compare）+ RFC 5322 格式
- Password（在 Credential，不在此表）
- `display_name`：1~64 字元、無前後空白
- `avatar_path` 寫入時必為 `avatars/{uuid}.{ext}`，其中 ext ∈ {jpg, png, webp}

---

## E2. Credential（憑證）

與 `members` 一對一拆出，使密碼歷史 / 雜湊演算法變更不影響 member 主表。本期僅一筆 active credential。

| 欄位 | 型別 | 限制 | 說明 |
|---|---|---|---|
| `id` | bigint UN PK | auto | |
| `member_id` | bigint UN FK | UNIQUE, NOT NULL | 一對一 |
| `password_hash` | char(60) | NOT NULL | bcrypt（Laravel 預設 cost 12） |
| `password_changed_at` | timestamp | NOT NULL | FR-008 變更後其他 session 失效用 |
| `created_at` / `updated_at` | timestamp | NOT NULL | |

**Validation**:
- 明文密碼 ≥ 8 字元、含字母與數字（FR-002），雜湊後存入

**Relationship**: `Member hasOne Credential`，刪除 member 時 cascade。

---

## E3. EmailVerificationToken（驗證權證）

| 欄位 | 型別 | 限制 | 說明 |
|---|---|---|---|
| `id` | bigint UN PK | auto | |
| `member_id` | bigint UN FK | INDEX, NOT NULL | |
| `token_hash` | char(64) | UNIQUE, NOT NULL | SHA-256(token)，原始 token 只放信中連結 |
| `expires_at` | timestamp | NOT NULL | 預設 created + 60 分鐘 |
| `consumed_at` | timestamp | NULL | 使用後寫入時間 |
| `created_at` | timestamp | NOT NULL | |

**Lifecycle**:
- 申請 → 為該 member 將既有未消費 token 標記 `consumed_at = now`（FR-013：舊連結作廢），再插入新 token
- 驗證 → 比對 hash + `consumed_at IS NULL` + `expires_at > now`，通過則更新 `members.email_verified_at` 與本 token `consumed_at`
- 一次性（FR-010 同類規則）

**Index**: INDEX(`member_id`, `consumed_at`)

---

## E4. PasswordResetToken（重設權證）

欄位結構與 E3 同（換表名與用途）。

| 欄位 | 型別 | 限制 | 說明 |
|---|---|---|---|
| `id` | bigint UN PK | auto | |
| `member_id` | bigint UN FK | INDEX, NOT NULL | |
| `token_hash` | char(64) | UNIQUE, NOT NULL | |
| `expires_at` | timestamp | NOT NULL | created + 60 分鐘（FR-010） |
| `consumed_at` | timestamp | NULL | |
| `created_at` | timestamp | NOT NULL | |

**Lifecycle**: 同 E3，但成功時更新 `credentials.password_hash` 與 `credentials.password_changed_at`，並透過 PasswordChanged event 觸發 SessionInvalidationListener（廢除其他 session，FR-008）

---

## E5. Session（工作階段）

Laravel `sessions` table（`php artisan session:table`），database driver。

| 欄位 | 型別 | 限制 | 說明 |
|---|---|---|---|
| `id` | varchar(255) PK | | Session ID（cookie 值） |
| `user_id` | bigint UN | INDEX, NULL | Member.id；訪客時 NULL |
| `ip_address` | varchar(45) | NULL | IPv4/IPv6 |
| `user_agent` | text | NULL | |
| `payload` | longtext | NOT NULL | 序列化 session data |
| `last_activity` | int UN | INDEX, NOT NULL | UNIX timestamp |

**Lifetime rules** (FR-016)：
- 「記住我」未勾選 → `config/session.php` `expire_on_close = true`，cookie 為 session cookie（瀏覽器關閉即清）
- 「記住我」勾選 → Fortify 寫入 `remember_token` 至 members 表並下 14 天 cookie；後續訪問 cookie 帶 token 自動重建 session

**Invalidation triggers**：
- 主動登出（FR-005）：刪除當前 session row
- 密碼變更（FR-008）：依 member_id 刪除該 member 的所有 sessions
- 密碼重設（FR-010）：同上

---

## E6. AuditEvent（稽核事件）

| 欄位 | 型別 | 限制 | 說明 |
|---|---|---|---|
| `id` | bigint UN PK | auto | |
| `member_id` | bigint UN FK | INDEX, NULL | 失敗登入時 member 可能未識別 |
| `event_type` | varchar(40) | NOT NULL | enum 字串：見下表 |
| `result` | varchar(10) | NOT NULL | `success` / `failure` |
| `ip_address` | varchar(45) | NULL | |
| `user_agent` | text | NULL | |
| `metadata` | json | NULL | 例：lockout 倒數秒數 |
| `created_at` | timestamp | INDEX, NOT NULL | 用於 30 天清理（FR-014） |

**event_type 列舉**：
- `login.success`
- `login.failure`
- `login.lockout`
- `password.change`
- `password.reset.request`
- `password.reset.complete`
- `email.verification.request`
- `email.verification.complete`
- `registration`

**Retention**: 每日 cron `members:prune-audit-events`（artisan command）刪除 `created_at < now - 30 days`（FR-014 至少保留 30 天，可清除）

**Immutability**: 無 update 路徑；只有 insert 與 prune

---

## 跨 entity 關係圖

```text
Member 1 ─── 1 Credential
       1 ─── n EmailVerificationToken
       1 ─── n PasswordResetToken
       1 ─── n Session (via user_id)
       1 ─── n AuditEvent
```

## Migration 順序（依 FK 依賴）

1. `2026_05_22_000001_create_members_table`
2. `2026_05_22_000002_create_credentials_table`
3. `2026_05_22_000003_create_email_verification_tokens_table`
4. `2026_05_22_000004_create_password_reset_tokens_table`
5. `2026_05_22_000005_create_sessions_table`（laravel 預設）
6. `2026_05_22_000006_create_audit_events_table`
