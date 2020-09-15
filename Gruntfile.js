module.exports = function (grunt) {
    "use strict";

    // Force use of Unix newlines
    grunt.util.linefeed = "\n";

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        prettier: {
            files: {
                src: ["**.js", "**.json", "**.css", "**.scss", "!app/css/sass/vendor/**.scss"],
            },
        },

        sass: {
            dist: {
                options: {
                    style: "compressed",
                    unixNewlines: true,
                },
                files: {
                    "app/css/app.css": "app/css/sass/app.scss",
                },
            },
            dev: {
                options: {
                    sourcemap: "auto",
                    style: "expanded",
                    unixNewlines: true,
                },
                files: {
                    "app/css/app.css": "app/css/sass/app.scss",
                },
            },
        },

        watch: {
            sass: {
                files: "app/css/sass/**/*.scss",
                tasks: ["sass:dev"],
                options: {
                    atBegin: true, // execute sass compilation on watch
                },
            },
        },
    });

    // Load the plugins
    require("load-grunt-tasks")(grunt, { scope: "devDependencies" });

    // Tasks
    grunt.registerTask("default", ["sass:dev", "prettier"]);
    grunt.registerTask("dist", ["sass:dist"]);
};
