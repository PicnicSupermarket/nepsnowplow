# NepSnowplow

This little gem of a tool sets-up a local server that acts as a collector for Snowplow events. By default, it listens on port `3000`, but this can be configured.

## Getting started

Simply run:

```bash
# Install dependencies
yarn

# Start NepSnowplow
yarn start
```

## Configure

Options can be set in `app.js`, the defaults are:

_TODO make JSON_

```javascript
global.options = {
    showSchemaValidation: false,
    schemaDir: "schemas/",
    listeningPort: 3000
};
```

## Development

During development, one can compile new styles in one of the SCSS files using:

```bash
grunt sass:[dev|dist] # dev is compiled expanded and includes a sourcemap, dist comiples to minified css
```

To test a package locally:

```bash
yarn package
```

Alternatively, each change can be automatically compiled using:

```bash
grunt watch
```

## Contributing

Contributions are welcome! Feel free to file an [issue](https://github.com/PicnicSupermarket/nepsnowplow/issues/new) or open a [pull request](https://github.com/PicnicSupermarket/nepsnowplow/compare).

When submitting changes, please make every effort to follow existing conventions and style in order to keep the code as readable as possible. New code must be covered by tests. As a rule of thumb, overall test coverage should not decrease. (There are exceptions to this rule, e.g. when more code is deleted than added.)
