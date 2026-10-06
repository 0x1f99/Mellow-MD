<h1 align="center">Mellow MD</h1>

<p align="center">
  A self-hosted, multi-device WhatsApp bot built with Node.js and Baileys.
</p>

<p align="center">
  <a href="https://github.com/0x1f99/Mellow-MD/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-2E8B57?style=for-the-badge" alt="MIT License" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-22.13%2B-339933?logo=node.js&style=for-the-badge" alt="Node.js 22.13 or later" />
  </a>
  <a href="https://github.com/0x1f99/Mellow-MD">
    <img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&style=for-the-badge" alt="WhatsApp bot powered by Baileys" />
  </a>
</p>

Mellow MD connects to WhatsApp using Baileys multi-device authentication and provides a plugin-based set of group, media, utility and owner commands. It runs as a Node.js process on a machine or hosting service you control.

> [!CAUTION]
> Use a dedicated WhatsApp account where possible. WhatsApp may restrict accounts that violate its terms or send unwanted messages. Use the bot responsibly and obtain consent before messaging people or adding the bot to groups.

## Features

- Multi-device WhatsApp connection with local session credentials
- Plugin-based commands for group administration, warnings, welcome/goodbye messages and anti-link moderation
- Media tools for sticker creation, audio/video conversion, reverse playback and downloaders
- Utility commands for QR codes, time, lyrics and bot information
- Optional status automation, always-online presence and update checks
- SQLite-backed message and contact storage using Node.js's built-in `node:sqlite`
- Local-time display detected from the host machine, with an optional timezone override

Command modules are organized under [`src/plugins`](./src/plugins) by category. The registry recursively discovers JavaScript modules in those category folders at startup and the command menu and help output are generated from the registered commands.

## Requirements

- Node.js **22.13.0 or newer**
- npm (or Bun, if preferred)
- Git
- FFmpeg and FFprobe for sticker, audio, video and media commands

The SQLite store uses Node.js's built-in `node:sqlite` module, so no separate SQLite package or native build toolchain is needed.

## Quick start

```bash
git clone https://github.com/DemmyJay-99/Mellow-MD.git
cd Mellow-MD
npm install
```

Create a `config.env` file in the project root and add your configuration. On macOS/Linux, you can start with:

```bash
touch config.env
```

On Windows PowerShell:

```powershell
New-Item config.env
```

Add these settings to the file:

```env
SESSION_ID=
PREFIX=!,.
PLATFORM=Local
TIMEZONE=
FFMPEG_PATH=ffmpeg
```

