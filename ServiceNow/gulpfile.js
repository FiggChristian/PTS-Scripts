const USERSCRIPT_FILE = "/Users/christianfigueroa/Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/scripts/ServiceNow Improvements.test.js";
const BUILD_FILE = "./service-now.user.js";
const DEV_FILE = "./service-now.dev.user.js"

const gulp = require("gulp");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const map = require("map-stream");
const streamify = require("gulp-streamify");
const fs = require("fs");
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");

function compile_production() {
    return browserify(DEV_FILE)
        .bundle()
        .pipe(source(BUILD_FILE))
        .pipe(streamify(babel({
            presets: ['@babel/preset-env']
        })))
        .pipe(streamify(uglify()))
        .pipe(streamify(map(function(file, cb) {
            const contents = file.contents.toString();
            fs.readFile("./userscript-header.txt", "utf-8", function(err, header) {
                if (err) {
                    throw err;
                }
                file.contents = Buffer.from(header + contents);
                cb(null, file);
            });
        })))
        .pipe(gulp.dest("."));
};

function compile_development () {
    return browserify(DEV_FILE)
        .bundle()
        .pipe(source(BUILD_FILE))
        .pipe(streamify(map(function (file, cb) {
            const contents = file.contents.toString();
            fs.readFile("./userscript-header.txt", "utf-8", function (err, header) {
                if (err) {
                    throw err;
                }
                file.contents = Buffer.from(header + '"use strict";' + contents);
                cb(null, file);
            });
        })))
        .pipe(gulp.dest("."));
};

function copy(cb) {
    fs.copyFile(BUILD_FILE, USERSCRIPT_FILE, function(err) {
        if (err) {
            throw err;
        }
        cb();
    })
};

const development = gulp.series([compile_development, copy, function() {
    return gulp.watch(["./**/*.js", "!" + BUILD_FILE, "!./node_modules/**/.js", "!./gulpfile.js"]).on("change", function () {
        console.log("Re-compiling files.");
        gulp.series([compile_development, copy])();
    });
}]);

exports.compile = compile_production;
exports.build = gulp.series([compile_production, copy]);
exports.copy = copy;
exports.dev = development;
exports.develop = development;
exports.development = development;
exports.default = development;