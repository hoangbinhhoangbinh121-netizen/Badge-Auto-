# Badge Bot v4

Discord badge spoofer bot — Node.js, server-locked, VIP tier support.

## What's new in v4

- **Server lock** — bot only responds in guild `1530517263046934569`
- **VIP tier** — role-based higher limits (configurable via `VIP_ROLE_ID`)
- **`/menu` command** — shows all commands + quick start guide
- **User self-token input** — each user enters their own token via secure modal
- **Tier-aware `/status`** — shows your limits based on role

## Setup

```bash
npm install
cp .env.example .env
# fill in .env values
node deploy-commands.js   # register slash commands (run once)
node index.js             # start bot
```

## .env

```
BOT_TOKEN=...       # bot token from Discord Dev Portal (only required field)
GUILD_ID=1530517263046934569   # already hardcoded in config.js, keep as-is
VIP_ROLE_ID=...     # role ID for VIP tier (leave empty to disable)
```

> `CLIENT_ID` không cần nhập — `deploy-commands.js` tự lấy từ bot token.

## Commands

| Command | Description |
|---|---|
| `/menu` | Show all commands + quick start guide |
| `/badge [games] [hours] [reauth]` | Claim game badges |
| `/setcookie` | Set cf_clearance cookie (bot owner) |
| `/status` | Show auth state + tier info + stats |
| `/cleargames` | Reset used-games rotation |

## User flow

1. Run `/setcookie` → paste `cf_clearance` cookie
2. Run `/badge` → modal appears, paste **user token**
3. Run `/badge games:50 hours:2` → claim starts
4. Results sent to DM

## Tier limits

| | Standard | VIP |
|---|---|---|
| Max games | 100 | 500 |
| Max hours/game | 10 | 24 |

VIP = members with `VIP_ROLE_ID` role.
