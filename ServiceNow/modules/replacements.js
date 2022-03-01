const { REPLACEMENT_START_DELIMITER, REPLACEMENT_END_DELIMITER, CSS_PREFIX, AUTOFILL_REPLACEMENT, REPLACEMENT_MAX_RECURSION_DEPTH, CURSOR, CURSOR_REGEX } = require("./constants.js");
const { escapeHTML, dedent, replaceTextareaValue } = require("./helpers.js");
const { textareaData, addTextareaData, addTextareaCallback } = require("./textareas.js");
const events = require("./events.js");

const REPLACEMENTS = [
    {triggers:["test"],value:`| ${CURSOR("foo")} | ${CURSOR("bar")} |`,autoFillerVisibility:true},
    {
        triggers: [
            ""
        ],
        value: `
            Hi ${REPLACEMENT_START_DELIMITER}ticket.requester.name.first${REPLACEMENT_END_DELIMITER},
            
            ${CURSOR()}
            
            Please let us know if you have questions or issues.
            
            Best,
            ${REPLACEMENT_START_DELIMITER}current_user.name.first${REPLACEMENT_END_DELIMITER}
        `,
        autoFillerVisibility: false
    },
    {
        triggers: [
            "ticket.requester.name.first",
            "ticket.requester.first_name"
        ],
        value: _ => {
            let input = document.getElementById("sys_display.ticket.u_requested_for") ||
                document.getElementById("sys_display.incident.u_requested_for") ||
                document.getElementById("sc_task.request_item.requested_for_label");
            if (input) {
                let index = input.value.indexOf(" ");
                return ~index ? input.value.substring(0, index) : input.value;
            }
            return null;
        },
        description: "The requester's first name",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "ticket.requester.name.full",
            "ticket.requester.full_name",
            "ticket.requester.name",
        ],
        value: _ => {
            let input = document.getElementById("sys_display.ticket.u_requested_for") ||
                document.getElementById("sys_display.incident.u_requested_for") ||
                document.getElementById("sc_task.request_item.requested_for_label");
            if (input) {
                return input.value;
            }
            return null;
        },
        description: "The requester's full name",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "ticket.requester.email"
        ],
        value: _ => {
            let input = document.getElementById("ticket.u_guest_email") ||
                document.getElementById("incident.u_guest_email") ||
                document.getElementById("sys_readonly.sc_task.request_item.u_email");
            if (input) {
                return input.value;
            }
            return null;
        },
        description: "The requester's email address",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "ticket.requester.number",
            "ticket.requester.phone",
            "ticket.requester.phone_number"
        ],
        value: _ => {
            let input = document.getElementById("ticket.u_phone_number") ||
                document.getElementById("incident.u_phone_number") ||
                document.getElementById("sys_readonly.sc_task.request_item.u_phone_number");
            if (input) {
                let number = input.value.replace(/\D/g, "");
                if (number.length == 10) {
                    return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6, 10)}`;
                } else {
                    return input.value;
                }
            }
            return null;
        },
        description: "The requester's phone number",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "ticket.number",
            "ticket.id"
        ],
        value: _ => {
            let input = document.getElementById("sys_readonly.ticket.number") ||
                document.getElementById("sys_readonly.incident.number") ||
                document.getElementById("sys_readonly.sc_task.number");
            if (input) {
                return input.value;
            }
            return null;
        },
        description: "The ticket's number",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "ticket.title",
            "ticket.name",
            "ticket.description",
            "ticket.short_description"
        ],
        value: _ => {
            let input = document.getElementById("ticket.short_description") ||
                document.getElementById("incident.short_description") ||
                document.getElementById("sc_task.short_description");
            if (input) {
                return input.value;
            }
            return null;
        },
        description: "The ticket's title",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "current_user.name.first",
            "current_user.first_name"
        ],
        value: _ => {
            let name = window.NOW?.user?.firstName || null;
            if (typeof name == "string") {
                return name;
            }
            name = window.NOW?.user_display_name || null;
            if (!name) {
                let elem = document.querySelector("[id*='add_me'][data-user]");
                if (elem) {
                    name = elem.getAttribute("data-name");
                }
            }
            if (typeof name == "string") {
                let index = name.indexOf(" ");
                return ~index ? name.substring(0, index) : name;
            }
            return null;
        },
        description: "Your first name",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "current_user.name.full",
            "current_user.full_name",
            "current_user.name"
        ],
        value: _ => {
            let name = window.NOW?.user_display_name || null;
            if (!name) {
                let elem = document.querySelector("[id*='add_me'][data-user]");
                if (elem) {
                    name = elem.getAttribute("data-name");
                }
            }
            return typeof name == "string" ? name : null;
        },
        description: "Your full name",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "current_user.email"
        ],
        value: _ => {
            return window.NOW ? window.NOW.user_email || null : null;
        },
        description: "Your email address",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "info.current_date",
            "info.today"
        ],
        value: _ => {
            const now = new Date();
            const month = now.getMonth() + 1 + "";
            const day = now.getDate() + "";
            const year = now.getFullYear() + "";
            return `${("00" + month).substring(month.length)}/${("00" + day).substring(day.length)}/${year}`;
        },
        description: "Today's date as MM/DD/YYYY",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "info.current_time"
        ],
        value: _ => {
            const now = new Date();
            const hour = now.getHours() + "";
            const min = now.getMinutes() + "";
            return `${(hour <= 12 ? hour || 12 : hour - 12)}:${("00" + min).substring(min.length)} ${hour < 12 ? "AM" : "PM"}`
        },
        description: "The current time as HH:MM AM/PM",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.mac_address",
            "link.macaddress",
            "link.mac"
        ],
        value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018475\n`,
        description: "Link for finding MAC addresses",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.mydevices",
            "link.my_devices"
        ],
        value: `https://mydevices.stanford.edu`,
        description: "Link to MyDevices page",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.iprequest"
        ],
        value: `https://iprequest.stanford.edu`,
        description: "Link to IPRequest page",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.snsr"
        ],
        value: `https://snsr.stanford.edu`,
        description: "Link to SNSR download page",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.mdm"
        ],
        value: `https://uit.stanford.edu/service/mobiledevice/management`,
        description: "Link to MDM page for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.mdm.ios",
            "link.mdm.iphone"
        ],
        value: `https://uit.stanford.edu/service/mobiledevice/management/enroll_ios`,
        description: "Link to MDM page for iOS devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.mdm.android"
        ],
        value: `https://uit.stanford.edu/service/mobiledevice/management/enroll_android`,
        description: "Link to MDM page for Android devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.swde"
        ],
        value: `https://uit.stanford.edu/service/encryption/wholedisk`,
        description: "Link to SWDE page for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.swde.mac",
            "link.swde.macbook",
            "link.swde.macos",
            "link.swde.osx"
        ],
        value: `https://uit.stanford.edu/service/encryption/wholedisk/install_mac`,
        description: "Link to SWDE page for MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.swde.windows",
            "link.swde.pc"
        ],
        value: `https://uit.stanford.edu/service/encryption/wholedisk/install_windows`,
        description: "Link to SWDE page for Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.bigfix",
            "link.big_fix"
        ],
        value: `https://uit.stanford.edu/software/bigfix`,
        description: "Link to BigFix page for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.vpn"
        ],
        value: `https://uit.stanford.edu/service/vpn`,
        description: "Link to Stanford VPN page for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.vpn.mac",
            "link.vpn.macbook",
            "link.vpn.macos",
            "link.vpn.osx"
        ],
        value: `https://web.stanford.edu/dept/its/support/vpn/installers/InstallAnyConnect.pkg`,
        description: "Link to download VPN for MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.vpn.windows",
            "link.vpn.pc"
        ],
        value: `https://web.stanford.edu/dept/its/support/vpn/installers/InstallAnyConnect.exe`,
        description: "Link to download VPN for Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.vlre"
        ],
        value: `https://uit.stanford.edu/service/vlre`,
        description: "Link to download VLRE for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.vlre.mac",
            "link.vlre.macbook",
            "link.vlre.macos",
            "link.vlre.osx"
        ],
        value: `https://uit.stanford.edu/service/vlre/mac`,
        description: "Link to download VLRE for MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.vlre.windows",
            "link.vlre.pc"
        ],
        value: `https://uit.stanford.edu/service/vlre/windows`,
        description: "Link to download VLRE for Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.cardinal_key",
            "link.cardinalkey"
        ],
        value: `https://uit.stanford.edu/service/cardinalkey/installation`,
        description: "Link to download Cardinal Key for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.cardinal_key.mac",
            "link.cardinal_key.macbook",
            "link.cardinal_key.macos",
            "link.cardinal_key.osx",
            "link.cardinalkey.mac",
            "link.cardinalkey.macbook",
            "link.cardinalkey.macos",
            "link.cardinalkey.osx"
        ],
        value: `https://uit.stanford.edu/service/cardinalkey/installation#macos`,
        description: "Link to download Cardinal Key for MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.cardinal_key.windows",
            "link.cardinal_key.pc",
            "link.cardinalkey.windows",
            "link.cardinalkey.pc"
        ],
        value: `https://uit.stanford.edu/service/cardinalkey/installation##windows`,
        description: "Link to download Cardinal Key for Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.cardinal_key.ios",
            "link.cardinal_key.iphone"
        ],
        value: `https://uit.stanford.edu/service/cardinalkey/install_ios`,
        description: "Link to download Cardinal Key for iPhones/iPads",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.ssrt"
        ],
        value: `https://uit.stanford.edu/software/ssrt`,
        description: "Link to download SSRT for all devices",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.ssrt.mac",
            "link.ssrt.macbook",
            "link.ssrt.macos",
            "link.ssrt.osx"
        ],
        value: `https://web.stanford.edu/dept/its/support/ess/mac/unrestricted/SSRT.pkg`,
        description: "Link to download SSRT for MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.ssrt.windows",
            "link.ssrt.pc"
        ],
        value: `https://web.stanford.edu/dept/its/support/ess/pc/unrestricted/RunSSRT.exe`,
        description: "Link to download SSRT for Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.appointment",
            "link.book_appointment"
        ],
        value: `https://bit.ly/bookPTSappt`,
        description: "Link to book appointments with PTS",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.forget_wifi.mac",
            "link.forget_wifi.macbook",
            "link.forget_wifi.macos",
            "link.forget_wifi.osx"
        ],
        value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018430`,
        description: "Link to instructions for forgetting Wi-Fi networks on MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.forget_wifi.windows",
            "link.forget_wifi.pc",
        ],
        value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018429`,
        description: "Link to instructions for forgetting Wi-Fi networks on Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.forget_wifi.ios",
            "link.forget_wifi.iphone",
        ],
        value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018427`,
        description: "Link to instructions for forgetting Wi-Fi networks on iPhones",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.forget_wifi.android"
        ],
        value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018428`,
        description: "Link to instructions for forgetting Wi-Fi networks on Android phones",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.disable_private_address",
            "link.disable_private_mac_address",
            "link.disable_random_address",
            "link.disable_random_mac_address"
        ],
        value: `https://stanford.service-now.com/student_services?id=kb_article&sys_id=6126c5ca1b067c5098a05425604bcbb6`,
        description: "Link to instructions for disabling a randomized MAC address",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.gsb_registration"
        ],
        value: `http://gsbentreg.stanford.edu/`,
        description: "Link to GSB's device registration Google form.",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.enrollment_quiz",
            "link.enrollment_questionnaire",
            "link.enrollment"
        ],
        value: `https://uit.stanford.edu/service/enrollment`,
        description: "Link to Enrollment Questionnaire page",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.enrollment_quiz.mac",
            "link.enrollment_quiz.macbook",
            "link.enrollment_quiz.macos",
            "link.enrollment_quiz.osx",
            "link.enrollment_questionnaire.mac",
            "link.enrollment_questionnaire.macbook",
            "link.enrollment_questionnaire.macos",
            "link.enrollment_questionnaire.osx",
            "link.enrollment.mac",
            "link.enrollment.macbook",
            "link.enrollment.macos",
            "link.enrollment.osx"
        ],
        value: `https://uit.stanford.edu/service/enrollment/mac`,
        description: "Link to Enrollment Questionnaire for MacBooks",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.enrollment_quiz.windows",
            "link.enrollment_quiz.pc",
            "link.enrollment_questionnaire.windows",
            "link.enrollment_questionnaire.pc",
            "link.enrollment.windows",
            "link.enrollment.pc",
        ],
        value: `https://uit.stanford.edu/service/enrollment/windows`,
        description: "Link to Enrollment Questionnaire for Windows PCs",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "link.enrollment_quiz.mobile",
            "link.enrollment_quiz.ios",
            "link.enrollment_quiz.iphone",
            "link.enrollment_quiz.android",
            "link.enrollment_questionnaire.mobile",
            "link.enrollment_questionnaire.ios",
            "link.enrollment_questionnaire.iphone",
            "link.enrollment_questionnaire.android",
            "link.enrollment.mobile",
            "link.enrollment.ios",
            "link.enrollment.iphone",
            "link.enrollment.android"
        ],
        value: `https://uit.stanford.edu/service/enrollment/mobiledevice`,
        description: "Link to Enrollment Questionnaire for Mobile Device",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "phone_number.pts",
            "phone_number.us",
            "phone_number.ours"
        ],
        value: `(650) 723-9204`,
        description: "Phone number for PTS",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "phone_number.uit",
            "phone_number.helpsu",
            "phone_number.help_su",
            "phone_number.it"
        ],
        value: `(650) 725-4357`,
        description: "Phone number for UIT/HelpSU",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "phone_number.med_school",
            "phone_number.som",
            "phone_number.medical_school"
        ],
        value: `(650) 725-8000`,
        description: "Phone number for SoM IT",
        autoFillerVisibility: true
    },
    {
        triggers: [
            "icon.mydevices.compliant",
            "icon.my_devices.compliant"
        ],
        value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-compliant.svg" alt=""/>[/code]`,
        description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-compliant.svg" alt="green checkmark icon"/>"`,
        autoFillerVisibility: true
    },
    {
        triggers: [
            "icon.mydevices.n/a",
            "icon.mydevices.na",
            "icon.my_devices.n/a",
            "icon.my_devices.na"
        ],
        value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-na.svg" alt=""/>[/code]`,
        description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-na.svg" alt="gray dash icon"/>"`,
        autoFillerVisibility: true
    },
    {
        triggers: [
            "icon.mydevices.not_compliant",
            "icon.mydevices.uncompliant",
            "icon.mydevices.incompliant",
            "icon.mydevices.noncompliant",
            "icon.my_devices.not_compliant",
            "icon.my_devices.uncompliant",
            "icon.my_devices.incompliant",
            "icon.my_devices.noncompliant"
        ],
        value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-not_compliant.svg" alt=""/>[/code]`,
        description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-not_compliant.svg" alt="red X icon"/>"`,
        autoFillerVisibility: true
    },
    {
        triggers: [
            "icon.info",
            "icon.information"
        ],
        value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/info.svg" alt="info icon"/>[/code]`,
        description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/info.svg" alt="circled info icon"/>"`,
        autoFillerVisibility: true
    },
    {
        triggers: [
            "icon.apple",
            "icon.apple_logo",
            "icon.apple_menu"
        ],
        value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/apple.svg" alt="Apple logo"/>[/code]`,
        description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/apple.svg" alt="black Apple logo"/>"`,
        autoFillerVisibility: true
    }
];

module.exports.REPLACEMENTS = REPLACEMENTS;

const namespaces = [
    {
        insert: "link.",
        name: "Links",
        icon: "link"
    },
    {
        insert: "ticket.",
        name: "Ticket Information",
        icon: "list"
    },
    {
        insert: "current_user.",
        name: "Current User Information",
        icon: "user"
    },
    {
        insert: "phone_number.",
        name: "Phone Numbers",
        icon: "phone"
    },
    {
        insert: "info.",
        name: "Additional Information",
        icon: "info"
    },
    {
        insert: "icon.",
        name: "Icons",
        icon: "image"
    }
];

const triggerTranslatedReplacements = {};
for (const replacement of REPLACEMENTS) {
    for (const trigger of replacement.triggers) {
        triggerTranslatedReplacements[trigger.trim().toLowerCase()] = replacement;
    }
    // Dedent any string values so we don't have to do it later.
    if (typeof replacement.value != "function") {
        replacement.value = dedent(replacement.value + "");
    }
}

module.exports.init = function() {
    addTextareaData({
        replacementMirror: function (textarea) {
            const styles = this.elementStyles;
            const mirror = document.createElement("div");
            mirror.classList.add(`${CSS_PREFIX}-textarea-mirror`);
            mirror.style.width =
                textarea.getBoundingClientRect().width -
                parseFloat(styles.paddingLeft) -
                parseFloat(styles.paddingRight) -
                parseFloat(styles.borderLeftWidth) -
                parseFloat(styles.borderRightWidth) + "px";
            mirror.style.fontFamily = styles.fontFamily;
            mirror.style.fontWeight = styles.fontWeight;
            mirror.style.fontStyle = styles.fontStyle;
            mirror.style.fontSize = styles.fontSize;
            mirror.style.lineHeight = styles.lineHeight;
            document.body.appendChild(mirror);
            return mirror;
        },
        replacementAutoFiller: function (textarea) {
            let autoFiller = document.createElement("ul");
            autoFiller.classList.add(`${CSS_PREFIX}-auto-filler`, "h-card", "dropdown-menu");
            autoFiller.style.display = "none";
            textarea.parentNode.appendChild(autoFiller);
            return autoFiller;
        },
        isAutoFillingReplacement: false,
        replacementAutoFillerFocusedIndex: null
    });

    addTextareaCallback(function(data) {
        this.addEventListener("keydown", function(e) {
            if (data.isAutoFillingReplacement) {
                if (e.code == "ArrowDown") {
                    data.replacementAutoFillerFocusedIndex++;
                    focusAutoFillItem(data);
                    e.preventDefault();
                } else if (e.code == "ArrowUp") {
                    data.replacementAutoFillerFocusedIndex--;
                    focusAutoFillItem(data);
                    e.preventDefault();
                } else if (e.code == "Enter" || e.code == "Tab") {
                    data.replacementAutoFiller.children[data.replacementAutoFillerFocusedIndex].click();
                    e.preventDefault();
                }
            }
        });

        this.parentNode.addEventListener("focusout", function (e) {
            if (e.relatedTarget === null || (e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget))) {
                updateAutoFiller(data);
            }
        })
    });

    document.addEventListener("input", function (e) {
        const data = textareaData.get(e.target);
        if (data) {
            updateAutoFiller(data);

            // Evaluate any replacements, as long as we are not suppressing inputs.
            if (!data.suppressInputs) {
                const [updatedValue, updatedCarets] = resolveReplacements(data.element.value, data.element.selectionStart);
                if (updatedValue != data.element.value) {
                    replaceTextareaValue(data, updatedValue, updatedCarets);
                }
            }
        }
    });

    document.addEventListener("selectionchange", function (e) {
        const data = textareaData.get(document.activeElement);
        if (data) {
            updateAutoFiller(data);
        }
    });

    function updateAutoFiller(data) {
        const incompleteTriggerName = getIncompleteTriggerName(data);

        // If we are not currently typing out a macro, we can hide the autoFiller and return.
        if (incompleteTriggerName === null || document.activeElement != data.element) {
            data.replacementAutoFiller.style.display = "none";
            data.isAutoFillingReplacement = false;
            data.replacementAutoFillerFocusedIndex = null;
            events.trigger("hide_auto_filler", data);
            return;
        }

        if (!data.isAutoFillingReplacement) {
            // Otherwise, we want to show the autoFiller and calculate where to show it.
            data.replacementAutoFiller.style.display = "block";
            data.isAutoFillingReplacement = true;
            events.trigger("show_auto_filler", data);
        }

        // Copy the textarea's content to the mirror. We first paste all the text up to the starting
        // delimiter. Then, we insert a <span> with the start delimiter, as well as the word that
        // follows it (i.e., everything up to the next space). Then we calculate the vertical and
        // horizontal position of the span to determine where to place the replacementAutoFiller box.
        const startDelimIndex = data.element.value.lastIndexOf(REPLACEMENT_START_DELIMITER, data.element.selectionStart - REPLACEMENT_START_DELIMITER.length);
        data.replacementMirror.innerText = data.element.value.substring(0, startDelimIndex);
        const caret = document.createElement("span");
        const spaceIndex = data.element.value.indexOf(" ", startDelimIndex);
        // We count a newline or tab as whitespace too since the browser may wrap at those points.
        const newlineIndex = data.element.value.indexOf("\n", startDelimIndex);
        const tabIndex = data.element.value.indexOf("\t", startDelimIndex);
        let whiteSpaceIndex = data.element.selectionStart;
        if (~spaceIndex) {
            whiteSpaceIndex = Math.min(spaceIndex, whiteSpaceIndex);
        }
        if (~newlineIndex) {
            whiteSpaceIndex = Math.min(newlineIndex, whiteSpaceIndex);
        }
        if (~tabIndex) {
            whiteSpaceIndex = Math.min(tabIndex, whiteSpaceIndex);
        }
        caret.innerText = data.element.value.substring(startDelimIndex, whiteSpaceIndex);
        data.replacementMirror.appendChild(caret);
        const caretTop = data.replacementMirror.getBoundingClientRect().height;
        const caretLeft = caret.offsetLeft;

        // Now we can position the replacementAutoFiller directly underneath the opening delimiter.
        data.replacementAutoFiller.style.left =
            Math.min(
                caretLeft,
                parseFloat(data.replacementMirror.style.width) - 260
            ) +
            parseFloat(data.elementStyles.paddingLeft) +
            parseFloat(data.elementStyles.borderLeftWidth) +
            data.element.offsetLeft -
            data.element.scrollLeft + "px";
        data.replacementAutoFiller.style.top =
            caretTop +
            parseFloat(data.elementStyles.paddingTop) +
            parseFloat(data.elementStyles.borderTopWidth) +
            data.element.offsetTop -
            data.element.scrollTop + "px";

        // Set the replacementAutoFiller's artificial focus index to 0 (the first item in the list).
        data.replacementAutoFillerFocusedIndex = 0;

        populateAutoFiller(data, incompleteTriggerName);
    }

    function populateAutoFiller(data, incompleteTriggerName) {
        incompleteTriggerName = incompleteTriggerName.trim().toLowerCase();

        // Make a fragment where we will add all the results.
        const fragment = document.createDocumentFragment();

        // If there is no incomplete trigger name yet (i.e., we haven't typed anything yet), we want to
        // show the list of namespaces instead of filtering results.
        if (incompleteTriggerName.replace(/[^a-zA-Z\d]+/g, "") == "") {
            for (const namespace_object of namespaces) {
                // Each namespace gets its own <li>.
                const li = document.createElement("li");
                li.innerHTML = `
                <div class="sn-card-component_accent-bar"></div>
                <i class="icon-${namespace_object.icon}"></i>
                <strong>${escapeHTML(namespace_object.name) || '""'}</strong>
                <i class="icon-arrow-right-rounded"></i>
            `;
                li.setAttribute(`data-${CSS_PREFIX}-autofill-type`, "namespace");
                li.setAttribute(`data-${CSS_PREFIX}-insertion-text`, namespace_object.insert);
                li.setAttribute(`data-${CSS_PREFIX}-append-end-delimiter`, "false");

                configureListItem(li, data);

                fragment.appendChild(li, data);
            }
        } else {
            // Otherwise, we can treat the text as a search query and look for replacements that match.

            // Treat the trigger name as a search query.
            let searchQuery = incompleteTriggerName;
            // Get a list of replacements that we are going to search through.
            let searchableReplacements = Object.keys(triggerTranslatedReplacements).filter(key => triggerTranslatedReplacements[key].autoFillerVisibility);

            let triggerSubstringIndex = 0;

            // Check if our search query has a namespace. If it does, filter out any macros that do not
            // fall into that namespace.
            const periodIndex = incompleteTriggerName.indexOf(".");
            if (~periodIndex) {
                const namespace = incompleteTriggerName.substring(0, periodIndex + 1);
                const matchingNamespace = namespaces.filter(namespaceObject => namespace == namespaceObject.insert);
                if (matchingNamespace.length == 1) {
                    searchableReplacements = searchableReplacements.filter(
                        trigger => trigger.startsWith(matchingNamespace[0].insert)
                    );
                    searchQuery = incompleteTriggerName.substring(periodIndex + 1);
                    triggerSubstringIndex = periodIndex + 1;
                }
            }

            // Only show words that match each word of the search query.
            const searchWords = searchQuery.split(/[^a-zA-Z\d]+/);
            for (const word of searchWords) {
                searchableReplacements = searchableReplacements.filter(trigger => trigger.substring(triggerSubstringIndex).includes(word));
            }

            // Now we have a list of triggers that correspond to a different replacement. Some triggers
            // may correspond to the same replacement, so we need to filter them out. We do this by
            // making a Map where each key is the replacement, and each key is the index of its
            // .triggers array that corresponds to the trigger we searched for. We want to keep the
            // earliest trigger in the list.
            const replacementTriggerIndices = new Map();
            for (const trigger of searchableReplacements) {
                const replacement = triggerTranslatedReplacements[trigger];
                if (replacementTriggerIndices.has(replacement)) {
                    const prevIndex = replacementTriggerIndices.get(replacement);
                    const newIndex = replacement.triggers.indexOf(trigger);
                    if (newIndex < prevIndex) {
                        replacementTriggerIndices.set(replacement, newIndex);
                    }
                } else {
                    replacementTriggerIndices.set(replacement, replacement.triggers.indexOf(trigger));
                }
            }

            // Sort the filtered replacements according to the order they show up in in
            // REPLACEMENTS.
            const orderedReplacements = [];
            for (const replacement of REPLACEMENTS) {
                if (replacementTriggerIndices.has(replacement)) {
                    orderedReplacements.push(replacement);
                }
            }

            // Now we can make the <li>s for each of the search results.
            for (const replacement of orderedReplacements) {
                // Each namespace gets its own <li>.
                const li = document.createElement("li");
                li.innerHTML = `
                <div class="sn-card-component_accent-bar"></div>
                <div>
                    <strong>${REPLACEMENT_START_DELIMITER}${escapeHTML(replacement.triggers[replacementTriggerIndices.get(replacement)]) || ""}${REPLACEMENT_END_DELIMITER}</strong>
                    <small>${replacement.description}</small>
                </div>
                <i class="icon-chevron-right"></i>
            `;
                li.setAttribute(`data-${CSS_PREFIX}-autofill-type`, "replacement");
                li.setAttribute(`data-${CSS_PREFIX}-insertion-text`, replacement.triggers[replacementTriggerIndices.get(replacement)]);
                li.setAttribute(`data-${CSS_PREFIX}-append-end-delimiter`, AUTOFILL_REPLACEMENT);

                configureListItem(li, data);

                fragment.appendChild(li, data);
            }
        }

        // If the auto filler is empty, we want to hide it completely.
        if (fragment.children.length == 0) {
            data.replacementAutoFiller.style.display = "none";
            data.isAutoFillingReplacement = false;
            data.replacementAutoFillerFocusedIndex = null;
            events.trigger("hide_auto_filler", data)
            return;
        }

        data.replacementAutoFillerFocusedIndex = 0;

        // Replace the content of the autoFiller with the new items.
        data.replacementAutoFiller.innerText = "";
        data.replacementAutoFiller.appendChild(fragment);

        focusAutoFillItem(data);

        events.trigger("update_auto_filler");
    }

    function configureListItem(li, data) {
        li.tabIndex = 0;
        li.role = "button";

        // Add a click listener to make it insert the text.
        li.addEventListener("click", e => selectAutoFillerItem(e, data));
        // Also add a keydown listener for Enter and Spacebar to activate the click listener like
        // how a button would.
        li.addEventListener("keydown", function (e) {
            if (e.code == "Enter" || e.code == "Space") selectAutoFillerItem(e, data);
        });
        // Hover-in listener to left-align the tooltip, as well as make the item highlighted.
        li.addEventListener("mouseenter", function (e) {
            li.setAttribute(`data-${CSS_PREFIX}-hovering`, "true");
            li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
        });
        // Hover-out listener to make the tooltip return to normal, as well as un-highlight the item.
        li.addEventListener("mouseleave", function (e) {
            li.setAttribute(`data-${CSS_PREFIX}-hovering`, "false");
            if (li.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
            }
        });
        // Focusing on the item is treated the same same as hovering in.
        li.addEventListener("focus", function (e) {
            li.setAttribute(`data-${CSS_PREFIX}-focusing`, "true");
            li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
            // Also update the focusedIndex we have saved to match.
            data.replacementAutoFillerFocusedIndex = Array.prototype.indexOf.call(li.parentNode.children, li);
            focusAutoFillItem(data);
        });
        // Blurring the item is the same as hovering out.
        li.addEventListener("blur", function (e) {
            li.setAttribute(`data-${CSS_PREFIX}-focusing`, "false");
            if (li.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
            }
        });
    }

    function getIncompleteTriggerName(data) {
        // If there are less characters in the textarea than there are characters in REPLACEMENT_START_DELIMITER,
        // there's no way that our caret is positioned after a start delimiter.
        if (data.element.selectionStart < REPLACEMENT_START_DELIMITER.length) {
            return null;
        }

        // Determine if our caret is positioned after a starting delimiter, but not if there is an end-
        // ing delimiter that closes it.
        let startDelimIndex = data.element.value.lastIndexOf(REPLACEMENT_START_DELIMITER, data.element.selectionStart - REPLACEMENT_START_DELIMITER.length);
        let endDelimIndex = data.element.value.lastIndexOf(REPLACEMENT_END_DELIMITER, data.element.selectionStart - 1);
        if (!~startDelimIndex || (~endDelimIndex && startDelimIndex < endDelimIndex)) {
            return null;
        }

        // If there is a newline character between the start delimiter and our cursor, we don't want to
        // show the auto filler because more than likely, the user will still want to use the up and
        // down arrow keys to move the caret instead of scrolling through the auto filler menu.
        let newLineIndex = data.element.value.indexOf("\n", startDelimIndex);
        if (~newLineIndex && newLineIndex < data.element.selectionStart) {
            return null;
        }

        // Return the text from the starting delimiter up to the caret.
        return data.element.value.substring(startDelimIndex + REPLACEMENT_START_DELIMITER.length, data.element.selectionStart);
    }

    function selectAutoFillerItem(e, data) {
        let item = e.currentTarget;
        let name = item.getAttribute(`data-${CSS_PREFIX}-insertion-text`);

        let previousStartDelimIndex = data.element.value.lastIndexOf(REPLACEMENT_START_DELIMITER, data.element.selectionStart - REPLACEMENT_START_DELIMITER.length);
        let nextStartDelimIndex = data.element.value.indexOf(REPLACEMENT_START_DELIMITER, data.element.selectionStart);
        let nextEndDelimIndex = data.element.value.indexOf(REPLACEMENT_END_DELIMITER, data.element.selectionStart);

        let newValue;
        let newCaretPos;
        if (~nextEndDelimIndex && (!~nextStartDelimIndex || nextEndDelimIndex > nextStartDelimIndex)) {
            // If there is a closing delimiter after the current selection, and it is not the closing
            // delimiter for another opening delimiter, we can replace up to that point.
            newValue =
                data.element.value.substring(0, previousStartDelimIndex + REPLACEMENT_START_DELIMITER.length) +
                name +
                data.element.value.substring(nextEndDelimIndex);
            newCaretPos = previousStartDelimIndex + REPLACEMENT_START_DELIMITER.length + name.length + REPLACEMENT_END_DELIMITER.length;
        } else {
            // Otherwise, we just want to replace from the start delimiter up to the caret, and insert
            // the closing delimiter ourself.
            const insertClosing = item.getAttribute(`data-${CSS_PREFIX}-append-end-delimiter`) == "true"
            newValue = data.element.value.substring(0, previousStartDelimIndex + REPLACEMENT_START_DELIMITER.length) +
                name +
                (insertClosing ? REPLACEMENT_END_DELIMITER : "") +
                data.element.value.substring(Math.max(data.element.selectionStart, data.element.selectionEnd));
            newCaretPos = previousStartDelimIndex + REPLACEMENT_START_DELIMITER.length + name.length + (insertClosing ? REPLACEMENT_END_DELIMITER.length : 0);
        }

        events.trigger("select_auto_filler_tab", data, item, name);

        replaceTextareaValue(data, ...resolveReplacements(newValue, newCaretPos));
    }

    function focusAutoFillItem(data) {
        const options = data.replacementAutoFiller.children;

        if (options.length == 0) {
            data.replacementAutoFiller.style.display = "none";
            data.isAutoFillingReplacement = false;
            data.replacementAutoFillerFocusedIndex = null;
            return;
        }

        if (data.replacementAutoFillerFocusedIndex < 0) {
            data.replacementAutoFillerFocusedIndex = 0;
        } else if (data.replacementAutoFillerFocusedIndex >= options.length) {
            data.replacementAutoFillerFocusedIndex = options.length - 1;
        }
        const index = data.replacementAutoFillerFocusedIndex;

        // Look for any children that were previously being focused.
        for (const li of data.replacementAutoFiller.children) {
            li.setAttribute(`data-${CSS_PREFIX}-artificial-focusing`, "false");
            if (li.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true") {
                li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
            }
        }

        options[index].setAttribute(`data-${CSS_PREFIX}-artificial-focusing`, "true");
        options[index].firstElementChild.classList.add("sn-card-component_accent-bar_dark");
        // Scroll it into view to appear as if it is focused.
        if (typeof options[index].scrollIntoViewIfNeeded == "function") {
            options[index].scrollIntoViewIfNeeded();
        }
    }
}

function resolveReplacements(value, caretPosition) {
    let lastIndex = value.length;
    let startIndex;

    // Get the position of the last opening delimiter in the string.
    while (~(startIndex = value.lastIndexOf(REPLACEMENT_START_DELIMITER, lastIndex)) && lastIndex >= 0) {
        // Check if there is a closing delimiter that follows this starting delimiter.
        const endIndex = value.indexOf(REPLACEMENT_END_DELIMITER, startIndex);
        // No end delimiter indicates there are no more replacements to make.
        if (!~endIndex) {
            break;
        }

        // Get the string between the two delimiters.
        const nestedString = value.substring(startIndex + REPLACEMENT_START_DELIMITER.length, endIndex);
        let [expansion, gotExpanded] = expandString(nestedString, 0);

        if (gotExpanded && endIndex + REPLACEMENT_END_DELIMITER.length <= caretPosition) {
            // If the caret position is after the current replacement, we need to move it to account
            // for the new characters.
            caretPosition += expansion.length - (endIndex + REPLACEMENT_END_DELIMITER.length - startIndex);
        } else if (gotExpanded && startIndex < caretPosition) {
            // If the caretPosition is in between the starting end ending delimiters, we move the
            // caret position to be right after the replacement.
            caretPosition = startIndex + expansion.length;
        }

        value = value.substring(0, startIndex) + expansion + value.substring(endIndex + REPLACEMENT_END_DELIMITER.length);
        // Update lastIndex so we only look for opening delimiters from before the current point.
        lastIndex = startIndex - 1;
    }

    let caretPositions = [];

    // Now we look for any ${CURSOR()} markers to indicate where we should place the caret.
    let match;
    while (match = CURSOR_REGEX.exec(value)) {
        // Escape any backslashes in the cursor's placeholder text.
        let selection = (match[1] || "").replace(/\\"/g, '"').replace(/\\\\/g, "\\");

        // Replace the ${CURSOR()} with the selection text.
        value = value.substring(0, match.index) + selection + value.substring(match.index + match[0].length);

        // Push this caret's positions to the final list.
        caretPositions.push([match.index, match.index + selection.length]);
        if (match.index < caretPosition) {
            if (caretPosition < match.index + match[0].length) {
                // If our current caretPosition is somehow found in the middle of a ${CURSOR()}
                // marker, we want it to be at the end of where ${CURSOR()} gets replaced.
                caretPosition = match.index + selection.length;
            } else {
                // If our caret position is after the ${CURSOR()} marker, we move it up by the
                // amount of characters we are removing.
                caretPosition += selection.length - match[0].length;
            }
        }
    }

    // If there were no ${CURSOR()} markers, add the current caretPosition so that the caret goes
    // back to where it was originally.
    if (!caretPositions.length) {
        caretPositions = [[caretPosition, caretPosition]]
    }

    // Return the value with replacements resolved, along with an array of cursor positions.
    return [value, caretPositions];
}

function expandString(string, level) {
    if (level >= REPLACEMENT_MAX_RECURSION_DEPTH) {
        return ["[Maximum recursion depth exceeded]", true];
    }
    const unchanged = string;

    // We remove all ${CURSOR()} markers from the string to see if the string's raw value, without
    // cursors, matches any replacements.
    let index = 0;
    let match;
    while (match = CURSOR_REGEX.exec(string.substring(index))) {
        index += match.index;
        string = string.substring(0, index) + string.substring(index + match[0].length);
    }

    string = string.trim().toLowerCase();

    // If this string is a valid trigger, replace it with its replacement value.
    let replacement;
    if (string in triggerTranslatedReplacements) {
        // Check if the value is a function. If it is, we need to run that function to get the
        // value.
        if (typeof triggerTranslatedReplacements[string].value == "function") {
            let value = triggerTranslatedReplacements[string].value();

            // If the function returns null, it means we shouldn't expand to anything.
            if (value == null) {
                return [REPLACEMENT_START_DELIMITER + unchanged + REPLACEMENT_END_DELIMITER, false];
            }

            // Otherwise, save the dedented value to `replacement`.
            replacement = dedent(value + "");
        } else {
            // If it is not a function, we can just return the value directly.
            replacement = triggerTranslatedReplacements[string].value; // Already dedented.
        }
    } else {
        // No trigger with this name; return the value unchanged.
        return [REPLACEMENT_START_DELIMITER + unchanged + REPLACEMENT_END_DELIMITER, false];
    }

    // Now that we have the replaced value, we need to check to see if there were any nested
    // replacements. The code below is mostly copied from resolveReplacements since it does almost
    // the same thing.
    let lastIndex = replacement.length;
    let startIndex;
    while (~(startIndex = replacement.lastIndexOf(REPLACEMENT_START_DELIMITER, lastIndex)) && lastIndex >= 0) {
        let endIndex = replacement.indexOf(REPLACEMENT_END_DELIMITER, startIndex);
        if (!~endIndex) {
            break;
        }
        let nestedString = replacement.substring(startIndex + REPLACEMENT_START_DELIMITER.length, endIndex);
        let [expansion, _] = expandString(nestedString, level + 1);
        replacement = replacement.substring(0, startIndex) + expansion + replacement.substring(endIndex + REPLACEMENT_END_DELIMITER.length);
        lastIndex = startIndex - 1;
    }

    return [replacement, true];
}

module.exports.resolveReplacements = resolveReplacements;