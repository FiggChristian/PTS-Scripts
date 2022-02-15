const { CSS_PREFIX } = require("./constants.js");
const events = require("./events.js");

const ELEMENT_QUERIES = {};

// Add a callback that gets called when an element that matches the query is added to the DOM.
module.exports.waitForElements = function waitForElements(query, callback) {
    ELEMENT_QUERIES[query] = ELEMENT_QUERIES[query] || [];
    ELEMENT_QUERIES[query].push(callback);
    // Call the function to check if any elements are already in the DOM matching this query.
    onAddElements(query);
}

const { textareaData, addTextareaData, addTextareaCallback } = require("./textareas.js");

function onAddElements(query) {
    const QUERIES = typeof query == "string" ? [query] : Object.keys(ELEMENT_QUERIES);
    // Go through the queries to look for matching elements.
    for (const query of QUERIES) {
        let elementList = document.querySelectorAll(query);
        if (elementList.length) {
            // Call any callbacks associated with this query.
            for (const callback of ELEMENT_QUERIES[query]) {
                callback(elementList);
            }
        }
    }
}

// Any time an element is added or removed from the DOM, call onAddElements to check for query
// matches.
new MutationObserver(onAddElements).observe(document, {
    childList: true,
    subtree: true
});

addTextareaData({
    formFieldIndicator: function(textarea) {
        const indicator = document.createElement("div");
        indicator.innerHTML = `<button class="btn btn-default"><span class="icon icon-connect-close"></span></button>Use <kbd>Tab</kbd> to move to the next field (<span>0/0</span>)`;
        indicator.classList.add(`${CSS_PREFIX}-tab-indicator`, "form-control");
        indicator.style.display = "none";
        textarea.parentNode.appendChild(indicator);
        indicator.firstElementChild.addEventListener("mousedown", function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        indicator.firstElementChild.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.isTabbingFormFields = false;
            this.wasTabbingFormFields = false;
            this.formFieldIndex = 0;
            this.formFieldInnerText = null;
            this.formFieldIndicator.style.display = "none";
        }.bind(this));
        return indicator;
    },
    formFieldIndex: 0,
    formFieldInnerText: null,
    isTabbingFormFields: false,
    wasTabbingFormFields: false,
    suppressInputs: false
});

addTextareaCallback(function(data) {
    this.addEventListener("keydown", function (e) {
        if (e.code == "Tab" && (data.isTabbingFormFields || data.wasTabbingFormFields) && !data.isAutoFillingReplacement) {
            const index = e.shiftKey ? Math.ceil(data.formFieldIndex) - 1 : Math.floor(data.formFieldIndex) + 1;
            let caretIndices = getCaretIndicesOfTabField(data, index);
            // Allow a Tab event to go through as normal if we are no longer focusing on
            // a tabbable field.
            if (caretIndices) {
                e.preventDefault();
                data.formFieldIndex = index;
                data.element.setSelectionRange(...caretIndices);
                data.formFieldIndicator.lastElementChild.innerText = `${index}/${data.formFieldInnerText.length - 1}`;
                events.trigger("focus_form_field", data, index);
            }
        }
    });

    this.parentNode.addEventListener("focusout", function(e) {
        // If we focus an element outside the textarea, we want to stop showing the tab indicator.
        if (e.relatedTarget === null || (e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget))) {
            data.isTabbingFormFields = false;
            data.wasTabbingFormFields = true;
            data.formFieldIndicator.style.display = "none";
        }
    })
});

