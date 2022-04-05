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

!function() {
    "use strict";
    document.querySelector("form").addEventListener("submit", function() {
        // this.action = "fs_node_result";
    });
}();