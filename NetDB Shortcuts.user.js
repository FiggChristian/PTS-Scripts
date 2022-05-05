// ==UserScript==
// @name        NetDB Shortcuts
// @description Add shortcuts to NetDB
// @match       *://netdb.stanford.edu/
// @match       *://netdb.stanford.edu/*
// ==/UserScript==

// Command + D shortcut to focus search field.
window.addEventListener("keydown", function(e) {
    "use strict";
    if (e.metaKey && e.key == "d") {
        e.preventDefault();
        e.stopPropagation();
        document.querySelector("input[type=text]").focus();
    }
});

// Create DHCP Log shortcut by MAC address.
!function() {
    "use strict";
    let tds = document.querySelectorAll("td");
    for (let td of tds) {
        if (td.innerText.trim() == "Hardware Address") {
            let container = td.nextElementSibling.nextElementSibling;
            let address = container.firstElementChild;
            let link = document.createElement("a");
            link.href = "http://day.stanford.edu:9696/manage/dhcplog/check_db?input=" + address.innerText;
            link.target = "DHCP"
            link.innerText = "DHCP Log"
            container.insertBefore(link, address.nextSibling);
            container.insertBefore(document.createTextNode(" "), link)
        }
    }
}();

// Create Node History shortcut by Record ID.
!function() {
    "use strict";
    let tds = document.querySelectorAll("td");
    for (let td of tds) {
        if (td.innerText.trim() == "Record ID") {
            let container = td.nextElementSibling.nextElementSibling;
            let id = container.firstElementChild;
            let link = document.createElement("a");
            link.href = "https://netdb.stanford.edu/fs_log_result?display_order.date_of_action=1&display_order.record_name=2&display_order.ip_address=3&display_order.node_state=4&record_type=node&display_order.user=5&display_order.logaction=6&logaction=delete&logaction=update&logaction=insert&direction=descending&record_id=" + id.innerText;
            link.target = "Node Record History"
            link.innerText = "Node History"
            container.insertBefore(link, id.nextSibling);
            container.insertBefore(document.createTextNode(" "), link)
        }
    }
}();

// Highlight the MAC address the user searched for, if any.
!function() {
    "use strict";
    try {
        for (const [key, value] of new URLSearchParams(location.search)) {
            if (key == "history") {
                const prevURL = new URL(decodeURIComponent(value), "https://netdb.stanford.edu");
                const isQuickSearch = prevURL.pathname == "/qsearch";
                const isFullSearch = prevURL.pathname == "/fs_node_result";

                let mac = null;
                for (const [innerkey, innervalue] of new URLSearchParams(prevURL.search)) {
                    if (isFullSearch && innerkey == "hardware_address") mac = decodeURIComponent(innervalue).replace(/[^A-Fa-f\d]/g, "").toLowerCase();
                    if (isQuickSearch && innerkey == "search_string") mac = decodeURIComponent(innervalue).replace(/[^A-Fa-f\d]/g, "").toLowerCase();
                    if (mac) break;
                }

                if (!mac || mac.length != 12) break;

                let tds = document.querySelectorAll("td");
                for (let td of tds) {
                    if (td.innerText.trim() == "Hardware Address") {
                        let container = td.nextElementSibling.nextElementSibling;
                        let address = container.firstElementChild;
                        if (address.innerText.replace(/[^A-Fa-f\d]/g, "").toLowerCase() == mac) {
                            address.style.backgroundColor = "yellow";
                        }
                    }
                }
            }
        }
    } catch (e) { /* do nothing */ }
}();


// Hide IP addresses on Network pages.
!function() {
    "use strict";
    let tbody = document.querySelector("table.table tr[bgcolor] + tr tbody");
    if (!tbody) {
        return;
    }
    for (let tr of tbody.children) {
        if (tr.children.length == 1 && tr.firstElementChild.getAttribute("colspan") == "3") {
            tr.classList.add("divider");
        } else if (tr.firstElementChild.innerText == "Dynamic DHCP Addresses") {
            tr.classList.add("addresses");
            let td = document.createElement("td");
            let label = document.createElement("label");
            let table = document.createElement("table");
            
            td.colspan = 2;
            
            label.innerHTML = "<span>Show</span> <input type='checkbox' style='height:initial;width:initial;clip-path:initial;position:relative'>";
            label.addEventListener("change", function() {
                let value = this.lastElementChild.checked;
                if (value) {
                    table.style.display = "";
                    label.firstElementChild.innerText = "Hide";
                } else {
                    table.style.display = "none";
                    label.firstElementChild.innerText = "Show";
                }
            });
            
            label.style.marginTop = "initial";

            table.style.display = "none";
            table.appendChild(tr.lastElementChild);
            
            td.appendChild(label)
            td.appendChild(table);
            tr.appendChild(td);
        }
    }
}();
