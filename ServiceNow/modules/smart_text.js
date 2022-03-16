const { CSS_PREFIX, NETDB_HOST } = require("./constants.js");
const { waitForElements, turnNoIndexInto } = require("./helpers.js");
const { SMART_TEXT: SMART_TEXT_STYLES } = require("./styles.js");
const events = require("./events.js");

const MAC_ADDRESS_REGEX = /\b(?:[a-f\d]{12}(?![a-f\d])|[a-f\d]{4}(?:[-–][a-f\d]{4}){2}|[a-f\d]{4}([^a-z\d\s])[a-f\d]{4}\1[a-f\d]{4}(?!\1?[a-f\d])|[a-f\d]{2}(?:[-–][a-f\d]{2}){5}|[a-f\d]{2}([^a-z\d])[a-f\d]{2}(?:\2[a-f\d]{2}){4})(?!\2?[a-f\d])/i;
const IP_ADDRESS_REGEX = /(^|[^.])\b((?:[1-9]?\d|1\d\d|2[0-4]\d|25[0-5])(?:\.(?:[1-9]?\d|1\d\d|2[0-4]\d|25[0-5])){3})\b(?!\.\d)/;
const NODE_NAME_REGEX = /\b(rescomp-\d+-\d+|sr\d+-[\da-f]+)(?:\.stanford\.edu)?\b/;
const TICKET_REGEX = /\b(?:CALL|CHG|INC|REQ|RITM|SR|TASK)\d+\b/;

const OUIsPopulated = new Promise(function(resolve, reject) {
    const url = "https://gitlab.com/wireshark/wireshark/-/raw/master/manuf";
    let xhr = new XMLHttpRequest();
    // Use allorigins.win to override the CORS policy
    xhr.open("GET", `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${new Date().valueOf()}`);
    xhr.addEventListener("readystatechange", function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                resolve(getOUIObject(JSON.parse(this.response).contents));
            } else {
                // If allorigins.win fails, we fallback to a list on the GitHub repo.
                xhr = new XMLHttpRequest();
                xhr.open("GET", `https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/OUI_list.txt?timestamp=${new Date().valueOf()}`);
                xhr.addEventListener("readystatechange", function() {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            resolve(getOUIObject(this.response));
                        } else {
                            // If this failed too, we just give up since it's probably a network
                            // issue.
                            reject(this.response);
                        }
                    }
                });
                xhr.send();
            }
        }
    });
    xhr.send();
});

function getOUIObject(response) {
    // The list of OUIs we will populate.
    const OUIs = {};
    // Separate the response into lines.
    for (let index = 0; ~(index = response.indexOf("\n", index)); index++) {
        // If the beginning of this line starts with a "#", it is a comment and we can ignore
        // it.
        if (response[index + 1] == "#" || response[index + 1] == "\n") {
            continue;
        }
        // Get the line as a standalone string.
        const line = response.substring(index + 1, response.indexOf("\n", index + 1));
        // Split it by tabs to get the individual components.
        const components = line.split("\t");

        // The 0th item is the MAC address prefix. It can be in the form of 6 digits or a full
        // MAC address followed by a "/" and number. The number indicates how many digits the
        // prefix is.
        // E.g., "A1:B2:C3:D4:E5:F6/36" indicates we should look at the first 36/4=9 digits
        // only.
        // A six-digit MAC address is treated as the full six digits.
        if (components[0].length == 8) { // 6 digits plus 2 colons
            // The 2nd item is the full name of the vendor. The 1st item is the shortened name
            // of the vendor. We prefer to use the full name but go to the short name when
            // that's not available
            OUIs[components[0]] = components[2] || components[1];
        } else if (components[0][17] == "/") {
            // If we find a prefix length with other than 6, we overwrite the OUI for the six
            // digit version with the new length.
            let digits = parseInt(components[0].substring(18)) / 4;
            let prefix = components[0].substring(0, digits + Math.ceil(digits / 2 - 1));
            OUIs[components[0].substring(0, 8)] = prefix.length;
            OUIs[prefix] = components[2] || components[1];
        } else {
            continue;
        }
    }
    return OUIs;
}

