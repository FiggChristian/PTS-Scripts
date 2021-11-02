const { CSS_PREFIX } = require("./constants.js");
const { textareaData, addTextareaData } = require("./textareas.js");

const subbarAdditionCallbacks = [];

addTextareaData({
    subbar: function(textarea) {
        const data = this;

        function observerCallback(_, observer) {
            // Check if this textarea has a character counter after it. If it does, we need to
            // change it. ServiceNow (most likely) waits for the textarea to update, and then uses
            // .nextElementSibling to retrieve the character counter, and then updates it. We want
            // to insert an element right after the textarea, and before the character counter
            // though, so in order to prevent ServiceNow from overwriting and elements we add in
            // between that space, we make a hidden character counter element that gets updated by
            // ServiceNow. Every time that gets changed, we update the previous character counter to
            // match that text. That allows us to insert elements after the textarea, but before the
            // counter displayed text.
            const actualCounter =
                textarea.nextElementSibling.classList.contains("counter") ?
                textarea.nextElementSibling :
                textarea.nextElementSibling.nextElementSibling.classList.contains("counter") ?
                textarea.nextElementSibling.nextElementSibling :
                null;
            if (actualCounter) {
                const match = actualCounter.innerText.match(/\d+ characters remaining of (\d+) characters/);
                const maxChars = match ? +match[1] : 0;

                data.characterCounterFunction = data.characterCounterFunction || (a => a.length);

                observer.disconnect()
                data.characterCounter = actualCounter;
                const hiddenCounter = document.createElement("span");
                data.hiddenCharacterCounter = hiddenCounter;
                // Since ServiceNow just uses .nextElementSibling and overwrites its innerText, we
                // can straight up hide our counter with display: none. The text will still get
                // updated.
                hiddenCounter.style.display = "none";
                hiddenCounter.classList.add("counter");
                // Wait for ServiceNow to update the hiddenCounter's innerText, and then copy that to the
                // old counter display.
                new MutationObserver(function () {
                    const charCount = (data.characterCounterFunction || (a => a.length))(textarea.value);
                    const leftover = maxChars - charCount;
                    actualCounter.innerText = `${leftover} characters remaining of ${maxChars} characters`;
                    if (leftover >= 20) {
                        actualCounter.classList.remove("warning", "exceeded");
                    } else if (leftover >= 0) {
                        actualCounter.classList.remove("exceeded");
                        actualCounter.classList.add("warning");
                    } else {
                        actualCounter.classList.remove("warning");
                        actualCounter.classList.add("exceeded");
                    }
                }).observe(hiddenCounter, {
                    characterData: true,
                    childList: true,
                    subtree: true
                });
                textarea.parentNode.insertBefore(hiddenCounter, textarea.nextSibling);
                textarea.parentNode.insertBefore(data.subbar, actualCounter);

                // The next, NEXT element may also need to be copied in the same way.
                const liveRegion =
                    actualCounter.nextElementSibling.id.includes("live_region_text") ?
                    actualCounter.nextElementSibling :
                    actualCounter.nextElementSibling.nextElementSibling.id.includes("live_region_text") ?
                    actualCounter.nextElementSibling.nextElementSibling :
                    null;
                if (liveRegion) {
                    const liveRegionClone = document.createElement("span");
                    liveRegionClone.style.display = "none";
                    new MutationObserver(function() {
                        liveRegion.innerText = liveRegionClone.innerText;
                    }).observe(liveRegionClone, {
                        characterData: true,
                        childList: true,
                        subtree: true
                    });
                    textarea.parentNode.insertBefore(liveRegionClone, hiddenCounter.nextSibling);

                }
            }
        }

        data.characterCounter = null;
        data.hiddenCharacterCounter = null;

        // If the textarea has a height of 0 and is a direct descendant of <body>, we probably 
        // don't want to show this sub bar since the textarea is hidden and probably won't be shown.
        if (textarea.offsetHeight <= 1 && textarea.parentNode == document.body) {
            return null;
        }

        const observer = new MutationObserver(observerCallback);
        observer.observe(textarea.parentNode, {
            childList: true
        });

        // Now, we can add the bar element after the textarea.
        const bar = document.createElement("div");
        bar.classList.add(`${CSS_PREFIX}-textarea-subbar`, "form-control");
        textarea.parentNode.insertBefore(bar, textarea.nextSibling);
        data.subbar = bar;
        data.subbarElements = data.subbarElements || [];
        
        // Update the decorator element (the golden side strip thingy) to match the height of the
        // textarea as it changes.
        for (let prevNode = textarea.previousElementSibling; prevNode; prevNode = prevNode.previousElementSibling) {
            if (prevNode.classList.contains("sn-stream-input-decorator")) {
                const decorator = textarea.previousElementSibling;
                decorator.style.bottom = "initial";
                decorator.style.height = parseFloat(this.elementStyles.height) - 6 + "px";
                new MutationObserver(function () {
                    decorator.style.height = parseFloat(this.elementStyles.height) - 6 + "px";
                }.bind(this)).observe(textarea, {
                    attributes: true,
                    attributeFilter: ["style"]
                });
                break;
            }
        }

        // If the element before the textarea is a ".sn-stream-input-decorator" element (the
        // colored bar on the left-hand side), we want to add some height to its bottom.
        if (textarea.previousElementSibling && textarea.previousElementSibling.classList.contains("sn-stream-input-decorator")) {
            const oldBottom = getComputedStyle(textarea.previousElementSibling).bottom;
            const additionalHeight = getComputedStyle(bar).height;
            if (parseFloat(oldBottom)) {
                textarea.previousElementSibling.style.bottom = `calc(${additionalHeight} + ${oldBottom})`;
            }
        }

        textarea.setAttribute(`data-${CSS_PREFIX}-has-subbar`, "true");

        for (const callback of subbarAdditionCallbacks) {
            const element = callback(textarea);
            if (!(element instanceof Node)) {
                continue;
            }
            bar.appendChild(element);
            this.subbarElements.push(element);
        }

        observerCallback(null, observer);

        return bar;
    },
    subbarElements: _ => []
});

// This allows you to add elements to the sub bar. The argument should be a callback that returns
// an element (or null if nothing should be added). The callback receives the textarea element as
// its only argument.
module.exports.addToSubBar = function addToSubBar(callback) {
    for (const [textarea, data] of textareaData) {
        if (data.subbar) {
            const element = callback(textarea);
            if (!(element instanceof Node)) {
                continue;
            }
            data.subbar.appendChild(element);
            data.subbarElements.push(element);
        }
    }

    subbarAdditionCallbacks.push(callback);

    return subbarAdditionCallbacks.length - 1;
}