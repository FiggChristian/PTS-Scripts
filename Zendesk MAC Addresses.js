// ==UserScript==
// @name        Zendesk MAC Addresses
// @description Makes MAC addresses in comments hoverable with extra links
// @include     /^https?://stanfordacs\.zendesk\.com/.*$/
// ==/UserScript==

// Whenever we paste a MAC address, make sure it is in a pretty format instead of just ugly lowercase letters
window.addEventListener("paste", function(e) {
    // Get the pasted text
    let text = e.clipboardData.getData("Text");
    // Check if it looks like a MAC address
    let match = text.match(/^(?:[a-f\d]{12}|[a-f\d]{4}(?:[^a-z\d\s][a-f\d]{4}){2}|[a-f\d]{2}(?:[^a-z\d][a-f\d]{2}){5})$/i);
    if (!match) {
        // If it doesn't match, we can just ignore it
        return;
    }
    // Format the MAC address by adding colons and uppercasing it
    let formatted = text.toUpperCase().replace(/[^A-F\d]/g, "").replace(/(.{2})/g, ":$1").substring(1);
    // Try to insert the prettified text and prevent the paste from going through
    if (document.execCommand("insertText", false, formatted)) {
        e.stopPropagation();
        e.preventDefault();
    } else {
        // Inserting failed for some reason; show a warning and allow the original paste to go through
        console.warn("Insertion failed");
    }
});

// A list of OUIs from Wireshark's database (https://www.wireshark.org/tools/oui-lookup.html)
window.OUIs = null;

// A function to populate the list of OUIs via an XMLHttpRequest
!function(url) {
    let xhr = new XMLHttpRequest();
    // Use allorigins.win to override the CORS policy
    xhr.open("GET", `https://api.allorigins.win/get?url=${url}`);
    xhr.addEventListener("readystatechange", function() {
        if (this.readyState == 4 && this.status == 200) {
            // The lsit of OUIs we will populate
            let _OUIs = {};
            let response = JSON.parse(this.response).contents;
            // Separate the response into lines
            for (let index = 0; ~(index = response.indexOf("\n", index)); index++) {
                // If the beginning of this line starts with a "#", it is a comment and we can ignore it
                if (response[index + 1] == "#" || response[index + 1] == "\n") {
                    continue;
                }
                // Get the line as a standalone string
                let line = response.substring(index + 1, response.indexOf("\n", index + 1));
                // Split it by tabs to get the individual components
                let components = line.split("\t");
                // The 0th item is the MAC address prefix
                // The 2nd item is the full name of the vendor
                // The 1st item is the shortened name of the vendor
                // We prefer to use the full name but go to the short name when that's noot available
                _OUIs[components[0]] = components[2] || components[1];
            }
            OUIs = _OUIs
        }
    });
    xhr.send();
}("https://gitlab.com/wireshark/wireshark/-/raw/master/manuf");

