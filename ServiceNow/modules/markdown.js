// Imported by user scripts @require.
// const marked = require("marked");

const { CSS_PREFIX, SUBMIT_DELAY } = require("./constants.js");
const { turnNoIndexInto, escapeHTML, waitForElements, replaceTextareaValue } = require("./helpers.js");
const { addTextareaData, textareaData } = require("./textareas.js");
const { addToSubBar } = require("./textarea_subbar.js");
const { SMART_TEXT: SMART_TEXT_STYLES, REPLACEMENT_SUBSTYLES } = require("./styles.js");
const events = require("./events.js");

marked.use({
    tokenizer: {
        // Disable HTML block-level elements so that they are treated as normal paragraphs instead.
        html: function (html) {
            return null;
        }
    },
    renderer: {
        code: function (code, infostring, escaped) {
            return `[code]<pre><code>[/code]${code.replace(/\n/g, "[code]<br>[/code]")}[code]</code></pre>[/code]`;
        },
        blockquote: function (quote) {
            return `[code]<blockquote>[/code]${quote}[code]</blockquote>[/code]`;
        },
        // HTML is treated as plain text instead of trying to render it, so we don't wrap it in
        // [code] ... [/code] blocks.
        // html: function(html) {},
        heading: function (text, level, raw, slugger) {
            return `[code]<h${level}>[/code]${text}[code]</h${level}>[/code]`;
        },
        hr: function () {
            return `[code]<hr/>[/code]`;
        },
        list: function (body, ordered, start) {
            return `[code]<${ordered ? `ol${start == 1 ? "" : ` start="${start}"`}` : "ul"}>[/code]\n${body}[code]</${ordered ? "o" : "u"}l>[/code]`;
        },
        listitem: function (text, task, checked) {
            return `[code]<li>[/code]${text}[code]</li>[/code]`;
        },
        checkbox: function (checked) {
            return `[code]<input type="checkbox"${checked ? " checked" : ""}>[/code] `;
        },
        paragraph: function (text) {
            return `[code]<p>[/code]${text}[code]</p>[/code]`;
        },
        table: function (header, body) {
            return `[code]<table><thead>[/code]${header}[code]</thead><tbody>[/code]${body}[code]</tbody></table>[/code]`;
        },
        tablerow: function (content) {
            return `[code]<tr>[/code]${content}[code]</tr>[/code]`;
        },
        tablecell: function (content, flags) {
            return `[code]<td${flags.align ? ` style="text-align:${flags.align}"` : ""}>[/code]${content}[code]</td>[/code]`
        },
        strong: function (text) {
            return `[code]<strong>[/code]${text}[code]</strong>[/code]`;
        },
        em: function (text) {
            return `[code]<em>[/code]${text}[code]</em>[/code]`;
        },
        codespan: function (code) {
            return `[code]<code>[/code]${code}[code]</code>[/code]`
        },
        br: function () {
            return "[code]<br/>[/code]";
        },
        del: function (text) {
            return `[code]<span style="text-decoration:line-through"><del>[/code]${text}[code]</del></span>[/code]`
        },
        link: function (href, title, text) {
            return `[code]<a href="${href}"${title ? ` title="${title}"` : ""}>[/code]${text}[code]</a>[/code]`;
        },
        image: function (src, title, text) {
            return `[code]<img style="max-width:100%" src="${src}"${text ? ` alt="${text}"` : ""}${title ? ` title="${title}"` : ""}/>[/code]`
        },
        text: function (text) {
            return text.replace(/\n/g, "[code]<br/>[/code]");
        }
    },
    extensions: [
        // This extension ensures [code][/code] blocks are kept intact. "[code][/code](link)"
        // for example would be parsed as "[code]" followed by a link "[/code](link)", so this
        // extension prevents that from happening so that "[code][/code]" blocks that are passed
        // in will always come out as normal.
        {
            name: "codeBlock",
            level: "inline",
            start: function(src) {
                return turnNoIndexInto(src.length, src.indexOf("[code][/code]"));
            },
            tokenizer: function(src, tokens) {
                if (src.startsWith("[code][/code]")) {
                    return {
                        type: "codeBlock",
                        raw: "[code][/code]",
                        tokens: []
                    };
                } else return false;
            },
            renderer: function(token) {
                if (token.type == "codeBlock") {
                    return token.raw;
                } else return false;
            }
        },
        // This extension makes all stanford.edu links recognized automatically. Normally, only
        // links that begin with http:// or www. (e.g., https://google.com or www.google.com) are
        // recognized while links like google.com or cloud.google.com are not recognized. This
        // ensures that any stanford.edu link, including ones like iprequest.stanford.edu or just
        // stanford.edu are recognized as links even though they are missing the URL scheme at the
        // beginning (we just assume https:// here). It uses the same code (modified a little) that
        // Marked uses for recognizing other URLs.
        // https://github.com/markedjs/marked/blob/e93f800ad610a42897351ed61ab521ab61874a15/src/Tokenizer.js#L702
        {
            name: "autoStanfordLink",
            level: "inline",
            start: function(src) {
                const match = src.match(/(([a-zA-Z0-9\-]+\.?)+\.|)stanford\.edu(\/[^\s<]*|(?!\B))/i);
                return match ? match.index : src.length;
            },
            tokenizer: function(src, tokens) {
                const cap = /^(([a-zA-Z0-9\-]+\.?)+\.|)stanford\.edu(\/[^\s<]*|(?!\B))/i.exec(src)
                if (cap) {
                    let text, href, prevCapZero;
                    do {
                        prevCapZero = cap[0];
                        cap[0] = /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/.exec(cap[0])[0];
                    } while (prevCapZero !== cap[0]);
                    text = escape(cap[0]);
                    href = "https://" + text;
                    return {
                        // We return a "link" instead of "autoStanfordLinks" the way we're supposed
                        // to, so that the token is parsed as a link like normal.
                        type: "link",
                        raw: cap[0],
                        text,
                        href,
                        tokens: [
                            {
                                type: "text",
                                raw: text,
                                text
                            }
                        ]
                    };
                } else return false;
            }
        },
        // This extension makes certain forms be translated as <tables>. As an example, instead of:
        //   key: value
        //   form field: form value
        //   some label: corresponding text
        // we can treat this as a table:
        //   <table>
        //     <tbody>
        //       <tr>
        //         <td>key</td>
        //         <td>value</td>
        //       <tr>
        //       ...
        //     </tbody>
        //   </table>
        // This is particularly helpful for macro forms, like Net Trouble Report. Only forms that
        // have at least three rows will be treated as tables to prevent converting just one or two
        // lines into a table.
        // The values can span multiple lines, e.g.,
        //   form field: a line of text
        //   that spans multiple lines
        // will be one row in the table, and the second cell will span two lines. Since it can span
        // multiple lines, it's hard to differentiate between a multi-line cell and a new row. E.g.,
        //   form field: this is a multi-line string of
        //   text with a colon ":" on the second line
        // That'll be translated as two rows instead of one row with a multi-line cell. To ensure it
        // is treated as the latter, you can add two spaces at the beginning of the line:
        //   form field: this is a multi-line string of
        //     text with a colon ":" that won't be translated as a new row.
        // That'll ensure the second line doesn't get translated as a new row in the table.
        {
            name: "formTable",
            level: "block",
            tokenizer: function(src, tokens) {
                const cap = /^(?!\n)(?:.*?:.*?(?:\n.+)*?)(?:\n(?!  |\t).*?:.*?(?:\n.+)*?){2,}(?=$|\n$|\n\n)/.exec(src);
                if (cap) {
                    const rows = [];
                    let newSrc = src.trimLeft();
                    while (newSrc) {
                        const match = /^(?:.*?:.*?(?:\n.+)*?)(?=\n(?!  |\t).*?:.*?(?:\n.+)*?|\n\n|$)/.exec(newSrc);
                        if (!match) break;
                        const row = match[0];
                        rows.push(row);
                        newSrc = newSrc.substring(row.length).trimLeft();
                    }

                    const used = src.substring(0, src.length - newSrc.length);
                    const rowTokens = [];

                    for (const row of rows) {
                        const colonIndex = row.indexOf(":");
                        let [before, after] = [row.substring(0, colonIndex), row.substring(colonIndex + 1)];
                        before = before.trim();
                        after = after.split("\n").map(line => line.trim()).join("\n");
                        const token = {
                            type: "formTableRow",
                            before: [],
                            after: []
                        };
                        this.lexer.inline(before.trim(), token.before);
                        this.lexer.inline(after.trim(), token.after);
                        rowTokens.push(token);
                    }

                    return {
                        type: "formTable",
                        raw: used,
                        tokens: rowTokens
                    }
                }
                return false;
            },
            renderer: function(token) {
                let html = "[code]<table><tbody>[/code]";
                for (const row of token.tokens) {
                    html += "[code]<tr><td>[/code]" + this.parser.parseInline(row.before) + "[code]</td><td>[/code]" + this.parser.parseInline(row.after) + "[code]</td></tr>[/code]";
                }
                html += "[code]</tbody></table>[/code]";
                return html;
            }
        }
    ]
});

