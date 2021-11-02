if (location.hostname == "mydevices.stanford.edu") {
    require("./modules/my_devices.js")();
} else {
    const DO_SMART_TEXT = true;
    const DO_MARKDOWN = true;
    const DO_REPLACEMENTS = true;
    const DO_MACROS = true;

    require("./modules/styles.js").injectStyleSheets(
        DO_SMART_TEXT,
        DO_REPLACEMENTS,
        DO_MACROS,
        DO_MARKDOWN
    );

    if (DO_SMART_TEXT) {
        require("./modules/smart_text.js").init();
    }

    if (DO_REPLACEMENTS) {
        require("./modules/replacements.js").init();
    }

    if (DO_MACROS) {
        require("./modules/macros.js").init();
    }

    if (DO_MARKDOWN) {
        require("./modules/markdown.js").init();
    }
}