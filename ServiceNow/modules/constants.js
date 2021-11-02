module.exports.CSS_PREFIX = "pts-injected-script"; // A prefix used by all classes and attributes to target in CSS stylesheets.
module.exports.REPLACEMENT_MAX_RECURSION_DEPTH = 10; // How many times we should expand a replacement inside a replacement inside a replacement...
module.exports.REPLACEMENT_START_DELIMITER = "{{"; // The text to delimit the start of a replacement. Zendesk's default is "{{"
module.exports.REPLACEMENT_END_DELIMITER = "}}"; // The text to delimit the end of a replacement.
module.exports.AUTOFILL_REPLACEMENT = true; // Whether choosing a replacement from the menu will insert the entire replacement (vs. just the name)
module.exports.NETDB_HOST = "netdb.stanford.edu"; // NetDB host name; allowed values: netdb.stanford.edu | netdb-backup.stanford.edu | netdb-dev.stanford.edu | netdb-tng.stanford.edu
module.exports.SUBMIT_DELAY = 200; // The delay between when the user pushes the Post/Save button and when we push the actual button ourself. There should be a delay to allow the textareas to update their values.

// Use ${CURSOR()} in replacement and macro values to set the cursor at that point. Add a string
// to give it a placeholder value (e.g., ${CURSOR("placehold")}).
module.exports.CURSOR_REGEX = /\$\{CURSOR\((?:"((?:[^"]|\\")*)")?\)\}/;
module.exports.CURSOR = function CURSOR(defaultValue) {
    return defaultValue === undefined || defaultValue === null || defaultValue === "" ?
        "${CURSOR()}" :
        '${CURSOR("' + defaultValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '")}';
}