document.addEventListener("selectionchange", function () {
    const data = textareaData.get(document.activeElement);
    if (data && (data.wasTabbingFormFields || data.isTabbingFormFields)) {
        // Determine which field is currently focused.
        const caretPos = data.element.selectionStart;
        const value = data.element.value;
        const betweenText = data.formFieldInnerText;

        // Try to match the beginning of the text.
        if (!Array.isArray(betweenText) || !value.startsWith(betweenText[0])) {
            data.isTabbingFormFields = false;
            data.wasTabbingFormFields = false;
            data.formFieldInnerText = null;
            data.formFieldIndex = 0;
            data.formFieldIndicator.style.display = "none";
            return;
        }

        // If the caret is before the first field, make the index 0.5 to indicate it is
        // between 0 and 1.
        if (caretPos < betweenText[0].length) {
            data.isTabbingFormFields = false;
            data.wasTabbingFormFields = true;
            data.formFieldIndex = 0.5;
            data.formFieldIndicator.lastElementChild.innerText = `?/${betweenText.length - 1}`;
            data.formFieldIndicator.style.display = "";
            return;
        }

        let lastIndex = betweenText[0].length;
        for (let i = 1; i < betweenText.length; i++) {
            const index = value.indexOf(betweenText[i], lastIndex);
            // If we can't match the text, we should stop allowing tabs since the text
            // in between has changed and we can't match it anymore.
            if (!~index) {
                data.isTabbingFormFields = false;
                data.wasTabbingFormFields = false;
                data.formFieldInnerText = null;
                data.formFieldIndex = 0;
                data.formFieldIndicator.style.display = "none";
                return;
            }
            // If our caret is before the next index of matched text, it means our caret
            // is focusing on this field.
            if (caretPos <= index) {
                data.isTabbingFormFields = true;
                data.wasTabbingFormFields = false;
                data.formFieldIndex = i;
                data.formFieldIndicator.lastElementChild.innerText = `${i}/${betweenText.length - 1}`;
                data.formFieldIndicator.style.display = "";
                return;
            }

            lastIndex = index + betweenText[i].length;
            // If our caret is somewhere in the text between fields, make our index half
            // way in between the two.
            if (caretPos < lastIndex || (caretPos == lastIndex && i == betweenText.length - 1)) {
                data.isTabbingFormFields = false;
                data.wasTabbingFormFields = true;
                data.formFieldIndex = i + 0.5;
                data.formFieldIndicator.lastElementChild.innerText = `?/${betweenText.length - 1}`;
                data.formFieldIndicator.style.display = "";
                return;
            }
        }
    }
});

// Find the indices where the tab field corresponding with the given index starts and end.
function getCaretIndicesOfTabField(data, index) {
    // Make sure we have valid data.
    if (!Array.isArray(data.formFieldInnerText) || index < 1 || index >= data.formFieldInnerText.length) {
        return null;
    }

    // Check if the first entry of formFieldInnerText matches the beginning of the textarea's value.
    const value = data.element.value;
    const betweenText = data.formFieldInnerText;
    if (!value.startsWith(betweenText[0])) {
        return null;
    }

    // Go through the remaining form fields to look for where the tab field with the specified index
    // starts.
    let lastIndex = betweenText[0].length;
    for (let i = 1; i < index; i++) {
        const index = value.indexOf(betweenText[i], lastIndex)
        if (!~index) {
            return null;
        }
        lastIndex = index + betweenText[i].length;
    }

    // nextIndex is where the form field ends (i.e., where the next inner text start).
    const nextIndex = value.indexOf(betweenText[index], lastIndex);
    if (!~nextIndex) {
        return null;
    }

    return [lastIndex, nextIndex];
}

function dedent(string) {
    // Similar to python's textwrap.dedent:
    // https://docs.python.org/3/library/textwrap.html#textwrap.dedent
    let lines = string.split("\n");
    let longestCommonPrefix = null;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].trim().length) {
            lines[i] = "";
            continue;
        }
        let prefix = lines[i].substring(0, lines[i].length - lines[i].trimLeft().length);
        if (longestCommonPrefix == null) {
            longestCommonPrefix = prefix;
            continue;
        }
        if (prefix == longestCommonPrefix) {
            continue;
        }
        let shorter = prefix.length < longestCommonPrefix.length ? prefix : longestCommonPrefix;
        let longer = prefix.length < longestCommonPrefix.length ? longestCommonPrefix : prefix;
        for (let i = 1; i < shorter.length; i++) {
            if (shorter.substring(0, i) != longer.substring(0, i)) {
                longestCommonPrefix = shorter.substring(0, i - 1);
                if (i == 1) {
                    break;
                }
                continue;
            }
        }
        longestCommonPrefix = shorter;
    }
    if (longestCommonPrefix) {
        for (let i = lines.length - 1; i >= 0; i--) {
            lines[i] = lines[i].substring(longestCommonPrefix.length);
        }
    }
    while (lines[lines.length - 1] == "") {
        lines.pop();
    }
    while (lines[0] == "") {
        lines.shift();
    }
    return lines.join("\n");
};

