const USERSCRIPT_FILE = "/Users/christianfigueroa/Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/scripts/ServiceNow Improvements.js";
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

function version(cb) {
    const args = process.argv.slice(3);
    if (!args.length) {
        throw new Error("Must use one of --increment, --decrement, --get, or --set.");
    }
    if (args[0] == "--get") {
        version_get().then(
            version => {
                console.log(version);
                cb();
            },
            err => {
                throw err;
            }
        );
    } else if (args[0] == "--set") {
        if (typeof args[1] != "string") {
            throw new Error("--set requires a version number argument.");
        }
        let new_version = args[1].split(".").map(number => +number);
        if (!new_version.every(number => !isNaN(number) && isFinite(number) && number % 1 == 0 && number >= 0)) {
            throw new Error(`Version number "${args[1]}" must be a period-delimited list of numbers.`);
        }

        version_set(args[1]).then(
            _ => {
                cb();
            },
            err => {
                throw err;
            }
        );
    } else if (args[0] == "--increment") {
        let digit;
        if (typeof args[1] == "string") {
            const arg_digit = +args[1];
            if (arg_digit < 1 || arg_digit > 5) {
                digit = 3;
            } else {
                digit = arg_digit;
            }
        } else if (typeof args[1] == "number") {
            if (args[1] < 1 || arg_digit > 5) {
                digit = 3;
            } else {
                digit = args[1];
            }
        } else {
            digit = 3;
        }

        version_get().then(
            version => {
                const version_numbers = version.split(".");
                while (version_numbers.length < digit) {
                    version_numbers.push("0");
                }
                version_numbers[digit - 1] = +version_numbers[digit - 1] + 1;
                version_numbers.length = digit;
                version_set(version_numbers.join(".")).then(
                    _ => {
                        cb();
                    },
                    err => {
                        throw err;
                    }
                );
            },
            err => {
                throw err;
            }
        )
    } else if (args[0] == "--decrement") {
        let digit;
        if (typeof args[1] == "string") {
            const arg_digit = +args[1];
            if (arg_digit < 1 || arg_digit > 5) {
                digit = 3;
            } else {
                digit = arg_digit;
            }
        } else if (typeof args[1] == "number") {
            if (args[1] < 1 || arg_digit > 5) {
                digit = 3;
            } else {
                digit = args[1];
            }
        } else {
            digit = 3;
        }

        version_get().then(
            version => {
                const version_numbers = version.split(".");
                if (version_numbers.length < digit || version_numbers[digit - 1] == 0) {
                    throw new Error(`Version digit at position ${digit} (for ${version}) is already at 0.`);
                }
                version_numbers[digit - 1] = +version_numbers[digit - 1] - 1;
                version_numbers.length = digit;
                version_set(version_numbers.join(".")).then(
                    _ => {
                        cb();
                    },
                    err => {
                        throw err;
                    }
                );
            },
            err => {
                throw err;
            }
        )
    } else {
        console.error (`Invalid argument: ${args[0]}. Must be one of --increment, --decrement, --get, or --set.`);
        return cb();
    }
}

/**
 * Returns the version number specified in package.json.
 * @returns {Promise<string>}
 */
function version_get() {
    return new Promise(function(resolve, reject) {
        fs.readFile("./package.json", "utf-8", function(err, text) {
            if (err) {
                return reject(err);
            }
            try {
                resolve(JSON.parse(text).version);
            } catch (e) {
                return reject(e);
            }
        })
    });
}

/**
 * Sets the version for the package in both package.json and userscript-header.txt.
 * @param {string} version The version number to set.
 * @returns Promise<>
 */
function version_set(version) {
    return Promise.all([
        new Promise(function(resolve, reject) {
            fs.readFile("./userscript-header.txt", "utf-8", function(err, text) {
                if (err) {
                    return reject(err);
                }
                let replacedText;
                try {
                    replacedText = text.replace(
                        /(\n\/\/\s*@version\s+)\S+(\s*\n)/,
                        `$1${version}$2`
                    );
                } catch (e) {
                    return reject(e);
                }

                fs.writeFile("./userscript-header.txt", replacedText, "utf-8", function(err) {
                    if (err) {
                        return reject(err);
                    }
                    console.log(`Set to version ${version}.`);
                    resolve();
                });
            });
        }),
        new Promise(function(resolve, reject) {
            fs.readFile("./package.json", "utf-8", function(err, text) {
                if (err) {
                    return reject(err);
                }
                let replacedText;
                try {
                    const json = JSON.parse(text);
                    json.version = version;
                    replacedText = JSON.stringify(json, null, 2) + "\n";
                } catch (e) {
                    return reject(e);
                }

                fs.writeFile("./package.json", replacedText, "utf-8", function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            })
        })
    ]);
}

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
exports.version = version;
