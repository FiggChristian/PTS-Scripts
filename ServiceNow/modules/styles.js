const { CSS_PREFIX } = require("./constants.js");
const events = require("./events.js");

module.exports.SMART_TEXT = `
    .${CSS_PREFIX}-smart-text-span {
        padding: .5rem;
        margin: -.5rem;
        z-index: 1;
        position: relative;
        display: inline-block;
        line-height: 1;
        text-align: left;
    }

    .${CSS_PREFIX}-smart-text-span:hover {
        padding: .75rem 1rem;
        margin: -.75rem -1rem;
        z-index: 2;
    }

    .${CSS_PREFIX}-smart-text-span > input:first-child {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        white-space: nowrap;
    }

    .${CSS_PREFIX}-smart-text-span > span:last-child {
        position: relative;
        display: inline-block;
    }

    .${CSS_PREFIX}-smart-text-span > span:last-child > span:first-child {
        text-decoration: underline;
        margin: 0;
        border: 0;
        padding: 0;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
        vertical-align: baseline;
        background: transparent;
        -webkit-user-select: all;
        user-select: all;
    }

    .${CSS_PREFIX}-smart-text-span:hover .${CSS_PREFIX}-smart-text-popup,
    .${CSS_PREFIX}-smart-text-span:focus-within > .${CSS_PREFIX}-smart-text-popup,
    .${CSS_PREFIX}-smart-text-span > input:focus + span:last-child .${CSS_PREFIX}-smart-text-popup {
        display: block;
    }

    .${CSS_PREFIX}-smart-text-popup,
    .${CSS_PREFIX}-smart-text-popup ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .${CSS_PREFIX}-smart-text-popup {
        display: none;
        position: absolute;
        top: initial;
        bottom: calc(100% + .5rem);
        left: 50%;
        background-color: white;
        border-radius: 3px;
        border: 1px solid #cbcbcb;
        font-size: 13px;
        font-weight: initial;
        font-style: initial;
        text-decoration: initial;
        color: initial;
        width: 140px;
        transform: translateX(-50%);
        padding: .25em 0;
        font-family: SourceSansPro, "Helvetica Neue", Helvetica, Arial, sans-serif;
        margin: 0 !important;
        line-height: 1.15;
    }

    .${CSS_PREFIX}-smart-text-popup li {
        list-style: none;
        padding: .1em .25em !important;
        box-sizing: border-box;
        margin: 0;
    }

    .${CSS_PREFIX}-smart-text-popup button,
    .${CSS_PREFIX}-smart-text-popup a {
        text-decoration: underline;
        color: inherit;
        margin: -.1em -.25em;
        border: 0;
        border-radius: 0;
        padding: .1em .25em !important;
        background: transparent;
        min-height: initial;
        min-width: initial;
        line-height: inherit;
        font-size: inherit;
        font-family: inherit;
        vertical-align: baseline;
        cursor: pointer;
        height: 100%;
        width: calc(100% + .5em);
        display: inline-block;
        text-align: left;
        box-sizing: border-box;
    }

    .${CSS_PREFIX}-smart-text-popup button:hover,
    .${CSS_PREFIX}-smart-text-popup button:focus,
    .${CSS_PREFIX}-smart-text-popup a:hover,
    .${CSS_PREFIX}-smart-text-popup a:focus {
        background-color: #e6e9eb;
        text-decoration: underline;
    }

    .${CSS_PREFIX}-smart-text-popup li ul {
        margin: -.25em;
    }

    .${CSS_PREFIX}-smart-text-popup li ul li {
        padding: .1em .25em 0 1.25em !important;
    }

    .${CSS_PREFIX}-smart-text-popup li ul li button,
    .${CSS_PREFIX}-smart-text-popup li ul li a {
        margin: -.1em -.25em 0 -1.25em;
        padding: .1em .25em 0 1.25em !important;
        width: calc(100% + 1.5em);
    }

    .${CSS_PREFIX}-smart-text-popup > li:first-child {
        font-weight: bold;
        text-transform: uppercase;
        font-size: .8em;
        letter-spacing: .25px;
        text-align: center;
    }
`;

