# NepSnowplow

This little gem of a tool sets-up a local server that acts as a collector for Snowplow events. By default, it listens on port `3000`, but this can be configured.

## Getting started

Simply run:

```bash
# Install dependencies and compile styles
yarn

# Start NepSnowplow
yarn start
```

## Configure

Options can be set in `settings.json`, the defaults are:

```javascript
global.options = {
    showSchemaValidation: false, // where to turn validation on or off on startup
    schemaDir: "schemas/", // folder where Snowplow schemas as situated
    listeningPort: 3000 // port NepSnowplow listens to
};
```

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

-   [ ] Multi-device support: create the ability to show events for a specific device
-   [ ] Tree-based event viewer: introduce the abiltiy to switch to a hierarchical tree based on event name

## Contributing

Contributions are welcome! Feel free to file an [issue](https://github.com/PicnicSupermarket/nepsnowplow/issues/new) or open a [pull request](https://github.com/PicnicSupermarket/nepsnowplow/compare).

When submitting changes, please make every effort to follow existing conventions and style in order to keep the code as readable as possible. New code must be covered by tests. As a rule of thumb, overall test coverage should not decrease. (There are exceptions to this rule, e.g. when more code is deleted than added.)