module.exports.init = function() {
    const previewButton = document.createElement("button");
    previewButton.innerText = "Preview";
    previewButton.classList.add(`${CSS_PREFIX}-md-previewer-btn`, "btn", "btn-default");

    addTextareaData({
        isPreviewingMarkdown: false,
        markdownPreviewer: function(textarea) {
            const previewer = document.createElement("div")
            previewer.classList.add(`${CSS_PREFIX}-md-previewer`, "form-control");
            previewer.style.display = "none";
            const shadowRoot = previewer.attachShadow({
                mode: "open"
            });
            shadowRoot.innerHTML = `
                <style>${SMART_TEXT_STYLES}</style>
                <link href="styles/activity_encapsulated.css" rel="stylesheet" type="text/css">
                <style>:host img {max-width: 100%; height: auto; overflow: hidden;}</style>
                <div></div>
            `;

            textarea.parentNode.insertBefore(previewer, textarea.previousElementSibling && textarea.previousElementSibling.classList.contains("sn-stream-input-decorator") ? textarea.previousElementSibling : textarea);
            return previewer;
        },
        decorator: function(textarea) {
            // If the element before this has the class "sn-stream-input-decorator", keep track of
            // it so we can hide it later.
            for (let prevNode = textarea.previousElementSibling; prevNode; prevNode = prevNode.previousElementSibling) {
                if (prevNode.classList.contains("sn-stream-input-decorator")) {
                    return prevNode;
                }
            }
            return null;
        },
        // Makes the character counter underneath textareas show a more accurate character count.
        // The value is parsed as Markdown so that the character count *after* parsing Markdown is
        // shown instead.
        characterCounterFunction: _ => (value => parseMarkdown(value).length),
        markdownPreviewerSubbarIndex: addToSubBar(function(textarea) {
            const clone = previewButton.cloneNode(true);
            clone.addEventListener("click", togglePreviewTextarea.bind(clone, textarea));
            return clone;
        })
    });

    // Replace any Save buttons with a clone of that button. When the user hits that clone, all the
    // textareas's values are replaced with the Markdown escaped version, and then after a small
    // delay (to allow ServiceNow to update that new value), the original Save button is clicked 
    // and the ticket is saved as expected. Replacing the value with the Markdown escaped value
    // allows us to submit as normal, and have ServiceNow read the textarea as having Markdown.
    waitForElements(
        `[id*=sysverb_update]:not([data-${CSS_PREFIX}-save-button-processed]),button.activity-submit:not([data-${CSS_PREFIX}-save-button-processed])`,
        function(buttons) {
            for (const button of buttons) {
                button.setAttribute(`data-${CSS_PREFIX}-save-button-processed`, "true");

                // Clone the button and remove any click event listener attributes to ensure it does
                // not inherit any click listeners from the original button.
                const clone = button.cloneNode(true);
                clone.removeAttribute("onclick");
                clone.removeAttribute("ng-click");
                // Give the clone its own attribute so it does not get processed again.
                clone.setAttribute(`data-${CSS_PREFIX}-save-button-processed`, "true");
                // Give this new clone a different ID
                if (button.id) {
                    clone.id = `${CSS_PREFIX}-clone-of-` + button.id;
                }

                // Insert the clone where the actual button should be.
                button.parentNode.insertBefore(clone, button);
                // Hide the actual button so that the clone looks like it has replaced it
                // completely.
                button.style.opacity = 0;
                button.style.position = "absolute";
                button.style.pointerEvents = "none";
                button.tabIndex = -1;

                // When we click the cloned button, replace textarea values with Markdown escaped
                // text, and then click the original button.
                clone.addEventListener("click", function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    events.trigger("save_or_post");

                    // replaceTextareaValues will replace the textareas' values with Markdown (as
                    // its name implies), and then return true if any textareas actually changed,
                    // and false otherwise.
                    if (replaceTextareaValues()) {
                        // Wait a small delay to allow ServiceNow to update, and then submit.
                        setTimeout(function () {
                            button.click();
                        }, SUBMIT_DELAY);
                    } else {
                        // If replaceTextareaValues returned false, we don't need to wait the normal
                        // delay because no textareas' values actually changed.
                        button.click();
                    }
                });
            }
        }
    );
}