module.exports.REPLACEMENTS = `
    .${CSS_PREFIX}-textarea-mirror {
        opacity: 0;
        pointer-events: none;
        position: fixed;
        top: 200vh;
        left: 200vw;
        white-space: pre-wrap;
    }
    
    .${CSS_PREFIX}-auto-filler {
        list-style: none;
        padding: 0 !important;
        margin: 0;
        overflow-y: auto !important;
        position: absolute !important;
        max-height: 150px;
        width: 260px;
        box-sizing: border-box;
        z-index: 3;
    }

    .${CSS_PREFIX}-auto-filler li {
        position: relative;
        padding: 1px 5px 0 10px;
        cursor: pointer;
        display: flex;
    }

    .${CSS_PREFIX}-auto-filler li .sn-card-component_accent-bar {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .${CSS_PREFIX}-auto-filler li .sn-card-component_accent-bar.sn-card-component_accent-bar_dark {
        z-index: 1;
    }

    .${CSS_PREFIX}-auto-filler li:not(:first-child) .sn-card-component_accent-bar:before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        height: 1px;
        width: 260px;
        background-color: inherit;
    }

    .${CSS_PREFIX}-auto-filler li:not(:last-child) .sn-card-component_accent-bar:after {
        content: "";
        position: absolute;
        bottom: -1px;
        left: 0;
        height: 1px;
        width: 260px;
        background-color: inherit;
    }

    .${CSS_PREFIX}-auto-filler li strong {
        display: block;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .${CSS_PREFIX}-auto-filler li small {
        color: #777;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="namespace"] {
        padding: 6px 5px 5px 10px;
    }

    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="namespace"] strong {
        flex-grow: 1;
        margin: 0 5px;
    }

    .${CSS_PREFIX}-auto-filler li i {
        align-self: center;
    }

    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="replacement"] > div:not(.sn-card-component_accent-bar) {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        flex-basis: 0;
        overflow: hidden;
    }

    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="replacement"] .icon-chevron-right {
        display: none;
    }

    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="replacement"][data-${CSS_PREFIX}-hovering="true"] .icon-chevron-right,
    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="replacement"][data-${CSS_PREFIX}-focusing="true"] .icon-chevron-right,
    .${CSS_PREFIX}-auto-filler li[data-${CSS_PREFIX}-autofill-type="replacement"][data-${CSS_PREFIX}-artificial-focusing="true"] .icon-chevron-right {
        display: block;
    }
`;

module.exports.MACROS = `
    #${CSS_PREFIX}-macros_modal .sn-widget-list-item.state-active .sn-widget-list-subtitle {
        color: inherit;
    }

    #${CSS_PREFIX}-macros_modal .sn-widget-list-subtitle {
        white-space: normal;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-preview-header {
        margin-bottom: 1em;
    }

    #${CSS_PREFIX}-macros_modal .sn-widget-list-content.sn-widget-list-content_static {
        padding: 0;
        transform: scale(1.6);
        border-radius: 50%;
    }

    #${CSS_PREFIX}-macros_modal .sn-widget-list-content.sn-widget-list-content_static .icon-preview {
        transform: scale(.625);
        transition: transform .1s ease-in-out;
    }

    #${CSS_PREFIX}-macros_modal .sn-widget-list-content.sn-widget-list-content_static:hover .icon-preview,
    #${CSS_PREFIX}-macros_modal .sn-widget-list-item.state-active .sn-widget-list-content.sn-widget-list-content_static .icon-preview {
        transform: scale(.9);
    }

    #${CSS_PREFIX}-macros_modal .col-sm-4,
    #${CSS_PREFIX}-macros_modal .col-sm-8 {
        transition: width 0.25s ease-in-out;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-preview-field-container:not(:last-of-type) {
        margin-bottom: 1em;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-preview-field-value {
        white-space: break-spaces;
        line-height: 1.4;
        min-height: initial;
        height: initial;
        position: relative;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span {
        display: inline-block;
        position: relative;
        line-height: 1.2;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span > span:nth-child(1) {
        position: absolute;
        height: 100%;
        width: 100%;
        background: currentColor;
        opacity: 0.075;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span > span:nth-child(2) {
        position: absolute;
        height: 100%;
        width: 100%;
        border: 1px solid currentColor;
        border-radius: 3px;
        opacity: 0.4;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span > span:nth-child(3) {
        padding: 1px 3px;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span > span:nth-child(3):before {
        content: "\\200b";
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span.${CSS_PREFIX}-span-empty > span:nth-child(3) {
        font-style: italic;
        opacity: 0.7;
        position: relative;
        left: -1px;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-caret-position-span.${CSS_PREFIX}-span-empty > span:nth-child(3):after {
        content: "Cursor";
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-preview-work_notes-value {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: 0;
        margin-left: 5px;
        width: calc(100% - 5px);
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-preview-work_notes-value:before {
        content: "";
        display: block;
        position: absolute;
        top: -1px;
        left: -5px;
        bottom: -1px;
        width: 5px;
        background-color: rgba(255,215,0,.8); /* gold with 80% opacity */
        transform: scaleX(-1);
        border-radius: inherit;
        border: inherit;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-macro-list-flex {
        display: flex;
        flex-direction: column-reverse;
    }

    #${CSS_PREFIX}-macros_modal .${CSS_PREFIX}-macro-list-flex > div:first-child {
        
    }

    #${CSS_PREFIX}-macro-list .sn-widget-list-item:last-of-type {
        border-bottom: 0 !important;
    }

    #${CSS_PREFIX}-macro-list {
        flex-basis: 0;
        flex-grow: 1;
        overflow: auto;
    }

    #${CSS_PREFIX}-macro-search-container {
        transform: scaleY(-1);
    }

    #${CSS_PREFIX}-macro-search-container input {
        transform: scaleY(-1);
        display: block;
        width: 100%;
    }
`;

