const { CSS_PREFIX } = require("./constants.js");
const { waitForElements } = require("./helpers.js");

const textareaData = new Map();

let dataPrototype = {
    element: textarea => textarea, // Each data has a .element that points back to the <textarea>
    elementStyles: textarea => getComputedStyle(textarea) // Also get the styles for the element
};
const textareaCallbacks = [];

// Wait for any new <textarea>s that get added to the DOM and parse them.
waitForElements(`textarea:not([data-${CSS_PREFIX}-textarea-processed])`, function(textareas) {
    for (const textarea of textareas) {
        textarea.setAttribute(`data-${CSS_PREFIX}-textarea-processed`, "true");
        // Use dataPrototype to make a new data object for this textarea.
        const data = Object.clone(dataPrototype);

        // Replace any functions in the prototype with their returned values to allow the function
        // to make a new object for each textarea.
        for (const key in data) {
            if (typeof data[key] == "function") {
                data[key] = data[key].call(data, textarea, key);
            }
        }

        // Add the data to textareaData.
        textareaData.set(textarea, data);

        // Call any callbacks registered.
        for (const callback of textareaCallbacks) {
            callback.call(textarea, data);
        }
    }
});

module.exports.addTextareaData = function addTextareaData(object) {
    // Update any textareas that have already been added to the DOM.
    for (const [textarea, data] of textareaData) {
        for (const key in object) {
            if (typeof object[key] == "function") {
                data[key] = object[key].call(data, textarea, key);
            } else {
                data[key] = object[key];
            }
        }
    }

    // Update dataPrototype so that any future textareas get this data too.
    dataPrototype = {...dataPrototype, ...object};
}

module.exports.addTextareaCallback = function addTextareaCallback(callback) {
    // Call the callback on any textareas that have already been added to the DOM.
    for (const[textarea, data] of textareaData) {
        callback.call(textarea, data);
    }
    
    // Add the callback to the list for future textareas.
    textareaCallbacks.push(callback);
};

module.exports.textareaData = textareaData;