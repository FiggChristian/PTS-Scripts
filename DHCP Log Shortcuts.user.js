// ==UserScript==
// @name        DHCP Log Shortcuts
// @description Add shortcuts to DHCP Log
// @match       *://*/manage/dhcplog/check_db*
// ==/UserScript==

!function() {
    // Make sure we are at a proper URL
    if (location.host != "day.stanford.edu:9696" || location.search.substring(0, "?input=".length) != "?input=" || location.search.length <= "?input=".length) {
        return;
    }
    
    let pre = document.querySelectorAll("pre");
    if (pre.length != 1) {
        return;
    }
    pre = pre[0];
    for (const child of pre.childNodes) {
        if (child.nodeType != document.TEXT_NODE) {
            return;
        }
    }
    pre.normalize();
    
    let text = pre.firstChild.nodeValue;
    let match;
    while (match = text.match(/\d+\.\d+\.\d+\.\d+/)) {
        match = match[0]
        index = text.indexOf(match);
        pre.appendChild(document.createTextNode(text.substring(0, index)));
        let a = document.createElement("a");
        a.innerText = match;
        a.target = "NETDB";
        a.href = `https://netdb.stanford.edu/qsearch?search_string=${match}&search_type=Networks`;
        pre.appendChild(a);
        text = text.substring(index + match.length);
    }
    pre.appendChild(document.createTextNode(text));
    pre.removeChild(pre.firstChild);
}();