module.exports.MARKDOWN = `
    .${CSS_PREFIX}-md-previewer {
        overflow: visible !important;
        height: initial !important;
        border-bottom-right-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
    }
`;

module.exports.CURSOR_FORM_FIELDS = `
    .${CSS_PREFIX}-tab-indicator {
        position: absolute;
        top: 1px;
        right: 1px;
        padding: .2em .4em !important;
        width: initial;
        height: initial !important;
        min-height: initial !important;
        border-top-width: 0;
        border-right-width: 0;
        border-top-left-radius: 0;
        border-bottom-right-radius: 0;
        font-size: 13px !important;
    }

    .${CSS_PREFIX}-tab-indicator button {
        height: 18px;
        width: 18px;
        padding: 0;
        margin-right: .444em;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        font-size: 90%;
    }
`;

module.exports.SUBBAR = `
    textarea[data-${CSS_PREFIX}-has-subbar="true"]:not(:read-only) {
        border-bottom-right-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
    }

    .${CSS_PREFIX}-textarea-subbar {
        display: flex !important;
        border-top-right-radius: 0 !important;
        border-top-left-radius: 0 !important;
        border-top: 0 !important;
        padding: 3px 0 3px 6px !important;
        justify-content: flex-end;
        height: initial !important;
    }

    textarea[data-${CSS_PREFIX}-has-subbar="true"]:read-only + .${CSS_PREFIX}-textarea-subbar {
        display: none !important;
    }

    .${CSS_PREFIX}-textarea-subbar > * {
        margin: 0 !important;
        margin-right: 6px !important;
    }
`;

module.exports.REPLACEMENT_SUBSTYLES = {
    code: ":not(pre)>code{background-color:#F5F5F5;border:1px solid#CCC;color:#4A4A4A;border-radius:.2em;font-size:90%;padding:0 .2em}",
    table: "table{border-collapse:collapse}thead,tbody{vertical-align:top}",
    tr: "thead+tbody tr,tr+tr{border-top:1px solid#AAA}td{padding:.1em .3em}",
    img: "img{max-width:100%}"
};

