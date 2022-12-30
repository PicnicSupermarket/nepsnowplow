module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
    },
    extends: ["airbnb-base", "prettier"],
    overrides: [],
    parserOptions: {
        ecmaVersion: "latest",
    },
    settings: {
        "import/core-modules": ["electron", "electron-reloader"],
    },
    rules: {
        "global-require": "off",
        "class-methods-use-this": "off",
        "no-param-reassign": "off",
    },
};