function getOUI(OUIs, macAddress) {
    let prefix = macAddress.substring(0, 8);
    if (!(prefix in OUIs)) {
        return null;
    } else if (typeof OUIs[prefix] == "number") {
        prefix = macAddress.substring(0, OUIs[prefix]);
        if (prefix in OUIs) {
            return OUIs[prefix]
        } else {
            return null;
        }
    } else {
        return OUIs[prefix];
    }
}

function replaceSmartText(node) {
    if (node.nodeType == Node.TEXT_NODE) {
        let macAddressMatch;
        let ipAddressMatch;
        let nodeNameMatch;
        let ticketMatch;

        while (true) {
            macAddressMatch = MAC_ADDRESS_REGEX.exec(node.textContent);
            ipAddressMatch = IP_ADDRESS_REGEX.exec(node.textContent);
            nodeNameMatch = NODE_NAME_REGEX.exec(node.textContent);
            ticketMatch = TICKET_REGEX.exec(node.textContent);

            // Only look at the first match.
            let firstMatch = null;
            if (macAddressMatch && (firstMatch == null || firstMatch.index > macAddressMatch.index)) {
                firstMatch = macAddressMatch;
            }
            if (ipAddressMatch && (firstMatch == null || firstMatch.index > ipAddressMatch.index)) {
                firstMatch = ipAddressMatch;
            }
            if (nodeNameMatch && (firstMatch == null || firstMatch.index > nodeNameMatch.index)) {
                firstMatch = nodeNameMatch;
            }
            if (ticketMatch && (firstMatch == null || firstMatch.index > ticketMatch.index)) {
                firstMatch = ticketMatch;
            }

            // Break if there are no matches.
            if (firstMatch === null) {
                break;
            }

            if (firstMatch == macAddressMatch) {
                // Links sometimes ave random numbers in them that look like they could be a MAC
                // address, but are usually just random numbers as part of the link. To check if
                // that's the case, we look at the the location in the text where the MAC address
                // is. We check for a space before and after the MAC address and then check if that
                // "word" that the MAC address is in is a URL.

                // `preText` is all the text inside any text nodes that precede the current text
                // node. If there's a link such as https://example.com/a1b2c3d4e5f6-a1b2c3d4e5f6, it
                // has two "MAC addresses" in it. The first one will be detected and not replaced
                // with smart text. Instead it gets replaced with its own text node so we can move
                // on to the next thing. The text nodes after finding it and replacing it will be:
                // "https://example.com/",
                // "a1b2c3d4e5f6", and
                // "-a1b2c3d4e5f6".
                // The next text node after will be looked at, and the second MAC address will be
                // seen as well. Since that text node's content is only "-a1b2c3d4e5f6", we won't
                // recognize that as a URL because the URL has been broken up into multiple text
                // nodes, but we still *do* want to to recognize that it's just a second MAC address
                // in a URL. `preText` is filled with all the text content that precedes the current
                // text node. In that case, it would be "https://example.com/a1b2c3d4e5f6". When we
                // concatenate it with the text node's content, we get the full URL back as one
                // contiguous string, and we can detect that the entire string is in fact a URL.
                let preText = "";
                for (
                    let preNode = node.previousSibling;
                    preNode?.nodeType == Node.TEXT_NODE;
                    preNode = preNode.previousSibling
                ) {
                    preText = preNode.textContent + preText;
                }

                const prevWhiteSpaceIndex = Math.max(
                    0,
                    turnNoIndexInto(0, (preText + node.textContent).lastIndexOf(" ",  macAddressMatch.index + preText.length)),
                    turnNoIndexInto(0, (preText + node.textContent).lastIndexOf("\n", macAddressMatch.index + preText.length)),
                    turnNoIndexInto(0, (preText + node.textContent).lastIndexOf("\t", macAddressMatch.index + preText.length))
                );
                const nextWhiteSpaceIndex = Math.min(
                    node.textContent.length + preText.length,
                    turnNoIndexInto(Infinity, (preText + node.textContent).indexOf(" ",  macAddressMatch.index + macAddressMatch[0].length + preText.length)),
                    turnNoIndexInto(Infinity, (preText + node.textContent).indexOf("\n", macAddressMatch.index + macAddressMatch[0].length + preText.length)),
                    turnNoIndexInto(Infinity, (preText + node.textContent).indexOf("\t", macAddressMatch.index + macAddressMatch[0].length + preText.length))
                );

                // Get the entire "word" the MAC address is in. In most cases, it's just the MAC
                // address on its own, or it's a URL.
                const macWord = (preText + node.textContent).substring(prevWhiteSpaceIndex, nextWhiteSpaceIndex);
                // Check if it's a valid URL by using the URL builtin constructor.
                let isURL = false;
                try {
                    const url = new URL(macWord); // Check if value can be parsed as a URL.
                    // Make sure this is a "normal" URL. This means other URL protocols like
                    // "chrome:" or "data:" will not be counted as URLs, which can create some false
                    // negatives, but this also prevents MAC addresses from being counted as a URL.
                    // "AB:CD:EF:12:34:56" for example can be read as a URL with protocol "ab:",
                    // which would result in false positives, and this happens way more often since
                    // no one really sends non-http(s) URLs anyway.
                    isURL = url.protocol == "https:" || url.protocol == "http:" || url.protocol == "file:";
                } catch (e) {}
                // If this MAC address looks like it's in a URL, we don't highlight it. Instead, we
                // keep it as-is in its own text node.
                if (isURL) {
                    node.parentNode.insertBefore(document.createTextNode(node.textContent.substring(0, macAddressMatch.index)), node);
                    node.parentNode.insertBefore(document.createTextNode(macAddressMatch[0]), node);
                    node.textContent = node.textContent.substring(macAddressMatch.index + macAddressMatch[0].length);
                    continue;
                }

                const formatted = macAddressMatch[0].toUpperCase().replace(/[^A-F\d]/g, "").replace(/(.{2})/g, ":$1").substring(1);
                const macSpan = document.createElement("span");
                macSpan.classList.add(`${CSS_PREFIX}-smart-text-span`, `${CSS_PREFIX}-smart-text-mac-address`);
                macSpan.setAttribute(`data-${CSS_PREFIX}-mac-address`, formatted);
                macSpan.innerHTML = `<input value="${formatted}" readonly/><span><span class="${CSS_PREFIX}-smart-text-anchor-text">${macAddressMatch[0]}</span><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>MAC Address</li><li class="${CSS_PREFIX}-mac-address-oui" style="font-style:italic">Loading OUIs...</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a target="_blank" href="https://${NETDB_HOST}/fs_node_result?display_order.hardware_address=1&display_order.object=2&display_order.ip_address=3&display_order.node_state=4&display_order.make_and_model=5&display_order.os=6&display_order.department=7&display_order.user=8&column=Name&direction=ascending&purge=&hardware_address=${formatted}">NetDB</a></li><li><a target="_blank" href="http://day.stanford.edu:9696/manage/dhcplog/check_db?input=${formatted}">DHCP Log</a></li><li><a target="_blank" href="https://archer.stanford.edu/webacs/welcomeAction.do#pageId=full_search_pageId&query=${encodeURIComponent(formatted)}&forceLoad=true">Cisco Prime</a></li><li><a target="_blank" href="https://mydevices.stanford.edu/group/mydevices?${encodeURIComponent(`${CSS_PREFIX}-search-mac`)}=${encodeURIComponent(formatted)}">MyDevices</a></li><li><a target="_blank" href="https://iprequest.stanford.edu/iprequest/process/search.jsp?ipaddr=&macaddress=${encodeURIComponent(formatted)}&search=0&sort=UPPER%28lastname%29%2C+UPPER%28firstname%29">IPRequest</a></li></ul></li></ul></span>`;

                macSpan.addEventListener("click", e => e.stopPropagation());

                let input = macSpan.firstElementChild;

                const anchorText = macSpan.querySelector(`.${CSS_PREFIX}-smart-text-anchor-text`);

                const OUISpan = macSpan.querySelector(`.${CSS_PREFIX}-mac-address-oui`);
                OUIsPopulated.then(function(OUIs) {
                    const OUI = getOUI(OUIs, formatted);
                    if (OUI === null) {
                        OUISpan.textContent = "Unregistered OUI";
                        OUISpan.style.color = "#C00";
                        anchorText.style.color = "#C00";
                        // Adds a "!" icon before a MAC address with an unregistered OUI so the
                        // person knows something is wrong with it.
                        anchorText.innerHTML = `<svg class="${CSS_PREFIX}-smart-text-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"/></svg>` + anchorText.innerHTML;
                    } else {
                        OUISpan.textContent = `OUI: ${OUI}`;
                        OUISpan.style.fontStyle = "initial";
                    }
                }, function() {
                    OUISpan.textContent = "Couldn't Load OUIs";
                });

                const copySpan = macSpan.querySelector(`.${CSS_PREFIX}-smart-text-copy`);
                copySpan.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        navigator.clipboard.writeText(formatted);
                    } catch (e) {
                        input.focus();
                        if (!document.execCommand("selectAll", false)) {
                            input.setSelectionRange(0, input.value.length);
                        }
                        document.execCommand("copy", false);
                    }
                });

                node.parentNode.insertBefore(document.createTextNode(node.textContent.substring(0, macAddressMatch.index)), node);
                node.parentNode.insertBefore(macSpan, node);
                node.textContent = node.textContent.substring(macAddressMatch.index + macAddressMatch[0].length);

                events.trigger("insert_smart_text", macSpan, "MAC address");
            }

            if (firstMatch == ipAddressMatch) {
                let formatted = ipAddressMatch[2];
                const ipSpan = document.createElement("span");
                ipSpan.classList.add(`${CSS_PREFIX}-smart-text-span`, `${CSS_PREFIX}-smart-text-ip-address`);
                ipSpan.setAttribute(`data-${CSS_PREFIX}-ip-address`, formatted);
                ipSpan.innerHTML = `<input value="${formatted}" readonly/><span><span>${ipAddressMatch[2]}</span><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>IP Address</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a target="_blank" href="https://${NETDB_HOST}/fs_network_result?display_order.object=1&display_order.location=2&display_order.address_space=2&display_order.comment=3&purge=&dhcp_address=${formatted}">NetDB</a></li><li><a target="_blank" href="https://iprequest.stanford.edu/iprequest/process/search.jsp?ipaddr=${encodeURIComponent(formatted)}&macaddress=&search=0&sort=UPPER%28lastname%29%2C+UPPER%28firstname%29">IPRequest</a></li></ul></li></ul></span>`;

                ipSpan.addEventListener("click", e => e.stopPropagation());

                let input = ipSpan.firstElementChild;

                const copySpan = ipSpan.querySelector(`.${CSS_PREFIX}-smart-text-copy`);
                copySpan.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        navigator.clipboard.writeText(formatted);
                    } catch (e) {
                        input.focus();
                        if (!document.execCommand("selectAll", false)) {
                            input.setSelectionRange(0, input.value.length);
                        }
                        document.execCommand("copy", false);
                    }
                });

                node.parentNode.insertBefore(document.createTextNode(node.textContent.substring(0, ipAddressMatch.index + ipAddressMatch[1].length)), node);
                node.parentNode.insertBefore(ipSpan, node);
                node.textContent = node.textContent.substring(ipAddressMatch.index + ipAddressMatch[0].length);

                events.trigger("insert_smart_text", ipSpan, "IP address");
            }

            if (firstMatch == nodeNameMatch) {
                const formatted = nodeNameMatch[1];
                const nodeSpan = document.createElement("span");
                nodeSpan.classList.add(`${CSS_PREFIX}-smart-text-span`, `${CSS_PREFIX}-smart-text-node-name`);
                nodeSpan.setAttribute(`data-${CSS_PREFIX}-node-name`, formatted);
                nodeSpan.innerHTML = `<input value="${formatted}" readonly/><span><span>${nodeNameMatch[0]}</span><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>Node Name</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a target="_blank" href="https://${NETDB_HOST}/node_info?name=${formatted}.stanford.edu">NetDB</a></li><li><a target="_blank" href="https://iprequest.stanford.edu/iprequest/process/search.jsp?ipaddr=&macaddress=&hostname=${encodeURIComponent(formatted)}&search=0&sort=UPPER%28lastname%29%2C+UPPER%28firstname%29">IPRequest</a></li></ul></li></ul></span>`;

                nodeSpan.addEventListener("click", e => e.stopPropagation());

                let input = nodeSpan.firstElementChild;

                const copySpan = nodeSpan.querySelector(`.${CSS_PREFIX}-smart-text-copy`);
                copySpan.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        navigator.clipboard.writeText(formatted);
                    } catch (e) {
                        input.focus();
                        if (!document.execCommand("selectAll", false)) {
                            input.setSelectionRange(0, input.value.length);
                        }
                        document.execCommand("copy", false);
                    }
                });

                node.parentNode.insertBefore(document.createTextNode(node.textContent.substring(0, nodeNameMatch.index)), node);
                node.parentNode.insertBefore(nodeSpan, node);
                node.textContent = node.textContent.substring(nodeNameMatch.index + nodeNameMatch[0].length);

                events.trigger("insert_smart_text", nodeSpan, "node name");
            }

            if (firstMatch == ticketMatch) {
                const formatted = ticketMatch[0];
                const ticketSpan = document.createElement("span");
                ticketSpan.classList.add(`${CSS_PREFIX}-smart-text-span`, `${CSS_PREFIX}-smart-text-ticket`);
                ticketSpan.setAttribute(`data-${CSS_PREFIX}-ticket`, formatted);
                ticketSpan.innerHTML = `<input value="${formatted}" readonly/><span><span>${ticketMatch[0]}</span><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>Ticket Number</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a href="https://stanford.service-now.com/text_search_exact_match.do?sysparm_search=${formatted}">ServiceNow</a></li></ul></li></ul></span>`;

                ticketSpan.addEventListener("click", e => e.stopPropagation());

                let input = ticketSpan.firstElementChild;

                const copySpan = ticketSpan.querySelector(`.${CSS_PREFIX}-smart-text-copy`);
                copySpan.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        navigator.clipboard.writeText(formatted);
                    } catch (e) {
                        input.focus();
                        if (!document.execCommand("selectAll", false)) {
                            input.setSelectionRange(0, input.value.length);
                        }
                        document.execCommand("copy", false);
                    }
                });

                node.parentNode.insertBefore(document.createTextNode(node.textContent.substring(0, ticketMatch.index)), node);
                node.parentNode.insertBefore(ticketSpan, node);
                node.textContent = node.textContent.substring(ticketMatch.index + ticketMatch[0].length);

                events.trigger("insert_smart_text", ticketSpan, "ticket");
            }
        }
    } else if (node.nodeType == Node.ELEMENT_NODE || node.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
        if (node.shadowRoot) {
            const root = node.shadowRoot;
            if (!root.firstElementChild || !root.firstElementChild.classList.contains(`data-${CSS_PREFIX}-shadow-style`)) {
                const stylesheet = document.createElement("style");
                stylesheet.classList.add(`${CSS_PREFIX}-shadow-style`);
                stylesheet.innerHTML = SMART_TEXT_STYLES;
                node.shadowRoot.insertBefore(stylesheet, root.firstChild);
            }
            replaceSmartText(root);
        } else {
            // Make <A> open in a new tab instead of on the same page. This isn't really "smart
            // text", but it just makes it a lot easier when there are links in tickets.
            try {
                if (node.nodeName == "A" && new URL(node.href).hostname != location.hostname) {
                    node.target = "_blank";
                }
            } catch (e) { /* pass */ }
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                replaceSmartText(node.childNodes[i]);
            }
        }
    }
}

