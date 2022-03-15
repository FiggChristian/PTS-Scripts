const { CSS_PREFIX, REPLACEMENT_START_DELIMITER, REPLACEMENT_END_DELIMITER, CURSOR } = require("./constants.js");
const { escapeHTML, replaceTextareaValue, dedent, setAssignmentGroup, setState } = require("./helpers.js");
const { resolveReplacements } = require("./replacements.js");
const { textareaData } = require("./textareas.js");
const { addToSubBar } = require("./textarea_subbar.js");
const events = require("./events.js");

/**
 * The different teams a macro can apply to. They can be combined with the "|" binary OR operator.
 * @readonly
 * @enum {number}
 */
const TEAM = {
    TRIAGE: 0b001,
    ESCALATION: 0b010,
    RESOLUTION: 0b100
};

/**
 * The different states a ticket can be in.
 * @readonly
 * @enum {Symbol}
 */
const STATE = {
    NEW: Symbol.for("STATE.NEW"),
    ACTIVE: Symbol.for("STATE.ACTIVE"),
    PENDING: Symbol.for("STATE.PENDING"),
    RESOLVED: Symbol.for("STATE.RESOLVED")
};

/**
 * @typedef {object} Macro
 * @property {string} name The name to show in the macro selector.
 * @property {string} description The description to show underneath the name in the macro selector.
 * @property {object} fields A set of fields to change on the ticket when the macro is applied.
 * @property {string} fields.additional_comments Changes the Additional Comments (Customer Visible)
 *      field.
 * @property {string} fields.work_notes Changes the Work Notes field.
 * @property {STATE} fields.state The state to change the ticket to.
 * @property {TEAM} ticket_team The team(s) this macro applies to. Combine TEAMs using the "|" binary OR
 *      operator.
 */