!function() {
    // The regex to compare against when looking for MAC addresses in the comments
    macRegex = /\b(?:[a-f\d]{12}(?![a-f\d])|[a-f\d]{4}(?:[-–][a-f\d]{4}){2}|[a-f\d]{4}([^a-z\d\s])[a-f\d]{4}\1[a-f\d]{4}(?!\1?[a-f\d])|[a-f\d]{2}(?:[-–][a-f\d]{2}){5}|[a-f\d]{2}([^a-z\d])[a-f\d]{2}(?:\2[a-f\d]{2}){4})(?!\2?[a-f\d])/i;
    function f() {
        // Get a list of all the comments we have yet to look through
        let comments = document.querySelectorAll(".event-container .comment:not([data-mac-searched])");
        // Iterate through these comments
        for (let comment of comments) {
            // Set an attribute on them so we don't look twice
            comment.setAttribute("data-mac-searched", true);
            // Replace any MAC addresses we find in this comment
            replaceMac(comment);
        }
        
    }
    f();
    new MutationObserver(f).observe(document, {
        childList: true,
        subtree: true
    });
    
    // A recursive function that searches a node and all its children for any MAC addresses
    function replaceMac(node) {
        // A text node means we need to look at its content for any MAC addresses
        if (node.nodeType == node.TEXT_NODE && node.textContent.trim()) {
            let match;
            // While we find a MAC address in the node, run this code
            while (match = node.textContent.match(macRegex)) {
                // Get the index in the text node's content where the MAC address starts
                let index = node.textContent.indexOf(match[0]);
                // Pull out the full MAC address
                let mac = node.textContent.substring(index, index + match[0].length);
                // Format it to look prettier
                let formatted = mac.toUpperCase().replace(/[^A-F\d]/g, "").replace(/(.{2})/g, ":$1").substring(1);
                // Make a node with all the text after the MAC address
                newNode = document.createTextNode(node.textContent.substring(index + match[0].length));
                // Insert it after the current node
                node.parentNode.insertBefore(newNode, node.nextSibling);
                // Change the current text node to all the text *before* the MAC address
                node.textContent = node.textContent.substring(0, index);
                // At this point, we've taken out the MAC address completely and created two text nodes around it
                // Now we make an element that'll sit in between those two text nodes that shows the MAC address
                let macNode = document.createElement("span");
                // Style it to make it stand out as a hoverable MAC address
                macNode.style.background = "transparent";
                macNode.style.color = "inherit";
                macNode.style.fontSize = "inherit";
                macNode.style.fontFamily = "inherit";
                macNode.style.position = "relative";
                macNode.style.zIndex = 2;
                macNode.style.padding = 0;
                macNode.style.border = 0;
                macNode.style.margin = 0;
                // Fill in all the element's it needs for when we hover over it
                // This includes a button to open in NetDB, open in DHCPlog, copy the MAC address, and show the OUI
                macNode.innerHTML = `<input readonly type="text" style="padding:0;border:0;margin:0;font-size:inherit;color:inherit;font-family:inherit;vertical-align:initial;line-height:inherit;text-decoration:underline;background:transparent;cursor:pointer" onclick="this.select()" value="${mac}"><span style="visibility:hidden;position:absolute;pointer-events:none;white-space:nowrap">${mac}</span><span style="display:none"> (<a href="https://netdb.stanford.edu/qsearch?search_string=${encodeURIComponent(formatted)}&search_type=Nodes&purge=">NetDB</a> | <a href="http://day.stanford.edu:9696/manage/dhcplog/check_db?input=${encodeURIComponent(formatted)}">DHCP</a> | <button style="padding:0;border:0;margin:0;font-size:inherit;color:inherit;font-family:inherit;vertical-align:initial;line-height:inherit;background:transparent" onclick="try{navigator.clipboard.writeText('${formatted}')}catch{this.nextElementSibling.focus();this.nextElementSibling.select();document.execCommand('copy')}"><a onclick="return false" href="javascript:void(0)">Copy</a></button><textarea readonly style="opacity:0;position:absolute;pointer-events:none">${formatted}</textarea>${OUIs != null ? ` | OUI: ${OUIs[formatted.substring(0,8)] ? OUIs[formatted.substring(0,8)] : "<i>Unregistered</i>"}` : ""})</span>`;
                // Only show the extra content when we hover over the MAC address
                macNode.addEventListener("mouseenter", function() {
                    this.style.zIndex = 1;
                    this.setAttribute("data-mac-active", true);
                    this.firstElementChild.style.textDecoration = "none";
                    // We add a large border around it so that we can move the mouse a little without it leaving out of the area all the way
                    this.style.border = "1.5rem solid transparent";
                    this.style.margin = "-1.5rem";
                    this.lastElementChild.style.display = "";
                });
                // When we stop hovering, go back to hiding the extra content
                macNode.addEventListener("mouseleave", function() {
                    this.style.zIndex = 2;
                    this.removeAttribute("data-mac-active");
                    this.firstElementChild.style.textDecoration = "underline";
                    this.style.border = "0 solid transparent";
                    this.style.margin = 0;
                    this.lastElementChild.style.display = "none";
                });
                // Insert this MAC address node in between the two next nodes
                node.parentNode.insertBefore(macNode, newNode);
                // Change the width of the <input> so that it just looks like inline text
                macNode.children[0].style.width = macNode.children[1].getBoundingClientRect().width + "px";
                // Move on to the next text node we just created in case there are more MAC addresses in this node
                node = newNode;
            }
        } else if (node.nodeType == node.ELEMENT_NODE) {
            // If this is an element, recursively check through all its children
            for (let child of Array.prototype.slice.call(node.childNodes)) {
                replaceMac(child);
            }
        }
    }
}();
