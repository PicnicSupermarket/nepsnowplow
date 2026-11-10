# <img src="https://github.com/PicnicSupermarket/nepsnowplow/blob/master/icon.png?raw=true" width="28" alt="NepperSnowplow" /> NepperSnowplow

[![Code style: prettier][prettier-badge]][prettier]
[![Build Status][travisci-badge]][travisci-builds]

This little gem of a tool sets up a local server that acts as a collector for[Snowplow
Analytics][snowplow-analytics] events. By default, it listens on port `3000`, but this can be
[configured](#configure).

## Getting started

Simply run:

```sh
# Install dependencies and compile styles
yarn

# Start NepperSnowplow
yarn start
```

## Usage

Point a device or webpage to your local machine to collect their Snowplow events. Your IP address
and listening port is listed at the bottom of the app. Events should appear within seconds.

### Events

For each event, NepperSnowplow will list the event details and all associated contexts. For more
information about Snowplow events, check out the docs on the [Snowplow Canonical Event
Model][canonical-event-model].

### Validation using Snowplow Micro

To validate events using Snowplow Micro, please make sure to add the required configuration files
(`micro.conf` and `iglu.json`) in the `snowplow_micro_config/` folder. For more info about the
Snowplow Micro configuration, see:
https://github.com/snowplow-incubator/snowplow-micro#configuring-micro

## MCP server (for AI agents)

While NepperSnowplow is running it also serves an [MCP](https://modelcontextprotocol.io) endpoint so
coding agents can read captured events. It is a streamable-HTTP server at
`http://127.0.0.1:3100/mcp`, bound to localhost only, so there is nothing to install or spawn: start
the app, then register the URL once in your agent.

```sh
# Claude Code
claude mcp add --transport http nepsnowplow http://127.0.0.1:3100/mcp

# Codex
codex mcp add nepsnowplow --url http://127.0.0.1:3100/mcp

# pi
pi mcp add nepsnowplow --url http://127.0.0.1:3100/mcp
```

Codex can also be configured by hand in `~/.codex/config.toml`:

```toml
[mcp_servers.nepsnowplow]
url = "http://127.0.0.1:3100/mcp"
```

Inside this repository, `.mcp.json` (Claude Code) and `.pi/mcp.json` (pi) already contain the entry.

### Tools

Tools are designed to keep token usage low: listings are one plain-text line per event, and full
payloads are only returned on request.

| Tool              | Purpose                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `wait_for_events` | **Listen live.** Blocks until new matching events arrive (or a timeout), then returns them.                 |
| `search_events`   | **Search history.** Filter captured events by text, schema, context, kind or validity; newest first, paged. |
| `list_schemas`    | Event counts per schema (with invalid counts), the cheapest way to see what is flowing.                     |
| `get_event`       | Full JSON of one event. Long values are truncated and contexts are expanded only when asked for.            |
| `get_status`      | Collector port, paused flag, buffered event count and newest event id.                                      |

Following a stream: call `wait_for_events` (optionally with `schema` / `query` / `validity`
filters), then pass the returned `next_after_id` as `after_id` on the next call to continue without
gaps or repeats. Without `after_id` only events arriving after the call are returned.
`timeout_seconds` is capped at 55 so it stays under common MCP client request timeouts.

The endpoint port is `mcpPort` in `settings.json` (default `3100`, `0` disables it). Events are kept
in memory (last 5000), and ids keep increasing even when events are cleared in the app.

## Configure

Options can be set in `settings.json`, the defaults are:

```js
{
  "listeningPort": 3000,         // port NepperSnowplow listens to
  "mcpPort": 3100                // port of the MCP endpoint for agents (0 = off)
}
```

Depending on your operating system, the settings can be found in the following location:

-   Windows:
    -   Installed version (exe): `C:\Users\<username>\AppData\Local\Programs\neppersnowplow\Resources`.
    -   Portable version (zip): where you've extracted the `*.zip` file.
-   OS X: `~/Applications/NepperSnowplow/Contents/Resources`.
-   Linux: where you've extracted the `*.tar.gz` file.

_If no events arrive, check if NepperSnowplow is allowed by Windows Firewall_

## Development

### Style compilation

During development, one can compile new styles in one of the SCSS files using:

```sh
yarn compile
```

Alternatively, each change can be automatically compiled using:

```sh
yarn watch
```

### Packaging

This electron app is packaged and published through [`electron-builder`][electron-builder].

To test a package locally for distribution, use:

```sh
yarn package
```

### Debugging autoUpdater

First, make sure the version in `package.json` is lower than the latest published version.

Second, place `dev-app-update.yml` in the root folder, containing:

```yaml
owner: PicnicSupermarket
repo: nepsnowplow
provider: github
```

Finally, to make sure it works in production, you can execute `yarn build` and run
`dist\<platform>-unpacked\NepperSnowplow.exe`. Don't forget to set the version back to the right value
before pushing any commits.

## Roadmap

There are a few features that are on the roadmap to be developed so as to increase further
usability:

-   [ ] Multi-device support: create the ability to show events for a specific device.
-   [ ] Tree-based event viewer: introduce the abiltiy to switch to a hierarchical tree based on
        event name.

## Contributing

Contributions are welcome! Feel free to file an [issue][new-issue] or open a [pull request][new-pr].

When submitting changes, please make every effort to follow existing conventions and style in order
to keep the code as readable as possible. New code must be covered by tests. As a rule of thumb,
overall test coverage should not decrease. (There are exceptions to this rule, e.g. when more code
is deleted than added.)

[canonical-event-model]: https://github.com/snowplow/snowplow/wiki/canonical-event-model
[electron-builder]: https://electron.build
[iglu-central]: https://github.com/snowplow/iglu-central
[new-issue]: https://github.com/PicnicSupermarket/nepsnowplow/issues/new
[new-pr]: https://github.com/PicnicSupermarket/nepsnowplow/compare
[prettier-badge]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square
[prettier]: https://github.com/prettier/prettier
[snowplow-analytics]: https://snowplowanalytics.com
[travisci-badge]: https://travis-ci.com/PicnicSupermarket/nepsnowplow.svg?branch=master
[travisci-builds]: https://travis-ci.com/PicnicSupermarket/nepsnowplow