// Turn user text into text that wo't render HTML when added inside .innerHTML.
function escapeHTML(string) {
    return string
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

// Sets the assignment group given the <input> element and the new value. The new value must be a
// valid assignment group, otherwise the entire thing fails and nothing is changed. This uses
// ServiceNow's own code to mimic what's happening under the hood, but that also means it's prone to
// break if ServiceNow updates the way it works.
function setAssignmentGroup(element, value) {
    // Make sure the input has an auto-completer associated with it.
    if (!element.ac || element.ac.element !== element) {
        new AJAXReferenceCompleter(element, element.getAttribute("data-ref"), "", "");
    }

    const ac = element.ac;
    // Sets the maximum number to return from ServiceNow's backend.
    if (!ac.max) {
        ac.max = "15";
    }

    // If this value has been gotten before in the past, it should be stored in the cache.
    let xml = ac.cacheGet(value);
    if (xml) {
        // If it is cached, we can parse the XML right away.
        parseXML(xml);
    } else {
        // Set the input's search characters so it knows what to search on the backend. We set it to
        // the exact value we want to set it to so that only that one value is returned (unless it's
        // a prefix of another value, but that shouldn't mess anything up).
        ac.searchChars = value;
        // The GlideAjax is what performs the HTTP request to get the search results.
        const ga = new GlideAjax(ac.PROCESSOR);
        // Build up the query by adding a bunch of parameters from the auto completer's methods.
        // This is also what is done by ServiceNow.
        const query = ac.addSysParms() +
            ac.addDependentValue() +
            ac.addRefQualValues() +
            ac.addTargetTable() +
            ac.addAdditionalValues() +
            ac.addAttributes("ac_");
        ga.setQueryString(query);
        // Tell the GlideAjax to perform the request and parse the XML when it returns.
        ga.getXML(function(response) {
            if (response.responseXML) {
                // Add the result to the cache for the future.
                ac.cachePut(value, response.responseXML);
                parseXML(response.responseXML);
            }
        }, null, null);
    }

    function parseXML(xml) {
        // Parse the XML's items using ServiceNow's methods.
        const items = ac._processItems(xml).concat(ac._processRecents(xml));
        // Get the names and associated labels from the search results.
        const name2ID = {};
        for (const item of items) {
            name2ID[item.label] = item.name;
        }
        // If the value we want to set it to was not returned by the search results, it means the
        // value is not a valid value and we don't have anything to set it to.
        if (!(value in name2ID)) {
            return;
        }

        // Set the input's value by passing in the ID and name.
        ac.referenceSelect(name2ID[value], value);
        element.blur();
        events.trigger("set_form_field", "assignment_group", value);
    }
}

function setState(element, value) {
    const options = element.children;

    const translatedStates = {
        [Symbol.for("STATE.NEW")]: ["New", "Open"],
        [Symbol.for("STATE.ACTIVE")]: ["Active", "Open"],
        [Symbol.for("STATE.PENDING")]: ["Awaiting User Info", "Hold - Awaiting user information", "Pending"],
        [Symbol.for("STATE.RESOLVED")]: ["Resolved", "Closed Complete"]
    }[value] || [];

    let newValue = null;
    for (const state of translatedStates) {
        for (const option of options) {
            if (option.innerText == state) {
                newValue = option.value;
                break;
            }
        }
        if (newValue) break;
    }

    if (!newValue) {
        return;
    }

    element.value = newValue;
    element.dispatchEvent(new Event("change"));
}

function replaceTextareaValue(data, value, carets) {
    data.element.focus();
    
    // Check if the browser will let us carry out the proper commands.
    const insertHTMLAllowed = document.queryCommandSupported("insertHTML") && document.queryCommandEnabled("insertHTML");
    const insertTextAllowed = document.queryCommandSupported("insertText") && document.queryCommandEnabled("insertText");
    
    // Only make a change in the textarea's value if the new value does not match the old value.
    if (value != data.element.value) {
        // Instead of replacing the entire textarea's value, we just want to replace the subsection
        // that changes. For example, if the textarea already says "this is some text", and we want
        // to write "this is example text", we only need to replace "some" with "example". This
        // makes it easier for undoing and redoing.
        // Calculate where the first difference is.
        let startIndex = null;
        for (let i = 0; i < Math.max(value.length, data.element.value.length); i++) {
            if (value[i] != data.element.value[i]) {
                startIndex = i;
                break;
            }
        }

        // Do the same from the end.
        let endIndex = null;
        for (let i = 0; i < Math.max(value.length, data.element.value.length); i++) {
            if (value[value.length - i - 1] != data.element.value[data.element.value.length - i - 1]) {
                endIndex = i;
                break;
            }
        }

        let hasBeenReplaced = false;
        const replacementValue = value.substring(startIndex, value.length - endIndex);

        data.suppressInputs = true;
        if (insertHTMLAllowed && document.activeElement == data.element) {
            data.element.setSelectionRange(startIndex, data.element.value.length - endIndex);

            // We set the textarea's value using insertHTML to allow for undoing/redoing, and
            // because insertHTML seems to perform much faster than insertText in some browsers.
            hasBeenReplaced = document.execCommand("insertHTML", false, escapeHTML(replacementValue) + (replacementValue[replacementValue.length - 1] == "\n" ? "<br>" : ""));
        } else if (insertTextAllowed && document.activeElement == data.element) {
            data.element.setSelectionRange(startIndex, data.element.value.length - endIndex);

            // Fall back to insertText if insertHTML is not enabled (Firefox).
            hasBeenReplaced = document.execCommand("insertText", false, replacementValue);
        }

        if (!hasBeenReplaced) {
            // Set the value directly if all else fails.
            data.element.value = value;
        }
        data.suppressInputs = false;

        events.trigger("set_textarea_value", data, value);
    }

    // If we have multiple places to insert a caret, turn this into a form with multiple fields to
    // tab to.
    if (carets.length > 1) {
        data.formFieldIndicator.style.display = "";
        data.isTabbingFormFields = true;
        data.formFieldIndex = 1;
        data.formFieldIndicator.lastElementChild.innerText = `${data.formFieldIndex}/${carets.length}`;
        data.formFieldInnerText = new Array(carets.length + 1);
        for (let i = 0, lastIndex = 0; i < carets.length; i++) {
            data.formFieldInnerText[i] = value.substring(lastIndex, carets[i][0]);
            lastIndex = carets[i][1];
        }
        data.formFieldInnerText[carets.length] = value.substring(carets[carets.length - 1][1]);
        events.trigger("init_textarea_form", data, carets);
    }
    data.element.setSelectionRange(...carets[0]);
    events.trigger("set_textarea_cursor", data, carets[0][0], carets[0][1]);
}

// Returns another value instead of -1 when we use .indexOf() (i.e., turns "no index" into something
// else).
function turnNoIndexInto(otherValue, index) {
    return index == -1 ? otherValue : index;
}

module.exports.dedent = dedent;
module.exports.escapeHTML = escapeHTML;
module.exports.replaceTextareaValue = replaceTextareaValue;
module.exports.setAssignmentGroup = setAssignmentGroup;
module.exports.setState = setState;
module.exports.turnNoIndexInto = turnNoIndexInto;