Get a session ID from the [Mellow MD pairing site](https://mellow-md.zone.id/) and set it as `SESSION_ID`. Keep session credentials and API keys private; do not commit `config.env` or your session files.

Start the bot:

```bash
npm start
```

The bot downloads the session credentials on first startup, validates them and connects to WhatsApp. Session files are stored under `session/`. The SQLite message/contact database is stored at `data/baileys_store.db`; other persistent bot settings are stored in the same `data/` directory.

### Install FFmpeg

FFmpeg and FFprobe must be executable by the same account that runs the bot.

- **Windows:** Install a prebuilt FFmpeg package, such as one from [Gyan's FFmpeg builds](https://www.gyan.dev/ffmpeg/builds/) and add its `bin` directory to `PATH`.
- **macOS:** `brew install ffmpeg`
- **Debian/Ubuntu:** `sudo apt install ffmpeg`
- **Other Linux distributions:** Install FFmpeg with the distribution's package manager.

Verify the tools and encoder availability:

```bash
ffmpeg -version
ffprobe -version
ffmpeg -hide_banner -encoders
```

Sticker commands need `libwebp` and (for animated stickers) `libwebp_anim`; video conversion uses `libx264` and AAC. Set `FFMPEG_PATH` and `FFPROBE_PATH` if the executables are not on `PATH`.

## Configuration

The application loads settings from `config.env`; values supplied directly in the process environment (for example, hosting-provider secrets) take precedence over values in that file.

| Variable                                                        | Purpose                                                                    | Default / behavior                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `SESSION_ID`                                                    | Session ID from the pairing site                                           | Required on first setup                                |
| `PREFIX`                                                        | Comma-separated command prefixes                                           | `!,.`                                                  |
| `PLATFORM`                                                      | Platform label shown in the menu                                           | Not set                                                |
| `TIMEZONE`                                                      | IANA timezone for displayed dates and times, such as `America/Los_Angeles` | Automatically detected from the host                   |
| `FFMPEG_PATH`                                                   | FFmpeg executable or absolute path                                         | `ffmpeg`                                               |
| `FFPROBE_PATH`                                                  | Optional FFprobe executable or absolute path                               | `ffprobe` or next to `FFMPEG_PATH` when that is a path |
| `STICKER_PACKNAME`                                              | Sticker pack name and author, separated by a comma                         | `Mellow MD,Mellow`                                     |
| `ALWAYS_ONLINE`                                                 | Keep the WhatsApp presence online when connected                           | `false`                                                |
| `AUTO_UPDATE_BOT`                                               | Allow dependency installation after a Git pull                             | `false`                                                |
| `EXPLICIT_LOGS`                                                 | Enable additional message/store logs                                       | `false`                                                |
| `MSG_MAX_AGE`                                                   | Message retention time in milliseconds                                     | `86400000` (one day)                                   |
| `GENIUS_API_KEY`                                                | Genius API key for lyrics lookup                                           | Required for Genius-backed lyrics                      |
| `YT_COOKIE`                                                     | YouTube cookies for supported media downloads                              | Not set                                                |
| `REACT_EMOJI`                                                   | Emoji used for command reactions                                           | `✨`                                                   |
| `WARN_LIMIT`                                                    | Warning count used by group moderation                                     | `3`                                                    |
| `OWNER_NAME`                                                    | Owner name shown by bot information                                        | `Mellow`                                               |
| `BANK_NAME`, `BANK_NUMBER`, `BANK_ACCOUNT_NAME`                 | Optional bank details used by the bot                                      | Not set                                                |
| `STATUS_DOWNLOAD_JID`, `STATUS_EXCEPT_VIEW`, `STATUS_ONLY_VIEW` | Optional status automation settings                                        | Not set                                                |

When `TIMEZONE` is empty, the bot uses the timezone reported by the machine running Node.js. Set `TIMEZONE` explicitly if the host is configured for UTC or a different timezone than the one you want displayed.

`SESSION_ID` is used to download the initial Baileys credentials into `session/`. Once a valid local session exists, the bot can use those saved credentials on later starts. Do not publish the session ID, session directory or `config.env`.

The update helper runs `git pull` at startup and then once every 24 hours. `AUTO_UPDATE_BOT=true` only enables a `yarn install` when the pulled changes include `package.json` or `yarn.lock`; it does not disable the pull itself. Run the bot from a Git checkout and review this behavior before using it on a deployment where automatic source updates are not wanted.

## Deployment

### VPS or local machine

Follow the [Quick start](#quick-start) steps on a machine that can remain online. To run under PM2 instead of directly in the foreground:

```bash
npm run start:pm2
npm run stop
```

Keep the `config.env`, `session/` and `data/` files private and include them in your backup plan.

### Replit

The repository includes a Replit workflow configured to run `node index.js` with Node.js 24.

1. Import or fork this repository in Replit.
2. Add `SESSION_ID` and any other private configuration as Replit Secrets.
3. Install the project dependencies if Replit has not done so automatically:

   ```bash
   npm install
   ```

4. Start the configured **Project** workflow.

FFmpeg must be available in the Replit environment for media and sticker features. Use a deployment environment that permits a long-running process and outbound connections.

### Other Node.js hosts

On a VM, container or Node.js hosting service:

1. Provide Node.js 22.13.0 or newer and FFmpeg/FFprobe.
2. Install dependencies with `npm install`.
3. Set `SESSION_ID` and other secrets in the host's environment configuration.
4. Start the process with `npm start`.

The included Dockerfile should be reviewed and adjusted for the target host before use; it currently refers to an external base image and repository setup.

## Project layout

| Path                               | Purpose                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| [`index.js`](./index.js)           | Application entry point and WhatsApp connection                             |
| [`config.js`](./config.js)         | Environment loading and bot defaults                                        |
| [`src/plugins`](./src/plugins)     | Command modules grouped by feature; external plugins live under `eplugins/` |
| [`src/utils`](./src/utils)         | Shared media, database, session, messaging and date/time helpers            |
| `config.env`                       | Local configuration and secrets; create it in the repository root           |
| `session/`                         | Baileys multi-file authentication state (created at runtime)                |
| `data/`                            | SQLite store and persistent group, status, permission and sudo data         |
| `tmp/`                             | Temporary downloaded media used by message history                          |
| [`jsconfig.json`](./jsconfig.json) | JavaScript editor and type-checking configuration                           |

### Command inventory

The following command modules are loaded from the source tree. A command may also define aliases in its module. Prefixes default to `!` and `.`; set `PREFIX` to a comma-separated list to override them.

| Category    | Modules                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Development | `jid`, `lid`                                                                                                                                                                                                                  |
| Downloaders | `fb`, `insta`, `play`, `tiktok`, `twitter`, `yta`, `ytv`                                                                                                                                                                      |
| Fun         | `demorse`, `lyrics`, `morse`                                                                                                                                                                                                  |
| General     | `help`, `menu`, `ping`, `repo`, `uptime`, `version`                                                                                                                                                                           |
| Group       | `add`, `addpp`, `antilink`, `demote`, `disable`, `gcdesc`, `gclabel`, `gcname`, `ginfo`, `goodbye`, `gpp`, `invite`, `kick`, `leave`, `mute`, `promote`, `revoke`, `tag`, `unblock`, `unmute`, `warn`, `warnreset`, `welcome` |
| Maker       | `sticker`, `take`                                                                                                                                                                                                             |
| Owner       | `allvars`, `antidelete`, `aza`, `block`, `delplugin`, `delsudo`, `delvar`, `enable`, `getsudo`, `getvar`, `getwarn`, `plugin`, `restart`, `rmpp`, `setsudo`, `setvar`, `update`                                               |
| Tools       | `autostatus`, `delete`, `edit`, `mp3`, `mp4`, `qr`, `reverse`, `time`, `vv`                                                                                                                                                   |

At a high level, the modules cover group moderation and configuration, social-media and YouTube downloads, sticker/media conversion, message utilities, status automation and owner/plugin management. Check each module's `description` and `usage` fields for its exact behavior and arguments. Media downloaders depend on external sites and may stop working when those sites change.

### Group command access

The message handler treats messages sent by the bot account and configured sudo users as owner-level requests. Other users' commands are accepted only in groups where the command has been enabled. Group command access is stored in `data/perms.json`; the `enable` and `disable` commands are intended to manage that per-group allowlist. Commands marked owner-only cannot be enabled for general group use. Ordinary direct-message commands are not enabled by this access check.

Group settings such as anti-link behavior, welcome/goodbye messages and warning counts are stored in `data/group.json`. The anti-link action can be configured to delete, warn or kick; kick/delete behavior requires the bot to have the corresponding group-admin permissions. Status automation settings are stored in `data/status.json`, while sudo users are stored in `data/sudoUserStore.json`.

### Message and media retention

The bot persists message and contact data in `data/baileys_store.db`. Media from stored messages is downloaded to `tmp/media/` so it can be used later by message utilities. Old message records and their associated media are cleaned up on startup and hourly; the default retention is 24 hours and can be changed with `MSG_MAX_AGE` (milliseconds). This is message storage, not a no-storage bot: protect the database, temporary media, backups and host access accordingly. Files under `session/`, `data/` and `tmp/` should not be committed or shared.

### Connection behavior

The bot validates the saved Baileys credentials before connecting. If WhatsApp disconnects for a reason other than logout, it attempts to reconnect after five seconds. A logged-out session is not retried; generate or restore a valid session before restarting. Avoid running multiple instances with the same session.

### Security and privacy

- Use a dedicated WhatsApp account where possible and get consent before adding the bot to groups or contacting people.
- Treat `SESSION_ID`, `session/`, `config.env`, `data/` and backups as private credentials or user data.
- The message store contains message text/metadata, contacts and downloaded media. Retention cleanup is not a substitute for access controls or encrypted backups.
- Owner/sudo access is intended for trusted operators only. Do not add untrusted users as sudo users.
- Download and update features depend on third-party websites and the configured Git remote; review those integrations before running in production.

### Media requirements

FFmpeg is used by sticker creation, audio extraction and media conversion/reversal. `FFPROBE_PATH` is used by video trimming; it defaults to `ffprobe` on `PATH` or to an `ffprobe` sibling next to `FFMPEG_PATH` when an absolute FFmpeg path is configured. Use an FFmpeg build that includes the encoders needed for the features you plan to use, including `libwebp`/`libwebp_anim` for stickers and `libx264`/AAC for video conversion. Confirm `ffmpeg` and `ffprobe` are available to the same account that runs Node. The YouTube and Twitter downloaders fetch the platform-specific `yt-dlp` binary into `bin/` on first use; the bot needs network access and write permission there.

## Development

Install dependencies and run the configured JavaScript typecheck:

```bash
npm install
npm run typecheck
```

Format the project with:

```bash
npm run format
```

`npm test` is currently a placeholder that exits with an error; there is no automated test suite configured yet. `npm run typecheck` runs the configured TypeScript check over the JavaScript project.

## Troubleshooting

### SQLite module is unavailable

Check that the runtime is Node.js 22.13.0 or newer:

```bash
node --version
```

The application uses Node's built-in `node:sqlite` module; it does not require `better-sqlite3` or a separate SQLite package.
Node may print an `ExperimentalWarning` for `node:sqlite` on this runtime; that warning is informational.

### FFmpeg or sticker conversion fails

Confirm both `ffmpeg` and `ffprobe` are available in `PATH`. If FFmpeg is installed elsewhere, set `FFMPEG_PATH` in `config.env`. If FFprobe is not beside that executable or on `PATH`, set `FFPROBE_PATH` as well. Ensure the FFmpeg build includes the `libwebp` encoder and, for animated stickers, `libwebp_anim`.

### WhatsApp session is rejected

Check that `SESSION_ID` is current and that the pairing session is valid. Do not run multiple bot instances using the same session. If re-pairing is necessary, stop the bot and handle the existing session files carefully before connecting again.

### Menu or commands are unavailable

The loader recursively discovers `.js` modules under `src/plugins` and separately loads external modules from `src/plugins/eplugins`. Check startup output for `[SKIP] Failed to load plugin` messages. A module must export a default command object with a `name` and an `execute` function to be registered.

### Bot updates or dependencies behave unexpectedly

The update helper performs `git pull` even when `AUTO_UPDATE_BOT` is unset or `false`; that setting only controls whether it runs `yarn install` after certain pulled dependency-file changes. If you need a fixed deployment, run a reviewed checkout and adjust or disable the automatic pull behavior in the source before deploying.

## Disclaimer

Mellow MD is an independent project and is not affiliated with WhatsApp or Meta. You are responsible for complying with WhatsApp's [Terms of Service](https://www.whatsapp.com/legal/terms-of-service), applicable law and the privacy expectations of people you contact.

## Support

- Report bugs or request features through [GitHub Issues](https://github.com/0x1f99/Mellow-MD/issues).
- The project also references its [Telegram updates channel](https://t.me/mellowmd).
- Never include session IDs, `config.env`, authentication files, private message databases or downloaded media in an issue or support request.

## License

This project is licensed under the [MIT License](./LICENSE).