module.exports.init = function() {
    events.addListener("show_preview", function(data) {
        replaceSmartText(data.markdownPreviewer);
    });

    waitForElements(
        `.sn-widget-textblock-body:not([data-${CSS_PREFIX}-smart-text-searched]),.sn-widget-list-table-cell:not([data-${CSS_PREFIX}-smart-text-searched]),sn-html-content-wrapper:not([data-${CSS_PREFIX}-smart-text-searched])`,
        function(comments) {
            for (const comment of comments) {
                comment.setAttribute(`data-${CSS_PREFIX}-smart-text-searched`, "true");

                for (let node = comment; node; node = node.parentElement) {
                    node.style.overflow = "visible";
                    if (node.nodeName == "LI") {
                        node.style.display = "inline-block";
                        node.style.width = "100%";
                    } else if (node.classList.contains("h-card-wrapper") && node.classList.contains("activities-form")) {
                        break;
                    }
                }

                replaceSmartText(comment);
            }
        }
    );

    waitForElements(
        `.doctype-stream.form-stream:not([data-${CSS_PREFIX}-smart-text-searched])`,
        function(streams) {
            for (const stream of streams) {
                stream.setAttribute(`data-${CSS_PREFIX}-smart-text-searched`, "true");
                stream.style.overflow = "visible";
            }
        }
    );
}


module.exports.replaceSmartText = replaceSmartText;