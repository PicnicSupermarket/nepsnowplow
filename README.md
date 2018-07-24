# <img src="https://github.com/PicnicSupermarket/nepsnowplow/blob/master/icon.png?raw=true" width="28" alt="NepSnowplow" /> NepSnowplow

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Build Status](https://travis-ci.com/PicnicSupermarket/nepsnowplow.svg?token=uNRsa5BVyugmRypyGGg2&branch=master)](https://travis-ci.com/PicnicSupermarket/nepsnowplow)

This little gem of a tool sets-up a local server that acts as a collector for [Snowplow Analytics](https://snowplowanalytics.com/) events. By default, it listens on port `3000`, but this can be [configured](#configure).

## Getting started

Simply run:

```bash
# Install dependencies and compile styles
yarn

# Start NepSnowplow
yarn start
```

## Usage

Point your device or webpage to your local machine and to send Snowplow events to be collected. Your IP address and listening port is listed at the bottom of the app. Events should appear within seconds.

### Events

For each event, NepSnowplow will list the event details and all associated contexts. For more information about Snowplow events, check out the docs on the [Snowplow Canonical Event Model](https://github.com/snowplow/snowplow/wiki/canonical-event-model).

### Schemas

To validate events and contexts, you need to place their schemas in the `schemas` folder (or whichever folder you've [defined](#configure)). To get started, check out Snowplow's own set of schemas on [Iglu Central](https://github.com/snowplow/iglu-central). The recommended structure is `<vendor>/<event_or_context>/jsonschema/<schema_version>`. For example:

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

## Configure

Options can be set in `settings.json`, the defaults are:

```javascript
{
    "showSchemaValidation": false, // whether to turn validation on or off on startup
    "schemaDir": "schemas/", // folder where Snowplow schemas are situated
    "listeningPort": 3000 // port NepSnowplow listens to
}
```

Depending on your operating system, the settings and schemas can be found in the following location:

Windows: `C:\Users\<username>\AppData\Local\Programs\nepsnowplow`
OS X: `a`
Linux: where you extract the tar.gz

## Development

### Style compilation

During development, one can compile new styles in one of the SCSS files using:

```bash
yarn compile
```

Alternatively, each change can be automatically compiled using:

```bash
yarn watch
```

### Packaging

This electron app is packaged and published through [electron-builder](https://electron.build).

To test a package locally for distribution, use:

```bash
yarn package
```

## Roadmap

There are a few features that are on the roadmap to be developed and increase further usability.

-   [ ] Schema repository support: Sync schemas with a remote iglu repository for event and context validation
-   [ ] Multi-device support: create the ability to show events for a specific device
-   [ ] Tree-based event viewer: introduce the abiltiy to switch to a hierarchical tree based on event name

## Contributing

Contributions are welcome! Feel free to file an [issue](https://github.com/PicnicSupermarket/nepsnowplow/issues/new) or open a [pull request](https://github.com/PicnicSupermarket/nepsnowplow/compare).

When submitting changes, please make every effort to follow existing conventions and style in order to keep the code as readable as possible. New code must be covered by tests. As a rule of thumb, overall test coverage should not decrease. (There are exceptions to this rule, e.g. when more code is deleted than added.)