/** @type Array<Macro> */
const MACROS = [
    {
        name: "Request MAC Address",
        description: "Ask user to provide the MAC address for the device in question.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},
                    
                Could you please provide the hardware address (also known as a MAC address) for this device? Here are instructions on how to find it: ${REPLACEMENT_START_DELIMITER}link.mac_address${REPLACEMENT_END_DELIMITER}
                
                With this information we'll be able to look into your issue further.
                
                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.full${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    },
    {
        name: "Net Trouble Report",
        description: "Shows the form for submitting a the Net Trouble report.",
        fields: {
            work_notes: `
                ### Network Trouble Report

                Wireless/wired/both: ${CURSOR()}
                MAC addresses: ${CURSOR()}
                Device description: ${CURSOR()}
                Operating system: ${CURSOR()}
                1st timestamp: ${CURSOR()}
                2nd timestamp: ${CURSOR()}
                3rd timestamp: ${CURSOR()}
                Building and room number: ${CURSOR()}
                Nature of issue <!-- slow, trouble connecting, dropped sessions, poor coverage -->: ${CURSOR()}
                Specific issue details: ${CURSOR()}
                Troubleshooting attempted thus far: ${CURSOR()}
            `,
            assignment_group: "UIT ResNet",
            state: STATE.ACTIVE
        },
        ticket_team: TEAM.ESCALATION
    },
    {
        name: "TSO Activation Form",
        description: "Shows the form for submitting a TSO activation request.",
        fields: {
            work_notes: `
                Hi ITOC,

                Could you please schedule an onsite appointment for UIT I&M to repair this TSO in a student residence, and then pass this ticket onto them?  Thank you!

                <!-- All fields are required to be completed with actionable data. -->

                Destination: UIT Installation and Maintenance
                Bill to PTA: 1181807-6-AABVT
                Building and Room: ${CURSOR()}
                TSO number: ${CURSOR()}
                Is this a primary or additional TSO: ${CURSOR()}
                Customer phone: ${CURSOR(REPLACEMENT_START_DELIMITER + "ticket.requester.number" + REPLACEMENT_END_DELIMITER)}
                Customer email: ${CURSOR(REPLACEMENT_START_DELIMITER + "ticket.requester.email" + REPLACEMENT_END_DELIMITER)}
                Customer affiliation: ${CURSOR("Student")}
                Ethernet MAC address of device: ${CURSOR()}
                NetDB status: ${CURSOR("Good")}
                NetDB date last changed: ${CURSOR()}
                NetDB date registered: ${CURSOR()}
                DHCPlog recent history: ${CURSOR()}
            `,
            assignment_group: "UIT IT Operations Center",
            state: STATE.ACTIVE
        },
        ticket_team: TEAM.ESCALATION
    },
    {
        name: "Time Stamps",
        description: "Request timestamps from the customer for a Net Trouble report.",
        fields: {
            additional_comments: `
                Hello ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                If you are still experiencing connection issues, could you please send us three times and dates of exactly when you’ve had trouble, each with a brief description of your activity at the time and how it behaved in a way that was less than desirable? For example:
                
                > ${REPLACEMENT_START_DELIMITER}info.current_date${REPLACEMENT_END_DELIMITER} at ${REPLACEMENT_START_DELIMITER}info.current_time${REPLACEMENT_END_DELIMITER} – Dropped a Zoom Meeting

                Three timestamps in that format should be enough for us to submit a report to the networking team to have them take a look at your device's connection history and figure out what's going on.

                Thank you so much for your continued patience and cooperation while we work to resolve the issue.

                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.ESCALATION
    },
    {
        name: "Wireless Trouble",
        description: "Gives the user instructions for troubleshooting Wi-Fi.",
        fields: {
            additional_comments: `
                Hello ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                Thank you for reporting your trouble with the wireless network connectivity on the Stanford campus. There are some easy steps to take that resolve wireless network issues for most registered devices on campus:

                1. Ensure you have the private address feature disabled on your device. You can find instructions for doing this here: ${REPLACEMENT_START_DELIMITER}link.disable_private_address${REPLACEMENT_END_DELIMITER}.
                2. Forget/remove "Stanford Visitor" and "eduroam" wireless networks from your device. Connect only to the "Stanford" wireless network. You can find instructions for forgetting a Wi-Fi network here: [Mac](${REPLACEMENT_START_DELIMITER}link.forget_wifi.mac${REPLACEMENT_END_DELIMITER}) | [Windows](${REPLACEMENT_START_DELIMITER}link.forget_wifi.windows${REPLACEMENT_END_DELIMITER}) | [iOS](${REPLACEMENT_START_DELIMITER}link.forget_wifi.ios${REPLACEMENT_END_DELIMITER}) | [Android](${REPLACEMENT_START_DELIMITER}link.forget_wifi.android${REPLACEMENT_END_DELIMITER})
                3. Toggle the Wi-Fi on your device off and back on again.
                4. Completely power down and restart your computer or device.

                In the event that these steps don't resolve your wireless trouble, please find your device's MAC address and send it to us so we may begin troubleshooting for you.  Please see the following resource for additional information about finding your MAC address: ${REPLACEMENT_START_DELIMITER}link.mac_address${REPLACEMENT_END_DELIMITER}

                Again, we will require the MAC address of the device that you would like assistance with in order to help you. Thank you for your patience and cooperation.

                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE
    },
    {
        name: "Send Resolved Ticket to Resolution",
        description: "Sends a closing comment to the customer and sends ticket to Resolution.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},
                
                Thank you for letting us know your issue has been resolved. Feel free to reach out again if you run into any issues in the future!

                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            assignment_group: "VPSA LTS Student Technology Services Resolution",
            state: STATE.ACTIVE
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    },
    {
        name: "Register via IPRequest",
        description: "Gives the user step-by-step instructions for registering a device through IPRequest.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                To register your device, you can follow these steps:
                
                1. You'll need to find the device's hardware address (also called its MAC address). Here are instructions for how to do so: ${REPLACEMENT_START_DELIMITER}link.mac_address${REPLACEMENT_END_DELIMITER}.
                2. Once you've found the MAC address for your device, go to ${REPLACEMENT_START_DELIMITER}link.iprequest${REPLACEMENT_END_DELIMITER} on your computer (make sure the computer is already connected to the Stanford network or Stanford's VPN, as the website will not load otherwise).
                3. Fill out the short questionnaire and continue to your registrations.
                4. Click the **New Registration** button at the bottom.
                5. Continue through the terms and conditions until it asks whether the computer you are currently staring at is the one you want to register. Select **No**.
                6. From the Device Type list, choose your device, or **Other** if it is not listed.
                7. For the Operating System, choose **Other (Wired)** if you plan on connecting your device via an ethernet cable, or **Other (Gaming)** if you plan on connecting it via Wi-Fi (even if your device is not going to be used for gaming).
                8. Under Hardware Address, copy and paste the MAC address you found in Step 1.
                9. Continue through the registration, filling out any details it asks for.
                10. Once registered, your device should be able to connect to the internet within about 20 minutes. It's best to unplug it for about two minutes and plug it back in to give it the best chance of seeing the new changes on the system.
                
                Please let us know if you have any questions or issues.
                
                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE
    },
    {
        name: "Register Router",
        description: "Gives the user step-by-step instructions for setting up a router.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                Please follow the steps below for setting up your own router:
                
                1. Purchase a router. Most major router brands (e.g. TP-Link, NETGEAR, ASUS, Linksys, Google, etc.) should do, so feel free to choose one that best suits your needs and price point.
                2. Once you have the router, look for its MAC address, which is usually printed on the side. It should be 12 alphanumeric digits in the form of \`A1:B2:C3:D4:E5:F6\`.
                3. Once you've found the MAC address, go to ${REPLACEMENT_START_DELIMITER}link.iprequest${REPLACEMENT_END_DELIMITER} on your computer (make sure the computer you're using is connected to the Stanford network, **not** the router's network).
                4. Fill out the short questionnaire and continue to your registrations.
                5. Click the **New Registration** button at the bottom.
                6. Continue through the terms and conditions until it asks whether the computer you are currently staring at is the one you want to register. Select **No**.
                7. From the Device Type list, choose **Other** if it is not listed.
                8. For the Operating System, choose **Other (Wired)**.
                9. Under Hardware Address, copy and paste the MAC address you found in Step 2.
                9. Continue through the registration, filling out any details it asks for.
                10. Once registered, please unplug the router for at least two minutes, as routers tend to not want to update their settings unless they remain unplugged for a bit of time. After 20 or so minutes, your router should be able to connect to the internet, allowing you to connect other devices to the router's network.
                
                Please let us know if you have any questions or issues.
                
                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    },
    {
        name: "Check In #1",
        description: "Asks the user for an update after not answering.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},
                
                Just wanted to check in and see if you were able to solve your issue or if you required further assistance? Please let us know so we can close this ticket or continue troubleshooting if necessary. 
                
                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    },
    {
        name: "Check In #2",
        description: "Asks the user for an update again if they didn't answer Check In #1.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                This is our second attempt to reach out in regards to your issue. Please let us know if your issue has been resolved or if you're still experiencing problems. If so, we can continue to troubleshoot. Otherwise, we can go ahead and close this ticket for now.

                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    },
    {
        name: "Close Stale Ticket",
        description: "Sends an old ticket to resolution if the user didn't answer Check In #1 and #2.",
        fields: {
            work_notes: `
                No follow up after a while. Sending to resolution.
            `,
            assignment_group: "VPSA LTS Student Technology Services Resolution",
            state: STATE.ACTIVE
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    },
    {
        name: "Upgrade to Windows 10 Education",
        description: "Gives the user step-by-step instructions for upgrading to Windows 10 Education.",
        fields: {
            additional_comments: `
                Hello ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                You can upgrade your version of Windows 10 to Windows 10 Education (which is compatible with Stanford's encryption software and BitLocker) by following these steps:
                
                1. Go to [Stanford's Software Licensing Webstore](https://stanford.onthehub.com/WebStore/OfferingDetails.aspx?o=bb702eb6-cbf8-e811-810d-000d3af41938) to get your free product key of Windows 10 Education (one per student).
                2. Right click the **Start Menu** from your desktop.
                3. Select **System**.
                4. Click **Change product key**.
                5. Copy & paste the 25-digit license key from step 1.
                6. Allow the system to reboot (may take 5–10 minutes).
                
                Hope this helps. Lets us know if you have any questions or issues.
                
                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE
    },
    {
        name: "Excessive DNS Check In",
        description: "Asks the user about excessive DNS queries being generated by their devices.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},

                UIT has informed us that one of your devices ${CURSOR(`<!-- optionally provide more information like the MAC address here  -->`)} has been generating excessive DNS queries. Would you happen to have any idea why that might be happening? This can usually be caused by doing something out of the ordinary like running a server on the computer, downloading a large data set, etc. Using your computer as normal for tasks like Zoom, browsing the internet, etc. generally shouldn't have any issues. If you are aware of your computer recently doing anything out of the ordinary, please let us know so we know that this was a one-time occurrence. Otherwise, we can go ahead and make a small change on our end to make sure this issue is resolved in the future (and this shouldn't have any noticeable effect on your computer), but we just wanted to reach out to let you know and inquire as to whether you know of why that might be happening before making that change.

                Please let us know if you have questions or issues. 

                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.ESCALATION
    },
    {
        name: "2.4 GHz-Only Devices",
        description: "Explains what to do for devices that only work on 2.4 a GHz band.",
        fields: {
            additional_comments: `
                Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},
                
                It looks like that the kind of device you want to use only works on a 2.4 GHz band, which Stanford's network is not currently set up to provide in the way at-home Wi-Fi routers do. You can read more about unsupported devices here: https://stanford.service-now.com/student_services?id=kb_article&sys_id=fb9174068746f850d9e07778cebb35d1.
                
                While your device won't be able to connect to Stanford's network, you have two options:
                
                1. Buy another device that does work with both 2.4 GHz and 5 GHz bands (which may or may not exist since many devices, especially "smart home" devices, are made for exactly that: homes with a private Wi-Fi network, not campuses with enterprise-grade Wi-Fi networks). If buying online such as from Amazon, make sure to look at comments and reviews to verify that the device does in fact work on both 2.4 GHz and 5 GHz bands.
                2. Set up your own router. You can purchase your own router and get it connected to the Stanford network, and the router should be able to broadcast both 2.4 GHz and 5 GHz bands correctly for the device to connect to. We can guide you through the process of setting up your router if you choose to go this route.
                
                Please let us know if you have questions or issues.
                
                Best,
                ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
            `,
            state: STATE.PENDING
        },
        ticket_team: TEAM.TRIAGE | TEAM.ESCALATION
    }
];

module.exports.MACROS = MACROS;

module.exports.init = function() {
    addToSubBar(function(textarea) {
        const macroBtn = document.createElement("button");
        macroBtn.innerText = "Apply Macro";
        macroBtn.classList.add("btn", "btn-default");
        macroBtn.addEventListener("click", function(e) {
            e.preventDefault();
            toggleMacroDisplay(true);
        });
        return macroBtn;
    });

    // Make the macro elements and add them to the document.
    const backdrop = document.createElement("div");
    backdrop.classList.add("modal-backdrop", "in", "stacked");
    backdrop.style.display = "none";
    window.top.document.body.appendChild(backdrop);

    const modalRoot = document.createElement("div");
    modalRoot.classList.add("modal", "in", "settinngs-modal");
    modalRoot.role = "dialog";
    // This is taken from ServiceNow's #settings_modal, with some modifications.
    modalRoot.innerHTML = `
        <div class="modal-dialog modal-lg ng-scope compact">
            <div class="modal-content">
                <div class="modal-body clearfix" style="min-height:50vmin">
                    <div class="tab-aside col-sm-8" id="${CSS_PREFIX}-macro-list-panel">
                        <header class="modal-header clearfix">Macros</header>
                        <div class="settings-tabs">
                            <div class="sn-aside sn-aside_left sn-aside_min-width">
                                <div class="sn-aside-body ${CSS_PREFIX}-macro-list-flex">
                                    <div id="${CSS_PREFIX}-macro-search-container" class="modal-header">
                                        <input id="${CSS_PREFIX}-macro-search" placeholder="Filter macros" class="form-control">
                                    </div>
                                    <div class="sn-widget-list_v2" role="tablist" aria-label="List of macros" id="${CSS_PREFIX}-macro-list"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content col-sm-4" id="${CSS_PREFIX}-macro-preview-panel">
                        <header class="modal-header clearfix">
                            <div class="modal-header-right"></div>
                            <div class="modal-header-center">
                                <h4 class="modal-title text-center" id="${CSS_PREFIX}-macros_modal_panel_header">Preview</h4>
                            </div>
                            <div class="modal-header-left">
                                <button class="btn close icon-cross" id="${CSS_PREFIX}-dismiss-icon">
                                    <span class="sr-only">Close</span>
                                </button>
                            </div>
                        </header>
                        <div class="form-horizontal view-stack settings-tab-panels" aria-labelledby="${CSS_PREFIX}-macros_modal_panel_header">
                            <div class="tab-pane view-stack-item" role="tabpanel" aria-labelledby="${CSS_PREFIX}-macros_modal_panel_header" id="${CSS_PREFIX}-macros_modal_preview-body"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <i class="focus-trap-boundary-south" tabindex="0"></i>
    `;

    const leftPanel = modalRoot.querySelector(`#${CSS_PREFIX}-macro-list-panel`);
    const rightPanel = modalRoot.querySelector(`#${CSS_PREFIX}-macro-preview-panel`);
    const macroList = modalRoot.querySelector(`#${CSS_PREFIX}-macro-list`);
    const previewBody = modalRoot.querySelector(`#${CSS_PREFIX}-macros_modal_preview-body`);
    const modalHeader = modalRoot.querySelector(`#${CSS_PREFIX}-macros_modal_panel_header`);
    const macroSearch = modalRoot.querySelector(`#${CSS_PREFIX}-macro-search`);

    const shownMacros = [];

    macroSearch.addEventListener("input", function (e) {
        e.stopPropagation();
        populateMacros();
    });

    macroSearch.addEventListener("keydown", function(e) {
        if (shownMacros.length  == 0) {
            return;
        }
        if (e.code == "Enter") {
            e.preventDefault();
            e.stopPropagation();
            applyMacro(shownMacros[0]);
        } else if (e.code == "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            focusMacroItem(0);
        } else if (e.code == "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
            focusMacroItem(shownMacros.length - 1);
        }
    });

    macroSearch.addEventListener("focus", function () {
        focusMacroItem(-1);
    });

    modalRoot.querySelector(`#${CSS_PREFIX}-dismiss-icon`).addEventListener("click", function (e) {
        e.preventDefault();
        toggleMacroDisplay(false);
    });

    modalRoot.style.display = "none";
    window.top.document.body.appendChild(modalRoot);
    modalRoot.addEventListener("click", function (e) {
        if (e.target !== e.currentTarget) {
            return;
        }
        e.preventDefault();
        toggleMacroDisplay(false);
    });
    modalRoot.id = `${CSS_PREFIX}-macros_modal`;

    function closeModalOnEscape(e) {
        if (e.code == "Escape") {
            e.preventDefault();
            e.stopPropagation();
            toggleMacroDisplay(false);
        }
    }

    function toggleMacroDisplay(value) {
        if (value) {
            macroSearch.value = "";
            populateMacros();
            leftPanel.classList.replace("col-sm-4", "col-sm-8");
            rightPanel.classList.replace("col-sm-8", "col-sm-4");
            backdrop.style.display = "block";
            modalRoot.style.display = "block";
            macroSearch.focus();
            events.trigger("show_macro_modal");
            document.addEventListener("keydown", closeModalOnEscape);
            window.top.document.addEventListener("keydown", closeModalOnEscape);
        } else {
            backdrop.style.display = "none";
            modalRoot.style.display = "none";
            events.trigger("hide_macro_modal");
            document.removeEventListener("keydown", closeModalOnEscape);
            window.top.document.removeEventListener("keydown", closeModalOnEscape);
        }
    }

    function populateMacros() {
        macroList.innerText = "";
        shownMacros.length = 0;

        // Get the assignment group for this ticket to determine which macros we should show.
        const assignmentGroupInput = document.getElementById("sys_display.sc_task.assignment_group") ||
            document.getElementById("sys_display.incident.assignment_group") ||
            document.getElementById("sys_display.ticket.assignment_group");
        let filterGroup = TEAM.TRIAGE | TEAM.ESCALATION | TEAM.RESOLUTION;
        if (assignmentGroupInput) {
            filterGroup = ({
                "VPSA LTS Student Technology Services Triage": TEAM.TRIAGE,
                "VPSA LTS Student Technology Services Escalation": TEAM.ESCALATION,
                "VPSA LTS Student Technology Services Resolution": TEAM.RESOLUTION
            })[assignmentGroupInput.value] || filterGroup;
        }

        const searchWords = macroSearch.value.toLowerCase().split(/[^a-z\d]+/);
        if (searchWords[0] == "") {
            searchWords.shift();
        }

        let doneMacros = 0;
        for (let i = 0; i < MACROS.length; i++) {
            const macro = MACROS[i];

            if (!(macro.ticket_team & filterGroup)) continue;

            if (searchWords.length) {
                let doesntMatch = false;
                for (const word of searchWords) {
                    if (!macro.name.toLowerCase().includes(word) && !macro.description.toLowerCase().includes(word)) {
                        doesntMatch = true;
                        break;
                    }
                }
                if (doesntMatch) continue;
            }

            shownMacros.push(macro);

            const macroTab = document.createElement("span");
            macroTab.role = "tab";
            macroTab.classList.add("sn-widget-list-item");
            macroTab.tabIndex = 0;
            macroTab.innerHTML = `
                <div class="sn-widget-list-content">
                    <span class="sn-widget-list-title">
                        ${escapeHTML(macro.name)}
                        <span class="sn-widget-list-subtitle">${macro.description}</span>
                    </span>
                </div>
                <div class="sn-widget-list-content sn-widget-list-content_static">
                    <div class="sn-widget-list-image icon-preview"></div>
                </div>
            `;
            macroTab.setAttribute(`data-${CSS_PREFIX}-visible-macro-index`, doneMacros++);
            macroTab.setAttribute(`data-${CSS_PREFIX}-macro-index`, i);

            macroTab.lastElementChild.addEventListener("mousedown", function(e) {
                e.stopPropagation();
            });

            macroTab.lastElementChild.addEventListener("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                focusMacroItem(+e.currentTarget.parentNode.getAttribute(`data-${CSS_PREFIX}-visible-macro-index`));
            });

            macroTab.lastElementChild.addEventListener("keydown", function(e) {
                if (e.code == "Enter" || e.code == "Space") {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.click();
                }
            });

            macroTab.addEventListener("keydown", function(e) {
                const index = +e.currentTarget.getAttribute(`data-${CSS_PREFIX}-visible-macro-index`);
                if (e.code == "ArrowUp") {
                    e.preventDefault();
                    e.stopPropagation();
                    if (index > 0) {
                        focusMacroItem(index - 1);
                    } else {
                        macroSearch.focus();
                    }
                } else if (e.code == "ArrowDown") {
                    e.preventDefault();
                    e.stopPropagation();
                    if (index < macroList.children.length - 1) {
                        focusMacroItem(index + 1);
                    } else {
                        macroSearch.focus();
                    }
                } else if (e.code == "Enter" || e.code == "Space") {
                    e.preventDefault();
                    e.stopPropagation();
                    clickTab(e);
                }
            });

            function clickTab(e) {
                e.preventDefault();
                e.stopPropagation();
                applyMacro(MACROS[+e.currentTarget.getAttribute(`data-${CSS_PREFIX}-macro-index`)]);
            }

            macroTab.addEventListener("mousedown", clickTab);
            macroTab.addEventListener("click", clickTab);

            macroTab.addEventListener("focus", function(e) {
                focusMacroItem(+e.currentTarget.getAttribute(`data-${CSS_PREFIX}-visible-macro-index`));
            });

            macroList.appendChild(macroTab);
        }

        events.trigger("populate_macros_tablist");

        focusMacroItem(-1);
    }

    function focusMacroItem(index) {
        for (const child of macroList.children) {
            child.classList.remove("state-active");
            child.ariaSelected = false;
        }
        if (index < 0 || index >= macroList.children.length) {
            leftPanel.classList.replace("col-sm-4", "col-sm-8");
            rightPanel.classList.replace("col-sm-8", "col-sm-4");
            previewBody.innerText = "";
            modalHeader.innerText = "Preview";
        } else {
            leftPanel.classList.replace("col-sm-8", "col-sm-4");
            rightPanel.classList.replace("col-sm-4", "col-sm-8");

            const focused = macroList.children[index];
            if (document.activeElement != focused) focused.focus();
            focused.classList.add("state-active");
            focused.ariaSelected = true;

            const macro = MACROS[+focused.getAttribute(`data-${CSS_PREFIX}-macro-index`)];

            modalHeader.innerText = escapeHTML(macro.name);

            previewBody.innerHTML = `
                <div class="${CSS_PREFIX}-preview-header">
                    <button class="${CSS_PREFIX}-back-button btn close icon-arrow-left" style="float: none">
                        <span class="sr-only">Back</span>
                    </button>
                </div>
                <div id="${CSS_PREFIX}-preview-fields"></div>
            `;
            previewBody.firstElementChild.firstElementChild.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                focusMacroItem(-1);
            });

            const fieldsContainer = previewBody.firstElementChild.nextElementSibling;

            const fields = Object.keys(macro.fields);
            let fieldsIndex;

            // Make sure Additional Comments and Work Notes shows up first.
            if (~(fieldsIndex = fields.indexOf("work_notes"))) {
                fields.splice(fieldsIndex, 1);
                fields.unshift("work_notes");
            }
            if (~(fieldsIndex = fields.indexOf("additional_comments"))) {
                fields.splice(fieldsIndex, 1);
                fields.unshift("additional_comments");
            }

            // Go through the fields that would be changed.
            for (const field of fields) {
                // Make sure this is a recognized field, and translate the name into a more readable
                // form.

                const fieldName = ({
                    additional_comments: "Additional Comments (Customer Visible)",
                    work_notes: "Work Notes",
                    assignment_group: "Assignment Group",
                    state: "State"
                })[field] || null;

                if (fieldName === null) {
                    continue;
                }

                let fieldValue = null;

                if (fieldName == "State") {
                    // If we are changing the state of the ticket, the associated value is a Symbol
                    // that we have to translate into a string.
                    const elements = [
                        document.getElementById("incident.state"),
                        document.getElementById("ticket.state"),
                        document.getElementById("sc_task.state")
                    ].filter(elem => elem);

                    if (elements.length != 1) {
                        continue;
                    }
                    const options = elements[0].children;

                    const translatedStates = {
                        [Symbol.for("STATE.NEW")]: ["New", "Open"],
                        [Symbol.for("STATE.ACTIVE")]: ["Active", "Open"],
                        [Symbol.for("STATE.PENDING")]: ["Awaiting User Info", "Hold - Awaiting user information", "Pending"],
                        [Symbol.for("STATE.RESOLVED")]: ["Resolved", "Closed Complete"]
                    }[macro.fields[field]] || [];

                    let newState = null;
                    for (const state of translatedStates) {
                        for (const option of options) {
                            if (option.innerText == state) {
                                newState = option.innerText;
                                break;
                            }
                        }
                        if (newState) break;
                    }

                    if (!newState) {
                        continue;
                    }

                    fieldValue = newState;
                } else {
                    // Get the value that would be replaced.
                    let value = macro.fields[field];
                    if (typeof value == "function") {
                        value = value();
                        if (value === null) {
                            continue;
                        } else {
                            value = dedent(value + "");
                        }
                    } else {
                        value = dedent(value + "");
                    }

                    // Resolve any replacements
                    let [replacedValue, caretPositions] = resolveReplacements(value, value.length);

                    // If there's only one caret position, and it's at the end, we don't want to show it
                    // since that's not significant.
                    if (caretPositions.length == 1 && caretPositions[0][0] == caretPositions[0][1] & caretPositions[0][0] == replacedValue.length) {
                        caretPositions = [];
                    } else {
                        // Replace any caret positions with a special <span> that will show caret positions.
                        // Also escape any HTML in between these <span>s.
                        for (let i = caretPositions.length - 1; i >= 0; i--) {
                            replacedValue =
                                replacedValue.substring(0, caretPositions[i][0]) +
                                `<span class="${CSS_PREFIX}-caret-position-span ${CSS_PREFIX}-span-${caretPositions[i][0] == caretPositions[i][1] ? "empty" : "full"}"><span></span><span></span><span>` +
                                escapeHTML(replacedValue.substring(caretPositions[i][0], caretPositions[i][1])) +
                                "</span></span>" +
                                escapeHTML(replacedValue.substring(caretPositions[i][1], i == caretPositions.length - 1 ? replacedValue.length : caretPositions[i + 1][0])) +
                                replacedValue.substring(i == caretPositions.length - 1 ? replacedValue.length : caretPositions[i + 1][0]);
                        }
                        replacedValue = escapeHTML(replacedValue.substring(0, caretPositions[0][0])) + replacedValue.substring(caretPositions[0][0]);
                    }

                    fieldValue = replacedValue;
                }

                // Now make the element that will display this field value.
                const container = document.createElement("div");
                container.classList.add(`${CSS_PREFIX}-preview-field-container`);
                container.innerHTML = `
                        <div>${fieldName}</div>
                        <div class="${CSS_PREFIX}-preview-field-value ${field == "work_notes" ? `${CSS_PREFIX}-preview-work_notes-value` : ""} form-control">${fieldValue}</div>
                    `;
                fieldsContainer.appendChild(container);
            }

            events.trigger("focus_macro_tab", macro, focused);
        }
    }

    function applyMacro(macro) {
        // Hide the macro modal.
        toggleMacroDisplay(false);

        // Get a list of fields we want to change.
        const fields = Object.keys(macro.fields);

        // If we want to show both additional comments and work notes, we may have to toggle the
        // view for both.
        if ("additional_comments" in macro.fields && "work_notes" in macro.fields) {
            const showAll = document.querySelector("#single-input-journal-entry button.icon-stream-all-input");
            if (showAll) showAll.click();
        } else if (
            ("additional_comments" in macro.fields && document.querySelector("#activity-stream-textarea:not([aria-label*='Additional comments'])")) ||
            ("work_notes" in macro.fields && document.querySelector("#activity-stream-textarea:not([aria-label*='Work notes'])"))
        ) {
            const checkbox = document.querySelector(".sn-controls.row .pull-right input[type='checkbox'][name='work_notes-journal-checkbox'], .sn-controls.row .pull-right input[type='checkbox'][name='comments-journal-checkbox']");
            if (checkbox) checkbox.click();
        }

        // Move work_notes and additional_comments to the end so that the textareas are focused when
        // we're done applying the macro.
        if ("work_notes" in macro.fields) {
            fields.splice(fields.indexOf("work_notes"), 1);
            fields.push("work_notes");
        }
        if ("additional_comments" in macro.fields) {
            fields.splice(fields.indexOf("additional_comments"), 1);
            fields.push("additional_comments");
        }

        // Go through the fields we recognize and perform their action.
        for (const key of fields) {
            let value;
            if (typeof macro.fields[key] == "function") {
                const returnValue = macro.fields[key]();
                if (returnValue === null) {
                    continue;
                }
                value = dedent(returnValue + "");
            } else {
                value = typeof macro.fields[key] == "symbol" ? macro.fields[key] : dedent(macro.fields[key] + "");
            }

            const [replacedValue, caretPositions] = typeof value == "symbol" ? [value, null] : resolveReplacements(value, value.length);

            if (key == "additional_comments") {
                const elements = [
                    document.getElementById("incident.comments"),
                    document.getElementById("ticket.comments"),
                    document.getElementById("activity-stream-comments-textarea"),
                    document.querySelector("#activity-stream-textarea[aria-label*='Additional comments']"),
                    document.getElementById("sc_task.parent.comments")
                ];

                // Go through the elements and look for any that are not visible (i.e., have an
                // offsetParent). We want to replace the value of all these, but leave the visible
                // textarea(s) for last so that they are focused.
                const visible = [];
                for (const element of elements) {
                    if (!element || element.nodeName != "TEXTAREA" || !textareaData.get(element)) {
                        continue;
                    }
                    if (element.offsetParent) {
                        visible.push(element);
                    } else {
                        replaceTextareaValue(textareaData.get(element), replacedValue, caretPositions);
                    }
                }

                // Now we can go through any visible textarea(s) to replace their value.
                for (const textarea of visible) {
                    replaceTextareaValue(textareaData.get(textarea), replacedValue, caretPositions);
                }
            } else if (key == "work_notes") {
                // Do the same as above for additional_comments.
                const elements = [
                    document.getElementById("incident.work_notes"),
                    document.getElementById("ticket.work_notes"),
                    document.getElementById("activity-stream-work_notes-textarea"),
                    document.querySelector("#activity-stream-textarea[aria-label*='Work notes']")
                ];

                const visible = [];
                for (const element of elements) {
                    if (!element || element.nodeName != "TEXTAREA" || !textareaData.get(element)) {
                        continue;
                    }
                    if (element.offsetParent) {
                        visible.push(element);
                    } else {
                        replaceTextareaValue(textareaData.get(element), replacedValue, caretPositions);
                    }
                }

                for (const textarea of visible) {
                    replaceTextareaValue(textareaData.get(textarea), replacedValue, caretPositions);
                }
            } else if (key == "assignment_group") {
                // Here, we do the same as for above, but instead of textareas, it'll be inputs. We
                // don't care about caret positions here, just replacing the value.
                const elements = [
                    document.getElementById("sys_display.sc_task.assignment_group"),
                    document.getElementById("sys_display.incident.assignment_group"),
                    document.getElementById("sys_display.ticket.assignment_group")
                ];

                for (const element of elements) {
                    if (!element) {
                        continue;
                    }

                    setAssignmentGroup(element, replacedValue);
                }
            } else if (key == "state") {
                // Here, we do the same as for above, but instead of textareas, it'll be inputs. We
                // don't care about caret positions here, just replacing the value.
                const elements = [
                    document.getElementById("incident.state"),
                    document.getElementById("ticket.state"),
                    document.getElementById("sc_task.state")
                ];

                for (const element of elements) {
                    if (!element) {
                        continue;
                    }

                    setState(element, value);
                }
            }
        }

        events.trigger("apply_macro", macro);
    }
}