function togglePreviewTextarea(textarea, e) {
    const data = textareaData.get(textarea);
    if (!data) return;

    // If e is a bool, we want to treat it as whether the previewer should be on or not.
    if (typeof e == "boolean") {
        data.isPreviewingMarkdown = e;
    } else {
        // Otherwise, it is an event.
        e.preventDefault();
        e.stopPropagation();
        data.isPreviewingMarkdown = !data.isPreviewingMarkdown;
    }

    data.markdownPreviewer.setAttribute(`data-${CSS_PREFIX}-is-previewing`, data.isPreviewingMarkdown);
    data.subbarElements[data.markdownPreviewerSubbarIndex].setAttribute(`data-${CSS_PREFIX}-is-previewing`, data.isPreviewingMarkdown);
    if (data.isPreviewingMarkdown) {
        // Parse the textarea's value.
        let parsed = parseMarkdown(textarea.value);

        // The returned string will have [code] blocks that we need to remove and evaluate.
        // Everything inside the code blocks will be left as-is, but everything outside will be
        // escaped. We don't have to worry about nested [code] blocks because parseMarkdown
        // gets rid of those for us already.
        let translated = "";
        let index;
        while (~(index = parsed.indexOf("[code]"))) {
            let closer = turnNoIndexInto(parsed.length, parsed.indexOf("[/code]"));
            translated += escapeHTML(parsed.substring(0, index));
            translated += parsed.substring(index + "[code]".length, closer);
            parsed = parsed.substring(closer + "[/code]".length);
        }
        // Add the rest of the string that's left over to the translated value.
        translated += escapeHTML(parsed);

        // Insert the parsed markdown into the previewer's shadow root.
        data.markdownPreviewer.shadowRoot.lastElementChild.innerHTML = translated;

        // Update the previewer's styles to match the textarea's as closely as possible.
        data.markdownPreviewer.style.paddingLeft = data.elementStyles.paddingLeft;
        data.markdownPreviewer.style.paddingRight = data.elementStyles.paddingRight;
        data.markdownPreviewer.style.paddingTop = data.elementStyles.paddingTop;
        data.markdownPreviewer.style.paddingBottom = data.elementStyles.paddingBottom;

        // Hide the textarea and show the previewer.
        data.markdownPreviewer.style.display = "block";
        textarea.style.display = "none";

        if (data.decorator) {
            data.decorator.style.display = "none";
        }

        events.trigger("show_preview", data);
    } else {
        // Hide the previewer and show the textarea.
        data.markdownPreviewer.style.display = "none";
        textarea.style.display = "";

        if (data.decorator) {
            data.decorator.style.display = "";
        }

        events.trigger("hide_preview", data);
    }
}