module.exports.injectStyleSheets = function(
    DO_SMART_TEXT,
    DO_REPLACEMENTS,
    DO_MACROS,
    DO_MARKDOWN
) {
    const style = document.createElement("style");
    let styles = "";
    if (DO_SMART_TEXT) {
        styles += module.exports.SMART_TEXT;
    }
    if (DO_REPLACEMENTS) {
        styles += module.exports.REPLACEMENTS;
    }
    if (DO_MACROS) {
        styles += module.exports.MACROS;
    }
    if (DO_MARKDOWN) {
        styles += module.exports.MARKDOWN;
    }
    if (DO_REPLACEMENTS || DO_MACROS) {
        styles += module.exports.CURSOR_FORM_FIELDS;
    }
    if (DO_MACROS || DO_MARKDOWN) {
        styles += module.exports.SUBBAR;
    }
    style.innerHTML = styles;
    document.head.appendChild(style);

    const stylesheets = [style];

    if (window !== window.top) {
        stylesheets.push(style.cloneNode(true));
        window.top.document.head.appendChild(stylesheets[stylesheets.length - 1]);
    }

    events.trigger("insert_stylesheet", stylesheets);

    if (DO_MACROS) {
        // The macros modal aims to be in the same general look and feel of ServiceNow's
        // #settings_modal modal. In most other cases, we can just add some class names to our
        // elements to have them inherit the same styles as ServiceNow's elements and use Service-
        // Now's normal stylesheets. However, ServiceNow (very annoyingly) included some styles
        // that only get applied to their #settings_modal element by including "#settings_modal" in
        // their stylesheet selectors. This means there's no way for one of our own elements to
        // inherit these stylers unless we also give our element the ID of "settings_modal", which
        // we obviously don't want since there should only be one element with a given ID. To
        // circumvent this and ensure our elements can inherit those styles, we "intercept" Service-
        // Now's stylesheets and create our own copy that uses our element names instead. We do this
        // by going through all the stylesheets in the document and looking for any rules that
        // include "#settings_modal" in the selector text. Then, we copy those styles and replace
        // "#settings_modal" with our own ID. All these modified styles, we add into our own
        // stylesheet, and insert this stylesheet into the document. Now, all our elements inherit
        // the correct styles, and we don't mess up any other elements' styles.
        interceptStyles("#settings_modal", `#${CSS_PREFIX}-macros_modal`);
    }

    if (DO_MARKDOWN) {
        interceptStyles(".btn-default:active", `.${CSS_PREFIX}-md-previewer-btn[data-${CSS_PREFIX}-is-previewing="true"]`);
    }
}

function _checkSheet(oldSelector, newSelector, window, stylesheet) {
    const newRules = [];

    // Iterate through the stylesheet's rules to look for any that mention the oldSelector. Add
    // those styles to newRules and replace oldSelector with newSelector.
    for (const rule of stylesheet.cssRules) {
        if (rule.selectorText && rule.selectorText.includes(oldSelector)) {
            newRules.push(rule.cssText.replaceAll(oldSelector, newSelector));
        }
    }

    // Insert this replacement stylesheet into the DOM.
    if (newRules.length) {
        const innerHTML = newRules.join("\n");
        const style = document.createElement("style");
        style.innerHTML = innerHTML;
        window.document.head.appendChild(style);
    }
}

function _interceptStyles(oldSelector, newSelector, window) {
    const stylesheets = Array.from(window.document.styleSheets);

    for (const stylesheet of stylesheets) {
        // Skip over any stylesheets that don't mention the oldSelector we're looking for.
        if (stylesheet.ownerNode.nodeName == "STYLE" && !stylesheet.ownerNode.innerHTML.includes(oldSelector)) {
            continue;
        }

        _checkSheet(oldSelector, newSelector, window, stylesheet);

        let styleElem = stylesheet.ownerNode;

        // Add a MutationObserver for this stylesheet in case it changes.
        new MutationObserver(function() {
            _checkSheet(oldSelector, newSelector, window, styleElem.sheet);
        }).observe(stylesheet.ownerNode, {
            characterData: styleElem.nodeName == "STYLE",
            childList: styleElem.nodeName == "STYLE",
            attributes: styleElem.nodeName == "LINK",
            attributeFilter: ["href"]
        })
    }

    // Add an observer in case new stylesheets are added later.
    new MutationObserver(function(mutationRecords) {
        for (const record of mutationRecords) {
            for (const node of record.addedNodes) {
                if (node.nodeName == "STYLE") {
                    // <style>s always have a .sheet property right away since their CSS is parsed
                    // synchronously.
                    _checkSheet(oldSelector, newSelector, window, node.sheet);
                } else if (node.nodeName == "LINK" && node.rel.toLowerCase() == "stylesheet") {
                    // <link>s make a request to get a stylesheet from another link, so they are
                    // loaded asynchronously and thus may already have a .sheet, or may not be
                    // loaded yet. We take care of both of these cases here.
                    if (node.sheet) {
                        _checkSheet(oldSelector, newSelector, window, node.sheet);
                    } else {
                        node.addEventListener("load", function() {
                            _checkSheet(oldSelector, newSelector, window, node.sheet);
                        });
                    }
                }
            }
        }
    }).observe(window.document.head, {
        childList: true
    })
}

function interceptStyles(oldSelector, newSelector) {
    // Intercept styles for both the current window and the topmost window if they are different.
    _interceptStyles(oldSelector, newSelector, window);
    if (window !== window.top) {
        _interceptStyles(oldSelector, newSelector, window.top);
    }
}