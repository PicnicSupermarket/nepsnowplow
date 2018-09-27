# <img src="https://github.com/PicnicSupermarket/nepsnowplow/blob/master/icon.png?raw=true" width="28" alt="NepSnowplow" /> NepSnowplow

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

# Start NepSnowplow
yarn start
```

## Usage

Point a device or webpage to your local machine to collect their Snowplow events. Your IP address
and listening port is listed at the bottom of the app. Events should appear within seconds.

### Events

For each event, NepSnowplow will list the event details and all associated contexts. For more
information about Snowplow events, check out the docs on the [Snowplow Canonical Event
Model][canonical-event-model].

### Schemas

NepSnowplow supports both locally stored schemas as well as schemas in an iglu repository.

Note: only one vendor, event, format and version combination should exist. If multiple are found,
local schemas take precedence.

#### Local schemas

To validate events and contexts, you need to place their schemas in the `schemas` folder (or
whichever folder you've [defined](#configure)). To get started, check out Snowplow's own set of
schemas on [Iglu Central][iglu-central].

Make sure each schema is a separate file with either no extension or `.json`. The recommended
structure is `<vendor>/<event_or_context>/jsonschema/<schema_version>`. For example:

```
schemas
└── com.snowplowanalytics.snowplow
    ├── screen_view
    │   └── jsonschema
    │       └── 1-0-0
    └── link_click
        └── jsonschema
            └── 1-0-0
```

#### Remote schemas

Your schemas might live in an iglu repository provided by an [iglu server][iglu-server]. To make
sure your events are always validated against the latest deployed schemas, you can
[configure](#configure) the repository. Schemas will be pulled on every startup.

## Configure

Options can be set in `settings.json`, the defaults are:

```js
{
    "showSchemaValidation": false, // whether to turn validation on or off on startup
    "schemaDir": "schemas/",       // folder where Snowplow schemas are situated
    "repos": [
        {
            "url": "",                   // url to the iglu repository
            "apikey": "",                // apikey for authentication
            "vendors": []                // the schema's vendors you wish to retrieve
        }
    ],
    "listeningPort": 3000          // port NepSnowplow listens to
}
```

Depending on your operating system, the settings and schemas can be found in the following location:

-   Windows:
    -   Installed version (exe): `C:\Users\<username>\AppData\Local\Programs\nepsnowplow\Resources`.
    -   Portable version (zip): where you've extracted the `*.zip` file.
-   OS X: `~/Applications/NepSnowplow/Contents/Resources`.
-   Linux: where you've extracted the `*.tar.gz` file.

_If no events arrive, check if NepSnowplow is allowed by Windows Firewall_

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
`dist\<platform>-unpacked\NepSnowplow.exe`. Don't forget to set the version back to the right value
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
[iglu-server]: https://github.com/snowplow/iglu
[new-issue]: https://github.com/PicnicSupermarket/nepsnowplow/issues/new
[new-pr]: https://github.com/PicnicSupermarket/nepsnowplow/compare
[prettier-badge]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square
[prettier]: https://github.com/prettier/prettier
[snowplow-analytics]: https://snowplowanalytics.com
[travisci-badge]: https://travis-ci.com/PicnicSupermarket/nepsnowplow.svg?branch=master
[travisci-builds]: https://travis-ci.com/PicnicSupermarket/nepsnowplow