function replaceTextareaValues() {
    const textareas = [
        document.getElementById("activity-stream-work_notes-textarea"),
        document.getElementById("activity-stream-comments-textarea"),
        document.getElementById("activity-stream-textarea"),
        document.getElementById("sc_task.parent.comments")
    ];

    let anyChanged;
    for (const textarea of textareas) {
        const data = textareaData.get(textarea)

        if (!textarea || !data) {
            continue;
        }

        if (data.isPreviewingMarkdown) {
            togglePreviewTextarea(textarea, false);
        }

        const parsed = parseMarkdown(textarea.value);

        if (parsed != textarea.value) {
            anyChanged = true;
            replaceTextareaValue(textareaData.get(textarea), parsed, [[parsed.length, parsed.length]]);
        }
    }
    return anyChanged;
}

function parseMarkdown(text) {
    // First, we go through the text looking for [code] ... [/code] delimiters. Delimiters that are
    // empty or only have spaces in between them are unwrapped and replaced with its inner contents
    // since there is no code inside them that matters, and it will allow the markdown parser to
    // read them as spaces instead of "[code][/code]" text. Any [code] blocks that were not removed
    // because they have non-space content inside them are completely emptied out to leave only
    // "[code][/code]". When Marked parses the text, that will allow it to ignore all the text
    // inside the [code] blocks and treat it as a regular span of text. Once it has been parsed, we
    // go back through and replace each "[code][/code]" marker with all the text was originally
    // inside them so that the text inside remains unparsed.

    // To allow for <!-- HTML comments --> inside the text, we go through and remove any right away
    // so that it doesn't get parsed by Marked.
    text = text.replace(/<!--[\s\S]*-->/g, "");

    // If the entire text is just "[code][/code]", we return as normal instead of returning "".
    if (text == "[code][/code]") return text;

    // filteredText is the text once all the [code] blocks have been filtered out.
    let filteredText = "";
    // Keeps track of the text we find inside [code] blocks so we can insert it back into the
    // text at the end.
    let codeBlocks = [];

    let startIndex;
    while (~(startIndex = text.indexOf("[code]"))) {
        // Add all the text up to the "[code]".
        filteredText += text.substring(0, startIndex);
        // Remove the text up to and including the "[code]".
        text = text.substring(startIndex + 6);
        // Keep track of the text inside the current code block.
        let codeBlock = "";

        // Keep track of how many nested "[code] ... [/code]" blocks we find. Start at 1 since we
        // just found the first "[code]".
        let codeInstances = 1;
        // Keep going until we get to 0 codeInstances to indicate we found a matching closing
        // "[/code]".
        while (codeInstances) {
            // Get the indices for the next "[code]" and "[/code]".
            let startIndex = text.indexOf("[code]");
            let endIndex = text.indexOf("[/code]");

            // If there is no "[/code]" block, it means we've reached the end of the string without
            // being able to close it. Add on an extra "[/code]" to the end so we can parse it on
            // the next iteration.
            if (!~endIndex) {
                text += "[/code]";
                continue;
            }

            if (~startIndex && startIndex < endIndex) {
                // If there is a "[code]" that comes before a "[/code]", it means we found a nested
                // "[code]", and will need to find an extra "[/code]". Nested [code]s are ignored by
                // ServiceNow, so we can just remove the "[code]" and "[/code]" altogether.
                // Add the text up to the "[code]" to the code block's text.
                codeBlock += text.substring(0, startIndex);
                // Remove the text up to and including the "[code]" so we can parse inside of it.
                text = text.substring(startIndex + 6);
                // Increment codeInstances we know to look for an extra "[/code]" block.
                codeInstances++;
            } else {
                // If we found a closing "[/code]", we add all the text up to the "[/code]" to the
                // code block.
                codeBlock += text.substring(0, endIndex);
                // Remove the "[/code]" from the text so we can parse after it now.
                text = text.substring(endIndex + 7);
                // Decrement codeInstances so we know how many more "[/code]" blocks to look for.
                codeInstances--;
            }
        }

        // Now we've parsed all the text inside a "[code][/code]" block and removed any nested
        // "[code][/code]" blocks that may have been inside. If the content of the code block is
        // just spaces, or nothing, we don't need to add this [code] block to the filteredText so
        // that Marked will just treat it as space instead of text.
        if (codeBlock.replace(/ +/, "") == "") {
            // Just add the spaces directly.
            filteredText += codeBlock;
        } else {
            // Otherwise, we will add a "[code][/code]" to serve as a marker for when we need to go
            // back and insert the text again.
            filteredText += "[code][/code]";
            codeBlocks.push(codeBlock.replace(/\n/g, "<br/>"));
        }
    }
    // Now we need to add any remaining text to filteredText.
    filteredText += text;

    // We also want to escape any ampersands so that HTML entities are rendered as-is.
    filteredText = filteredText.replace(/&/g, "&amp;");

    // Pass the filteredText to the markdown parser.
    filteredText = marked(
        filteredText,
        {
            mangle: false,
            headerIds: false,
            smartLists: true
        }
    );

    // Get rid of any HTML entities that were produced by Marked.
    filteredText = filteredText.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

    // Now we go back through and replace instances of "[code][/code]" with the corresponding code
    // block.
    let codeIndex;
    while (~(codeIndex = filteredText.lastIndexOf("[code][/code]"))) {
        filteredText = filteredText.substring(0, codeIndex + 6) + codeBlocks.pop() + filteredText.substring(codeIndex + 6);
    }

    // Sometimes, newlines ("\n") seem to slip in sometimes, even though new lines in text are
    // *supposed* to be converted to <br>s. We just replace any lingering newlines into "" to get
    // rid of these.
    filteredText = filteredText.replaceAll("\n", "");

    // Now, to shorten the text a bit, get rid of any "[/code][code]" substrings (i.e., the end
    // of a [code] block followed immediately by the start of a code block) so that we can just
    // collapse adjacent [code] blocks.
    filteredText = filteredText.replaceAll("[/code][code]", "");

    // At this point, we're basically done. ServiceNow likes to limit some textareas to 4000
    // characters though, which is a problem because expanding something like "https://example.com"
    // to Markdown becomes "[code]<a href='https://example.com'>https://example.com</a>[/code]",
    // which is significantly longer. To make the expanded text as short as possible, we look for 
    // any redundancies that we can remove.
    
    // Basically, we want to see where we can add "[code]" and "[/code]" to create the shortest
    // strings possible. If we want to make a "<p>paragraph</p>" for example, we could write it as
    // "[code]<p>[/code]paragraph[code]</p>[/code]", but an even shorter way to write it would be
    // "[code]<p>paragraph</p>[/code]". But then, what if we wanted to write
    // "<p>&ltp&gt;paragraph&lt;/p&gt;</p>" (i.e., show the literal text "<p>paragraph</p>" from
    // within a <p> element), there are two options:
    // 1. [code]<p>&lt;p&gt;paragraph&lt;/p&gt;</p>[/code] (change the inner HTML so it is not interpreted as HTML)
    // 2. [code]<p>[/code]<p>paragraph</p>[code]</p>[/code] (leave a [code] block so the inner HTML is interpreted as plain text)
    // In this case, 1. is shorter, so we need to figure out where it's most beneficial to add
    // "[code]" and "[/code]" blocks.

    // To do that, we use a dynamic programming approach in which we parse the text into three
    // tokens: plain, code, and escaped. Code tokens are any characters inside [code] blocks that
    // *must* be wrapped inside [code] blocks in the output. Escaped characters are HTML characters
    // ("<", ">", and "&"). These characters can be present inside or outside [code] blocks. If
    // outside, we can leave them as-is (i.e., "<", ">", "&"). If inside though, we have to escape
    // them into "&lt;", "&gt;" and "&amp;" to prevent them from being rendered as actual HTML.
    // Plain tokens are any other characters that can be present inside a code block or outside and
    // we don't have to escape them (e.g., plain letter and numbers).

    // Once we've parsed the text into these tokens, we iterate backwards through these tokens and
    // keep track of two arrays of penalty values. Both start at 0 and represent the penalty up to
    // that point if we are inside a [code] block, or outside a code block. When we run into a
    // "code" token, we know our only choice is to be inside a [code] block, so the penalty for NOT
    // being inside a [code] block will be Infinity. When we run into an "escaped" token, the
    // penalty for being inside the code block will be the extra characters it takes to escape the
    // character (e.g., the penalty for "<" is "&lt;".length - "<".length = 3). The penalty for
    // being outside a code block is 0 since we don't have to add any characters, we can just keep
    // the "<" exactly as-is. For "plain" tokens, the penalty for both is 0 because we don't have to
    // add any characters to escape these tokens. When we want to switch from the outside-[code]-
    // block penalty array to the inside-[code]-block array, we accumulate a penalty of
    // "[code]".length because that's how many characters it would take to switch to inside a [code]
    // block. When we want to switch from inside a code block to outside, we accumulate a penalty of
    // "[/code]".length. Here's an example:
    // The input "[code]<p>[/code]<span>text</span>[code]</p>[/code]" represents a paragraph <p>
    // element with the text "<span>text & more text</span>" inside it as plain text. This would be parsed as:
    //   {type: "code", value: "<p>"},
    //   {type: "escaped", value: "<"},
    //   {type: "plain", value: "span"},
    //   {type: "escaped", value: ">"},
    //   {type: "plain", value: "text "},
    //   {type: "escapes", value: "&"},
    //   {type: "plain", value: " more text"},
    //   {type: "escaped", value: "<"},
    //   {type: "plain", value: "/span"},
    //   {type: "escaped", value: ">"},
    //   {type: "code", value: "</p>"}
    // We will start two penalty arrays:
    //   inside-[code]: []
    //   outside-[code]: []
    // Since we have to end outside of a code block, we have to add a penalty to start with:
    //   inside-[code]: ["[/code]".length] = [7]
    //   outside-[code]: [0]               = [0]
    // That keeps track of the final penalty so that we always end outside of a [code] block.
    // Now we loop backwards and start with the "</p>" code token. Since it is inside a [code] block
    // we have to put a penalty of Infinity for the outside-[code] penalty array (and add a penalty
    // of 0 for inside-[code] since we don't need to add any characters):
    //   inside-[code]: [0+7, 7]       = [       7, 7]
    //   outside-[code]: [Infinity, 0] = [Infinity, 0]
    // Now for the escaped ">", we can stay within the [code] block at a penalty of "&lt;".length -
    // ">".length = 4 - 1 = 3. We can also leave the [code] block, at a cost of "[code]".length = 6:
    //   inside-[code]: [3+7, 7, 7]         = [10,        7, 7]
    //   outside-[code]: [6+7, Infinity, 0] = [13, Infinity, 0]
    // A plain "/span" token has a penalty of 0 for both:
    //   inside-[code]: [0+10, 10, 7, 7]        = [10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, Infinity, 0] = [13, 13, Infinity, 0]
    // Another escaped "<" token that has an inside-[code] penalty of 3 and outside-[code] penalty
    // of 0:
    //   inside-[code]: [3+10, 10, 10, 7, 7]         = [13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, Infinity, 0] = [13, 13, 13, Infinity, 0]
    // Another plain token doesn't do much (0 penalty):
    //   inside-[code]: [0+13, 13, 10, 10, 7, 7]         = [13, 13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, 13, Infinity, 0] = [13, 13, 13, 13, Infinity, 0]
    // An escaped "&" token has an inside-[code] penalty of "&amp;".length - "&".length = 4.
    //   inside-[code]: [4+13, 13, 13, 10, 10, 7, 7]         = [17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, 13, 13, Infinity, 0] = [13, 13, 13, 13, 13, Infinity, 0]
    // Plain token adds 0 to both:
    //   inside-[code]: [0+17, 17, 13, 13, 10, 10, 7, 7]         = [17, 17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, 13, 13, 13, Infinity, 0] = [13, 13, 13, 13, 13, 13, Infinity, 0]
    // Another escape ">" token with an inside-[code] penalty of 3:
    //   inside-[code]: [3+17, 17, 17, 13, 13, 10, 10, 7, 7]         = [20, 17, 17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, 13, 13, 13, 13, Infinity, 0] = [13, 13, 13, 13, 13, 13, 13, Infinity, 0]
    // Another plain token:
    //   inside-[code]: [0+20, 20, 17, 17, 13, 13, 10, 10, 7, 7]         = [20, 20, 17, 17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0] = [13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0]
    // This time, something new happens. We encounter an escaped "<" token, which has an
    // inside-[code] penalty of 3, which would bring the penalty up to 3 + 20 = 23. The alternative
    // option is to jump from outside-[code] to inside-[code] at a penalty of "[/code]".length plus
    // whatever the outside-[code] penalty is, which is 13 at this point. "[/code]".length + 13 =
    // 20, which is lower than 23, so we can use that instead:
    //   inside-[code]: ["[/code]".length + 13, 20, 20, 17, 17, 13, 13, 10, 10, 7, 7] = [20, 20, 17, 17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [0+13, 13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0]         = [13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0]
    // Last token, we have a code token, which has a penalty of Infinity for outside-[code]:
    //   inside-[code]: [20, 20, 20, 20, 17, 17, 13, 13, 10, 10, 7, 7]               = [      20, 20, 20, 17, 17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [Infinity, 13, 13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0] = [Infinity, 13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0]
    // To finish, we need to end outside a [code] block, which we can do by adding an infinite
    // penalty to the inside-[code] array and 0 to the inside-[code] array. Since 0 + Infinity is a 
    // higher penalty than switching from inside-[code] to outside-[code], we instead add
    // "[code]".length + whatever the penalty is for inside-[code] (6 + 26 = 26).
    //   inside-[code]:  [Infinity,       20, 20, 20, 20, 17, 17, 13, 13, 10, 10,        7, 7]
    //   outside-[code]: [      26, Infinity, 13, 13, 13, 13, 13, 13, 13, 13, 13, Infinity, 0]
    // Now we go forwards through these arrays, starting outside of a code block. The first one, we
    // switched from inside-[code] to outside-[code]. Since we're going forwards instead of
    // backwards, this corresponds to adding a "[code]" to enter inside a [code] block:
    //   output: "[code]"
    // At the next step, we stay inside the [code] block so we just add the associated value:
    //   output: "[code]<p>"
    // Next step was where we switched from outside-[code] to inside-[code], which corresponds to
    // adding "[/code]" (since we're going backwards):
    //   output: "[code]<p>[/code]"
    // Now, we're outside a [code] block and we don't switch for a while:
    //   output: "[code]<p>[/code]<"
    //   output: "[code]<p>[/code]<span"
    //   output: "[code]<p>[/code]<span>"
    //   output: "[code]<p>[/code]<span>text "
    //   output: "[code]<p>[/code]<span>text &"
    //   output: "[code]<p>[/code]<span>text & more text"
    //   output: "[code]<p>[/code]<span>text & more text<"
    //   output: "[code]<p>[/code]<span>text & more text</span"
    //   output: "[code]<p>[/code]<span>text & more text</span>"
    // Now, this is farther back in the penalty arrays, this is where we switched from inside-[code]
    // to outside-[code] (when we added the 6+7), so we add a "[code]" and switch back into the
    // inside-[code] penalty array:
    //   output: "[code]<p>[/code]<span>text & more text</span>[code]"
    // Now we add the code value:
    //   output: "[code]<p>[/code]<span>text & more text</span>[code]</p>"
    // The last one was where we added the 7 to end of the array to indicate that we should switch
    // back out to ensure we end outside of a [code] block:
    //   output: "[code]<p>[/code]<span>text & more text</span>[code]</p>[/code]"
    // In this case, we ended up with exactly the same as the input, but if we had gone with another
    // example, like "[code]<p>[/code]<span>text</span>[code]</p>[/code]", the output would have
    // been "[code]<p>&lt;span&gt;text&lt;/span&gt;</p>[/code]" because the cheapest penalty would
    // have been to *never* switch out of the inside-[code] block array until the end, so the entire
    // text would have been inside a [code] block. The alternate, longer one would have been
    // "[code]<p>[/code]<span>text</span>[code]</p>[/code]", which has a length of 50 compared to 49
    // with the actual optimal solution.

    // textTokens keeps track of the tokens we are going to parse from the text. It starts with a
    // custom start token that has an infinite penalty for inside-[code] to ensure we start outside
    // of a [code] block.
    const textTokens = [{
        type: "start",
        insideCodeValue: null,
        outsideCodeValue: "",
        insideCodePenalty: Infinity,
        outsideCodePenalty: 0
    }];
    // Parse out any [code] blocks from the text into "code" tokens. We have not parsed out
    // "escaped" tokens just yet.
    let parsedFilteredText = filteredText;
    codeIndex = 0;
    while (~(codeIndex = parsedFilteredText.indexOf("[code]"))) {
        if (codeIndex != 0) {
            textTokens.push({
                type: "plain",
                insideCodeValue: parsedFilteredText.substring(0, codeIndex),
                outsideCodeValue: parsedFilteredText.substring(0, codeIndex),
                insideCodePenalty: 0,
                outsideCodePenalty: 0
            });
        }
        parsedFilteredText = parsedFilteredText.substring(codeIndex + 6);
        codeIndex = parsedFilteredText.indexOf("[/code]");
        if (!~codeIndex) {
            codeIndex = parsedFilteredText.length;
        }
        textTokens.push({
            type: "code",
            insideCodeValue: parsedFilteredText.substring(0, codeIndex),
            outsideCodeValue: null,
            insideCodePenalty: 0,
            outsideCodePenalty: Infinity
        });
        parsedFilteredText = parsedFilteredText.substring(codeIndex + 7);
    }
    if (parsedFilteredText.length) {
        textTokens.push({
            type: "plain",
            insideCodeValue: parsedFilteredText,
            outsideCodeValue: parsedFilteredText,
            insideCodePenalty: 0,
            outsideCodePenalty: 0
        });
    }

    let firstCode = null;

    // Go through the tokens and look for any code blocks. If we find one, we want to search for any
    // elements that need to be styled. This is not directly related to the algorithm described
    // above. This is purely for adding additional styles into the text to ensure <code> elements
    // and the like are rendered with the proper styles.
    const stylesToIgnore = new Set(Object.keys(REPLACEMENT_SUBSTYLES));
    for (const token of textTokens) {
        // Only search inside code blocks.
        if (token.type == "code") {
            firstCode = firstCode || token;
            // Do a naive search for HTML elements. Instead of actually parsing the code block as
            // HTML, we just search for opening HTML tags like "<div>" (but without the closing ">"
            // since it could also be "<div attr="val">"). This can result in some false positives,
            // for example if the text contains just "not actually a <div element", which would be
            // rendered as plain text without any actual <div> elements. The likelihood of this is
            // very low unless they intentionally add something like that, and even then, a false
            // positive just adds a small amount of characters to the overall text, so it doesn't
            // matter that much.
            const value = token.insideCodeValue.toLowerCase();
            for (const elemName of stylesToIgnore) {
                if (value.includes("<" + elemName.toLowerCase())) {
                    // Remove this element name from the list of styles to ignore.
                    stylesToIgnore.delete(elemName);
                }
            }
            if (stylesToIgnore.size == 0) break;
        }
    }

    // Add the appropriate styles to stylesheetText.
    let stylesheetText = "";
    for (const elemName in REPLACEMENT_SUBSTYLES) {
        if (stylesToIgnore.has(elemName)) continue;
        stylesheetText += REPLACEMENT_SUBSTYLES[elemName];
    }

    // Insert the stylesheet inside the first [code] block. If there are no [code] blocks, it's okay
    // because in that case we don't have any elements to style in the first place and
    // stylesheetText will be empty.
    if (stylesheetText) {
        firstCode.insideCodeValue = `<style>${stylesheetText}</style>${firstCode.insideCodeValue}`;
    }

    // Back to the algorithm: look through our current plain tokens and parse out any HTML
    // characters that need to be escaped ("<", ">", and "&") and insert these back in as "escaped"
    // tokens.
    for (let i = 0; i < textTokens.length - 1; i++) {
        if (textTokens[i].type == "plain") {
            let firstIndex = Math.min(
                turnNoIndexInto(Infinity, textTokens[i].outsideCodeValue.indexOf("<")),
                turnNoIndexInto(Infinity, textTokens[i].outsideCodeValue.indexOf(">")),
                turnNoIndexInto(Infinity, textTokens[i].outsideCodeValue.indexOf("&"))
            );

            if (!isFinite(firstIndex)) {
                continue;
            }

            const trailingText = textTokens[i].outsideCodeValue.substring(firstIndex);
            textTokens[i].outsideCodeValue = textTokens[i].outsideCodeValue.substring(0, firstIndex);
            textTokens[i].insideCodeValue = textTokens[i].outsideCodeValue.substring(0, firstIndex);
            const translated = ({
                ">": "&gt;",
                "<": "&lt;",
                "&": "&amp;"
            })[trailingText[0]];
            textTokens.splice(i + 1, 0, {
                type: "escaped",
                insideCodeValue: translated,
                outsideCodeValue: trailingText[0],
                insideCodePenalty: translated.length - 1,
                outsideCodePenalty: 0
            }, {
                type: "plain",
                insideCodeValue: trailingText.substring(1),
                outsideCodeValue: trailingText.substring(1),
                insideCodePenalty: 0,
                outsideCodePenalty: 0
            });
            i++;
        }
    }

    // start the inside-[code] and outside-[code] penalty arrays.
    const insideCodePenalties = new Array(textTokens.length + 1);
    const outsideCodePenalties = new Array(textTokens.length + 1);
    // Each entry in the penalty array will be a 2-long array where the first item is the numerical
    // penalty up to that point, and the second is a boolean indicating whether we are switching
    // into the other array at that point. Here, we add Infinity to inside-[code] to ensure we end
    // outside of a [code] block. The second item (the boolean) doesn't apply here since it's the end
    // of the array, so we just have null.
    insideCodePenalties[textTokens.length] = [Infinity, null];
    outsideCodePenalties[textTokens.length] = [0, null];
    // Now fill out the array backwards to forwards with the appropriate penalty values and keep
    // track of when we switch between arrays.
    for (let i = textTokens.length - 1; i >= 0; i--) {
        const insideStayPenalty = insideCodePenalties[i + 1][0] + textTokens[i].insideCodePenalty + 0;
        const insideTransitionPenalty = outsideCodePenalties[i + 1][0] + textTokens[i].insideCodePenalty + "[/code]".length;
        const outsideStayPenalty = outsideCodePenalties[i + 1][0] + textTokens[i].outsideCodePenalty + 0;
        const outsideTransitionPenalty = insideCodePenalties[i + 1][0] + textTokens[i].outsideCodePenalty + "[code]".length;

        // The "<=" instead of "<" for the inside-[code] penalty array ensures we stay *outside* of
        // a [code] block when the penalties are the same since there's no extra penalty gain, and
        // it means less text we have to parse into HTML later.
        insideCodePenalties[i] = [Math.min(insideTransitionPenalty, insideStayPenalty), insideTransitionPenalty <= insideStayPenalty];
        outsideCodePenalties[i] = [Math.min(outsideTransitionPenalty, outsideStayPenalty), outsideTransitionPenalty < outsideStayPenalty];
    }

    // Now we've built out both penalty arrays and all that's left is to go forwards through them
    // and build ut the shortened string.
    let shortenedText = "";
    // Start outside of a code block by setting to false to being with.
    let isInsideCodeBlock = false;
    for (let i = 0; i < textTokens.length; i++) {
        // Add the appropriate token value depending on whether we are currently inside or outside
        // a [code] block (i.e., a "<" will be added as "<" outside a [code] block and as "&lt;"
        // inside a [code] block).
        shortenedText += isInsideCodeBlock ? textTokens[i].insideCodeValue : textTokens[i].outsideCodeValue;
        // Whether we want to switch out to the other array.
        const doSwitch = (isInsideCodeBlock ? insideCodePenalties[i] : outsideCodePenalties[i])[1];
        if (doSwitch) {
            isInsideCodeBlock = !isInsideCodeBlock;
            // Add [code] or [/code] depending on whether we are switching in or out of a [code]
            // block.
            shortenedText += isInsideCodeBlock ? "[code]" : "[/code]";
        }
    }

    // We're done!
    return shortenedText;
}

module.exports.parseMarkdown = parseMarkdown;
window.parseMarkdown = parseMarkdown;