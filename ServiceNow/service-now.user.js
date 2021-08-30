// ==UserScript==
// @name        ServiceNow Improvements
// @namespace   https://github.com/FiggChristian/PTS-Scripts
// @match       *://stanford.service-now.com/ticket.do*
// @match       *://stanford.service-now.com/incident.do*
// @match       *://stanford.service-now.com/sc_task.do*
// @version     1.0
// @description Adds macros, replacements, and Markdown support to ServiceNow tickets.
// @downloadURL https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/master/ServiceNow/service-now.user.js
// @updateURL   https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/master/ServiceNow/service-now.user.js
// ==/UserScript==

!function() {
    const MAX_RECURSION_DEPTH = 10;
    const START_DELIMITER = "{{";
    const END_DELIMITER = "}}";
    const AUTOFILL_REPLACEMENT = true;

    const PUBLIC = Symbol.for("PUBLIC");
    const PRIVATE = Symbol.for("PRIVATE");

    const MACROS = [
        {
            name: "Ask for MAC Address",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                    
                Could you please provide the hardware address (also known as a MAC address) for this device? Here are instructions on how to find it: ${START_DELIMITER}link.mac_address${END_DELIMITER}
                
                With this information we'll be able to look into your issue further.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Ask user to provide the MAC address for the device in question.",
            type: PUBLIC
        },
        {
            name: "Upgrade to Windows 10 Education",
            value: `
                Hello ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                You can upgrade your version of Windows 10 to Windows 10 Education (which is compatible with Stanford's encryption software and BitLocker) by following these steps:
                
                1. Go to [Stanford's Software Licensing Webstore](https://stanford.onthehub.com/WebStore/OfferingDetails.aspx?o=bb702eb6-cbf8-e811-810d-000d3af41938) to get your free product key of Windows 10 Education (one per student).
                2. Right click the **Start Menu** from your desktop.
                3. Select **System**.
                4. Click **Change product key**.
                5. Copy & paste the 25-digit license key from step 1.
                6. Allow the system to reboot (may take 5–10 minutes).
                
                Hope this helps. Lets us know if you have any questions or issues.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Gives the user step-by-step instructions for upgrading to Windows 10 Education.",
            type: PUBLIC
        },
        {
            name: "Bad WiFi Connection",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                Our first recommendation is that you "forget" all of the Stanford wireless networks (Stanford Visitor, Stanford, eduroam, Stanford Secure) from any affected device's remembered networks, and then "Rejoin" only the Stanford network.  Please do not connect to other networks until we complete our troubleshooting process with you.
                
                If you continue to experience trouble, please glance at the clock and note the time, what program you were using, and where you were sitting in your apartment.  We can use this information to open a report with networking to investigate the performance of the wireless system in your apartment.  Three of these notes will be enough information for networking to create a very comprehensive picture of what the trouble might be and get a faster resolution.
                
                It is best to troubleshoot one wireless device at a time, as any adjustments made to the wireless system may improve the connections for other devices nearby.
                
                Thank you,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Asks the user for more information when their WiFi is bad.",
            type: PUBLIC
        },
        {
            name: "Manual MyDevices Enrollment",
            value: `
                Hello ${START_DELIMITER}ticket.requester.first_name${END_DELIMITER},
                
                We have manually enrolled this device into the encryption compliance program and have indicated that you will not use this device to manage high risk data. The MyDevices website updates approximately every 12 hours so it may be awhile before you see the device listed.  

                This should resolve the issue regarding "${START_DELIMITER}ticket.title${END_DELIMITER}", and aside from waiting 12-24 hours before confirming the change showing up in your MyDevices, there should be no further action required on your part.
                
                Please do let us know if you have any issues in the future.
                
                Thanks!
                [code]<!-- Delete this line: ${CURSOR("https://web.stanford.edu/dept/its/cgi-bin/services/endpoints/web/enter_enrollment_data.php")} -->[/code]
            `,
            description: "Indicates that a device has been manually enrolled into MyDevices.",
            type: PUBLIC
        },
        {
            name: "Time Stamps",
            value: `
                Hello ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                If you are still experiencing connection issues, could you please send us three times and dates of exactly when you’ve had trouble, each with a brief description of your activity at the time and how it behaved in a way that was less than desirable, as well as the MAC address of the device you were using?
                
                Thank you so much for your continued patience and cooperation while we work to resolve the issue.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "To request timestamps from customer for Net Trouble ticket.",
            type: PUBLIC
        },
        {
            name: "TSO Information",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                Thank you for reaching out to PTS! Our first recommendation is to try the other ports in the room—a room often has multiple ports and usually at least one of them is working properly. If that does not work, could you please provide some additional info:
                
                1. The hardware address for your device that you regularly connect to this port: link.mac_address.
                2. A photo where you're plugging in (this should include the number on the panel, usually found on a sticker).
                3. Exact and specific date and times of when you've had trouble, what your activity was at that moment, and how the trouble manifested itself.
                
                With this information we can check the status of that port.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Asks the user for the MAC address, a picture of the ethernet port, and whether they've tried the other ports in the room.",
            type: PUBLIC
        },
        {
            name: "Dubious Node",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                
                It looks like the device associated with this record has been blocked from using the on-campus network. The default at Stanford is that devices that connect to the network should be encrypted unless you actively indicate why it should be exempt. Common conditions in which a device will get blocked are when the owner does not complete the process, or when the owner indicates a condition in which it should be encrypted, but do not encrypt the device, specifically that the device is used to manage "high-risk data".

                Whether or not you handle "high-risk data", you'll need to indicate that through the Encryption Enrollment app from here: ${START_DELIMITER}link.enrollment_questionnaire${END_DELIMITER}. If you don't deal with high-risk data, or any of the other conditions, this should clear your device from having to encrypt and will reinstate the device's ability to use the on-campus network.
                
                We have temporarily restored this device's access to the network so you can complete this process. At some point in the next couple of hours, it will get blocked again. 
                
                Please let us know how everything goes regardless.
                
                Thanks,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Lets the user know that the device has been blocked due to compliance and gives them instructions for how to resolve it.",
            type: PUBLIC
        },
        {
            name: "DNS Check",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                We suspect that your computer's current DNS settings are preventing it from reaching the Stanford network properly. While you should receive an appropriate DNS address simply by connecting to the network, your computer may be set so that is not happening automatically. You can manually set the DNS addresses for your computer to the following:

                \`171.64.1.234\` and \`171.67.1.234\`
                
                If this does not resolve the issue, we recommend that you can schedule a virtual appointment through ${START_DELIMITER}link.appointment${END_DELIMITER} to have live assistance to help you get a further troubleshooting.

                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Explains to the user how to reset a device's DNS record.",
            type: PUBLIC
        }
    ];

    const REPLACEMENTS = [
        {
            triggers: [
                ""
            ],
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                ${CURSOR("[Your message here]")}

                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `
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
            description: "The requester's first name"
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
            description: "The requester's full name"
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
            description: "The requester's email"
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
                        return `(${number.substring(0,3)}) ${number.substring(3,6)}-${number.substring(6,10)}`;
                    } else {
                        return input.value;
                    }
                }
                return null;
            },
            description: "The requester's phone number"
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
            description: "The ticket's number"
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
            description: "The ticket's title"
        },
        {
            triggers: [
                "current_user.name.first",
                "current_user.first_name"
            ],
            value: _ => {
                let elem = window.parent.document.getElementsByClassName("user-name")[0];
                if (elem) {
                    let index = elem.innerText.indexOf(" ");
                    return ~index ? elem.innerText.substring(0, index) : elem.innerText;
                }
                return null;
            },
            description: "Your first name"
        },
        {
            triggers: [
                "current_user.name.full",
                "current_user.full_name",
                "current_user.name"
            ],
            value: _ => {
                let elem = window.parent.document.getElementsByClassName("user-name")[0];
                if (elem) {
                    return elem.innerText;
                }
                return null;
            },
            description: "Your full name"
        },
        {
            triggers: [
                "current_date",
                "today"
            ],
            value: _ => {
                const now = new Date();
                const month = now.getMonth() + 1 + "";
                const day = now.getDate() + "";
                const year = now.getFullYear() + "";
                return `${("00" + month).substring(month.length)}/${("00" + day).substring(day.length)}/${year}`;
            },
            description: "Today's date as MM/DD/YYYY"
        },
        {
            triggers: [
                "current_time"
            ],
            value: _ => {
                const now = new Date();
                const hour = now.getHours() + "";
                const min = now.getMinutes() + "";
                return `${(hour <= 12 ? hour || 12 : hour - 12)}:${("00" + min).substring(min.length)} ${hour < 12 ? "AM" : "PM"}`
            },
            description: "The current time as HH:MM AM/PM"
        },
        {
            triggers: [
                "link.mac_address",
                "link.macaddress",
                "link.mac"
            ],
            value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018475\n`,
            description: "Link for finding MAC addresses"
        },
        {
            triggers: [
                "link.mydevices",
                "link.my_devices"
            ],
            value: `https://mydevices.stanford.edu`,
            description: "Link to MyDevices page"
        },
        {
            triggers: [
                "link.iprequest"
            ],
            value: `https://iprequest.stanford.edu`,
            description: "Link to IPRequest page"
        },
        {
            triggers: [
                "link.snsr"
            ],
            value: `https://snsr.stanford.edu`,
            description: "Link to SNSR download page"
        },
        {
            triggers: [
                "link.mdm"
            ],
            value: `https://uit.stanford.edu/service/mobiledevice/management`,
            description: "Link to MDM page for all devices"
        },
        {
            triggers: [
                "link.mdm.ios",
                "link.mdm.iphone"
            ],
            value: `https://uit.stanford.edu/service/mobiledevice/management/enroll_ios`,
            description: "Link to MDM page for iOS devices"
        },
        {
            triggers: [
                "link.mdm.android"
            ],
            value: `https://uit.stanford.edu/service/mobiledevice/management/enroll_android`,
            description: "Link to MDM page for Android devices"
        },
        {
            triggers: [
                "link.swde"
            ],
            value: `https://uit.stanford.edu/service/encryption/wholedisk`,
            description: "Link to SWDE page for all devices"
        },
        {
            triggers: [
                "link.swde.mac",
                "link.swde.macbook",
                "link.swde.macos",
                "link.swde.osx"
            ],
            value: `https://uit.stanford.edu/service/encryption/wholedisk/install_mac`,
            description: "Link to SWDE page for MacBooks"
        },
        {
            triggers: [
                "link.swde.windows",
                "link.swde.pc"
            ],
            value: `https://uit.stanford.edu/service/encryption/wholedisk/install_windows`,
            description: "Link to SWDE page for Windows PCs"
        },
        {
            triggers: [
                "link.appointment",
                "link.book_appointment"
            ],
            value: `https://bit.ly/bookPTSappt`,
            description: "Link to book appointments with PTS"
        },
        {
            triggers: [
                "link.enrollment_questionnaire",
                "link.enrollment_quiz",
                "link.enrollment"
            ],
            value: `https://uit.stanford.edu/service/enrollment`,
            description: "Link to Enrollment Questionnaire page"
        },
        {
            triggers: [
                "link.enrollment_questionnaire.mac",
                "link.enrollment_questionnaire.macbook",
                "link.enrollment_questionnaire.macos",
                "link.enrollment_questionnaire.osx",
                "link.enrollment_quiz.mac",
                "link.enrollment_quiz.macbook",
                "link.enrollment_quiz.macos",
                "link.enrollment_quiz.osx",
                "link.enrollment.mac",
                "link.enrollment.macbook",
                "link.enrollment.macos",
                "link.enrollment.osx"
            ],
            value: "https://uit.stanford.edu/service/enrollment/mac",
            description: "Link to Enrollment Questionnaire for MacBooks"
        },
        {
            triggers: [
                "link.enrollment_questionnaire.windows",
                "link.enrollment_questionnaire.pc",
                "link.enrollment_quiz.windows",
                "link.enrollment_quiz.pc",
                "link.enrollment.windows",
                "link.enrollment.pc",
            ],
            value: "https://uit.stanford.edu/service/enrollment/windows",
            description: "Link to Enrollment Questionnaire for Windows PCs"
        },
        {
            triggers: [
                "link.enrollment_questionnaire.mobile",
                "link.enrollment_questionnaire.ios",
                "link.enrollment_questionnaire.iphone",
                "link.enrollment_questionnaire.android",
                "link.enrollment_quiz.mobile",
                "link.enrollment_quiz.ios",
                "link.enrollment_quiz.iphone",
                "link.enrollment_quiz.android",
                "link.enrollment.mobile",
                "link.enrollment.ios",
                "link.enrollment.iphone",
                "link.enrollment.android"
            ],
            value: "https://uit.stanford.edu/service/enrollment/mobiledevice",
            description: "Link to Enrollment Questionnaire for Mobile Device"
        }
    ];

    const CSS_PREFIX = "pts_injected_script";

    const _MACROS = {};
    for (const macro of MACROS) {
        if ("name" in macro) {
            macro.name = macro.name + "";
        } else {
            console.warn(`Skipping macro found with no name.`);
            continue;
        }

        if (typeof macro.description != "string") {
            macro.description = typeof macro.value == "function" ?
                "<i>No description</i>" :
                [Symbol.for("truncated-description"), sanitizeHTML(macro.value) + ""];
        } else {
            macro.description = dedent(macro.description);
        }

        if (!("type" in macro)) {
            console.warn(`Macro with name "${macro.name}" does not have a "type" key. Defaulting to PUBLIC.`);
            macro.type = PUBLIC;
        } else if (macro.type != PUBLIC && macro.type != PRIVATE) {
            console.warn(`Macro with name "${macro.name}" has an invalid "type". Defaulting to PUBLIC.`);
            macro.type = PUBLIC;
        }

        if (typeof macro.value != "function") {
            if (!"value" in macro) {
                console.warn(`Macro with name "${macro.name}" does not have a "value" key. Defaulting to "".`);
                macro.value = "";
            }
            macro.value = dedent(macro.value + "");
        }
        macro.value = dedent(macro.value + "");

        _MACROS[macro.name] = macro;
    }

    const _REPLACEMENTS = {};
    for (const replacement of REPLACEMENTS) {
        if (!("triggers" in replacement)) {
            console.warn(`Skipping replacement with no "triggers" key.`);
            continue;
        } else if (!Array.isArray(replacement.triggers)) {
            replacement.triggers = [replacement.triggers];
        }

        if (typeof replacement.value != "function") {
            if (!"value" in replacement) {
                console.warn(`Replacement with trigger "${replacement.mainTrigger}" does not have a "value" key.`);
            }
            replacement.value = dedent(replacement.value + "");
        }

        replacement.mainTrigger = (replacement.triggers[0] + "").trim().toLowerCase();
        if (typeof replacement.description != "string") {
            if (!("description" in replacement)) {
                console.warn(`Replacement with trigger "${replacement.mainTrigger}" does not have a "description" key.`);
            } else {
                console.warn(`Replacement with trigger "${replacement.mainTrigger}" has a non-string "description" key.`);
            }
            replacement.description = typeof replacement.value == "function" ?
                "<i>No description</i>" :
                [Symbol.for("truncated-description"), sanitizeHTML(replacement.value) + ""];
        } else {
            replacement.description = dedent(replacement.description);
        }

        for (const trigger of (replacement.triggers || [])) {
            _REPLACEMENTS[(trigger + "").trim().toLowerCase()] = replacement;
        }
    }

    // The line of code below is our Markdown parser
    /**
     * marked - a markdown parser
     * Copyright (c) 2011-2021, Christopher Jeffrey. (MIT Licensed)
     * https://github.com/markedjs/marked
     */
    window.marked = (function(){"use strict";function r(e,t){for(var u=0;u<t.length;u++){var n=t[u];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function i(e,t){(null==t||t>e.length)&&(t=e.length);for(var u=0,n=new Array(t);u<t;u++)n[u]=e[u];return n}function o(e,t){var u="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(u)return(u=u.call(e)).next.bind(u);if(Array.isArray(e)||(u=function(e,t){if(e){if("string"==typeof e)return i(e,t);var u=Object.prototype.toString.call(e).slice(8,-1);return"Map"===(u="Object"===u&&e.constructor?e.constructor.name:u)||"Set"===u?Array.from(e):"Arguments"===u||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(u)?i(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){u&&(e=u);var n=0;return function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var t={exports:{}};function e(){return{baseUrl:null,breaks:!1,extensions:null,gfm:!0,headerIds:!0,headerPrefix:"",highlight:null,langPrefix:"language-",mangle:!0,pedantic:!1,renderer:null,sanitize:!1,sanitizer:null,silent:!1,smartLists:!1,smartypants:!1,tokenizer:null,walkTokens:null,xhtml:!1}}t.exports={defaults:e(),getDefaults:e,changeDefaults:function(e){t.exports.defaults=e}};function u(e){return D[e]}var n=/[&<>"']/,s=/[&<>"']/g,l=/[<>"']|&(?!#?\w+;)/,a=/[<>"']|&(?!#?\w+;)/g,D={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};var c=/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi;function h(e){return e.replace(c,function(e,t){return"colon"===(t=t.toLowerCase())?":":"#"===t.charAt(0)?"x"===t.charAt(1)?String.fromCharCode(parseInt(t.substring(2),16)):String.fromCharCode(+t.substring(1)):""})}var p=/(^|[^\[])\^/g;var f=/[^\w:]/g,g=/^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;var F={},A=/^[^:]+:\/*[^/]*$/,C=/^([^:]+:)[\s\S]*$/,d=/^([^:]+:\/*[^/]*)[\s\S]*$/;function k(e,t){F[" "+e]||(A.test(e)?F[" "+e]=e+"/":F[" "+e]=E(e,"/",!0));var u=-1===(e=F[" "+e]).indexOf(":");return"//"===t.substring(0,2)?u?t:e.replace(C,"$1")+t:"/"===t.charAt(0)?u?t:e.replace(d,"$1")+t:e+t}function E(e,t,u){var n=e.length;if(0===n)return"";for(var r=0;r<n;){var i=e.charAt(n-r-1);if(i!==t||u){if(i===t||!u)break;r++}else r++}return e.substr(0,n-r)}var x=function(e,t){if(t){if(n.test(e))return e.replace(s,u)}else if(l.test(e))return e.replace(a,u);return e},m=h,b=function(u,e){u=u.source||u,e=e||"";var n={replace:function(e,t){return t=(t=t.source||t).replace(p,"$1"),u=u.replace(e,t),n},getRegex:function(){return new RegExp(u,e)}};return n},B=function(e,t,u){if(e){var n;try{n=decodeURIComponent(h(u)).replace(f,"").toLowerCase()}catch(e){return null}if(0===n.indexOf("javascript:")||0===n.indexOf("vbscript:")||0===n.indexOf("data:"))return null}t&&!g.test(u)&&(u=k(t,u));try{u=encodeURI(u).replace(/%25/g,"%")}catch(e){return null}return u},w={exec:function(){}},v=function(e){for(var t,u,n=1;n<arguments.length;n++)for(u in t=arguments[n])Object.prototype.hasOwnProperty.call(t,u)&&(e[u]=t[u]);return e},y=function(e,t){var u=e.replace(/\|/g,function(e,t,u){for(var n=!1,r=t;0<=--r&&"\\"===u[r];)n=!n;return n?"|":" |"}).split(/ \|/),n=0;if(u[0].trim()||u.shift(),u[u.length-1].trim()||u.pop(),u.length>t)u.splice(t);else for(;u.length<t;)u.push("");for(;n<u.length;n++)u[n]=u[n].trim().replace(/\\\|/g,"|");return u},_=E,z=function(e,t){if(-1===e.indexOf(t[1]))return-1;for(var u=e.length,n=0,r=0;r<u;r++)if("\\"===e[r])r++;else if(e[r]===t[0])n++;else if(e[r]===t[1]&&--n<0)return r;return-1},$=function(e){e&&e.sanitize&&!e.silent&&console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options")},S=function(e,t){if(t<1)return"";for(var u="";1<t;)1&t&&(u+=e),t>>=1,e+=e;return u+e},T=t.exports.defaults,R=_,I=y,Z=x,q=z;function O(e,t,u,n){var r=t.href,i=t.title?Z(t.title):null,t=e[1].replace(/\\([\[\]])/g,"$1");if("!"===e[0].charAt(0))return{type:"image",raw:u,href:r,title:i,text:Z(t)};n.state.inLink=!0;t={type:"link",raw:u,href:r,title:i,text:t,tokens:n.inlineTokens(t,[])};return n.state.inLink=!1,t}_=function(){function e(e){this.options=e||T}var t=e.prototype;return t.space=function(e){e=this.rules.block.newline.exec(e);if(e)return 1<e[0].length?{type:"space",raw:e[0]}:{raw:"\n"}},t.code=function(e){var t=this.rules.block.code.exec(e);if(t){e=t[0].replace(/^ {1,4}/gm,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?e:R(e,"\n")}}},t.fences=function(e){var t=this.rules.block.fences.exec(e);if(t){var u=t[0],e=function(e,t){if(null===(e=e.match(/^(\s+)(?:```)/)))return t;var u=e[1];return t.split("\n").map(function(e){var t=e.match(/^\s+/);return null!==t&&t[0].length>=u.length?e.slice(u.length):e}).join("\n")}(u,t[3]||"");return{type:"code",raw:u,lang:t[2]&&t[2].trim(),text:e}}},t.heading=function(e){var t=this.rules.block.heading.exec(e);if(t){var u=t[2].trim();/#$/.test(u)&&(e=R(u,"#"),!this.options.pedantic&&e&&!/ $/.test(e)||(u=e.trim()));u={type:"heading",raw:t[0],depth:t[1].length,text:u,tokens:[]};return this.lexer.inline(u.text,u.tokens),u}},t.hr=function(e){e=this.rules.block.hr.exec(e);if(e)return{type:"hr",raw:e[0]}},t.blockquote=function(e){var t=this.rules.block.blockquote.exec(e);if(t){e=t[0].replace(/^ *> ?/gm,"");return{type:"blockquote",raw:t[0],tokens:this.lexer.blockTokens(e,[]),text:e}}},t.list=function(e){var t=this.rules.block.list.exec(e);if(t){var u,n,r,i,s,l,a,o,D,c=1<(p=t[1].trim()).length,h={type:"list",raw:"",ordered:c,start:c?+p.slice(0,-1):"",loose:!1,items:[]},p=c?"\\d{1,9}\\"+p.slice(-1):"\\"+p;this.options.pedantic&&(p=c?p:"[*+-]");for(var f=new RegExp("^( {0,3}"+p+")((?: [^\\n]*| *)(?:\\n[^\\n]*)*(?:\\n|$))");e&&!this.rules.block.hr.test(e)&&(t=f.exec(e));){o=t[2].split("\n"),D=this.options.pedantic?(i=2,o[0].trimLeft()):(i=t[2].search(/[^ ]/),i=t[1].length+(4<i?1:i),o[0].slice(i-t[1].length)),s=!1,u=t[0],!o[0]&&/^ *$/.test(o[1])&&(u=t[1]+o.slice(0,2).join("\n")+"\n",h.loose=!0,o=[]);for(var g=new RegExp("^ {0,"+Math.min(3,i-1)+"}(?:[*+-]|\\d{1,9}[.)])"),F=1;F<o.length;F++){if(a=o[F],this.options.pedantic&&(a=a.replace(/^ {1,4}(?=( {4})*[^ ])/g,"  ")),g.test(a)){u=t[1]+o.slice(0,F).join("\n")+"\n";break}if(s){if(!(a.search(/[^ ]/)>=i)&&a.trim()){u=t[1]+o.slice(0,F).join("\n")+"\n";break}D+="\n"+a.slice(i)}else a.trim()||(s=!0),a.search(/[^ ]/)>=i?D+="\n"+a.slice(i):D+="\n"+a}h.loose||(l?h.loose=!0:/\n *\n *$/.test(u)&&(l=!0)),this.options.gfm&&(n=/^\[[ xX]\] /.exec(D))&&(r="[ ] "!==n[0],D=D.replace(/^\[[ xX]\] +/,"")),h.items.push({type:"list_item",raw:u,task:!!n,checked:r,loose:!1,text:D}),h.raw+=u,e=e.slice(u.length)}h.items[h.items.length-1].raw=u.trimRight(),h.items[h.items.length-1].text=D.trimRight(),h.raw=h.raw.trimRight();var A=h.items.length;for(F=0;F<A;F++)this.lexer.state.top=!1,h.items[F].tokens=this.lexer.blockTokens(h.items[F].text,[]),h.items[F].tokens.some(function(e){return"space"===e.type})&&(h.loose=!0,h.items[F].loose=!0);return h}},t.html=function(e){var t=this.rules.block.html.exec(e);if(t){e={type:"html",raw:t[0],pre:!this.options.sanitizer&&("pre"===t[1]||"script"===t[1]||"style"===t[1]),text:t[0]};return this.options.sanitize&&(e.type="paragraph",e.text=this.options.sanitizer?this.options.sanitizer(t[0]):Z(t[0]),e.tokens=[],this.lexer.inline(e.text,e.tokens)),e}},t.def=function(e){e=this.rules.block.def.exec(e);if(e)return e[3]&&(e[3]=e[3].substring(1,e[3].length-1)),{type:"def",tag:e[1].toLowerCase().replace(/\s+/g," "),raw:e[0],href:e[2],title:e[3]}},t.table=function(e){e=this.rules.block.table.exec(e);if(e){var t={type:"table",header:I(e[1]).map(function(e){return{text:e}}),align:e[2].replace(/^ *|\| *$/g,"").split(/ *\| */),rows:e[3]?e[3].replace(/\n$/,"").split("\n"):[]};if(t.header.length===t.align.length){t.raw=e[0];for(var u,n,r,i=t.align.length,s=0;s<i;s++)/^ *-+: *$/.test(t.align[s])?t.align[s]="right":/^ *:-+: *$/.test(t.align[s])?t.align[s]="center":/^ *:-+ *$/.test(t.align[s])?t.align[s]="left":t.align[s]=null;for(i=t.rows.length,s=0;s<i;s++)t.rows[s]=I(t.rows[s],t.header.length).map(function(e){return{text:e}});for(i=t.header.length,u=0;u<i;u++)t.header[u].tokens=[],this.lexer.inlineTokens(t.header[u].text,t.header[u].tokens);for(i=t.rows.length,u=0;u<i;u++)for(r=t.rows[u],n=0;n<r.length;n++)r[n].tokens=[],this.lexer.inlineTokens(r[n].text,r[n].tokens);return t}}},t.lheading=function(e){e=this.rules.block.lheading.exec(e);if(e){e={type:"heading",raw:e[0],depth:"="===e[2].charAt(0)?1:2,text:e[1],tokens:[]};return this.lexer.inline(e.text,e.tokens),e}},t.paragraph=function(e){e=this.rules.block.paragraph.exec(e);if(e){e={type:"paragraph",raw:e[0],text:"\n"===e[1].charAt(e[1].length-1)?e[1].slice(0,-1):e[1],tokens:[]};return this.lexer.inline(e.text,e.tokens),e}},t.text=function(e){e=this.rules.block.text.exec(e);if(e){e={type:"text",raw:e[0],text:e[0],tokens:[]};return this.lexer.inline(e.text,e.tokens),e}},t.escape=function(e){e=this.rules.inline.escape.exec(e);if(e)return{type:"escape",raw:e[0],text:Z(e[1])}},t.tag=function(e){e=this.rules.inline.tag.exec(e);if(e)return!this.lexer.state.inLink&&/^<a /i.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&/^<\/a>/i.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&/^<(pre|code|kbd|script)(\s|>)/i.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&/^<\/(pre|code|kbd|script)(\s|>)/i.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:this.options.sanitize?"text":"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,text:this.options.sanitize?this.options.sanitizer?this.options.sanitizer(e[0]):Z(e[0]):e[0]}},t.link=function(e){var t=this.rules.inline.link.exec(e);if(t){var u=t[2].trim();if(!this.options.pedantic&&/^</.test(u)){if(!/>$/.test(u))return;e=R(u.slice(0,-1),"\\");if((u.length-e.length)%2==0)return}else{var n=q(t[2],"()");-1<n&&(i=(0===t[0].indexOf("!")?5:4)+t[1].length+n,t[2]=t[2].substring(0,n),t[0]=t[0].substring(0,i).trim(),t[3]="")}var r,n=t[2],i="";return this.options.pedantic?(r=/^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(n))&&(n=r[1],i=r[3]):i=t[3]?t[3].slice(1,-1):"",n=n.trim(),O(t,{href:(n=/^</.test(n)?this.options.pedantic&&!/>$/.test(u)?n.slice(1):n.slice(1,-1):n)&&n.replace(this.rules.inline._escapes,"$1"),title:i&&i.replace(this.rules.inline._escapes,"$1")},t[0],this.lexer)}},t.reflink=function(e,t){if((u=this.rules.inline.reflink.exec(e))||(u=this.rules.inline.nolink.exec(e))){e=(u[2]||u[1]).replace(/\s+/g," ");if((e=t[e.toLowerCase()])&&e.href)return O(u,e,u[0],this.lexer);var u=u[0].charAt(0);return{type:"text",raw:u,text:u}}},t.emStrong=function(e,t,u){void 0===u&&(u="");var n=this.rules.inline.emStrong.lDelim.exec(e);if(n&&(!n[3]||!u.match(/(?:[0-9A-Za-z\xAA\xB2\xB3\xB5\xB9\xBA\xBC-\xBE\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u0660-\u0669\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09E6-\u09F1\u09F4-\u09F9\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AE6-\u0AEF\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71-\u0B77\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BF2\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C66-\u0C6F\u0C78-\u0C7E\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CE6-\u0CEF\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D58-\u0D61\u0D66-\u0D78\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DE6-\u0DEF\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F33\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1369-\u137C\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2070\u2071\u2074-\u2079\u207F-\u2089\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2150-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2CFD\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u3192-\u3195\u31A0-\u31BF\u31F0-\u31FF\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA830-\uA835\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uA9E0-\uA9E4\uA9E6-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDE80-\uDE9C\uDEA0-\uDED0\uDEE1-\uDEFB\uDF00-\uDF23\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC58-\uDC76\uDC79-\uDC9E\uDCA7-\uDCAF\uDCE0-\uDCF2\uDCF4\uDCF5\uDCFB-\uDD1B\uDD20-\uDD39\uDD80-\uDDB7\uDDBC-\uDDCF\uDDD2-\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE40-\uDE48\uDE60-\uDE7E\uDE80-\uDE9F\uDEC0-\uDEC7\uDEC9-\uDEE4\uDEEB-\uDEEF\uDF00-\uDF35\uDF40-\uDF55\uDF58-\uDF72\uDF78-\uDF91\uDFA9-\uDFAF]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDCFA-\uDD23\uDD30-\uDD39\uDE60-\uDE7E\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF27\uDF30-\uDF45\uDF51-\uDF54\uDFB0-\uDFCB\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC52-\uDC6F\uDC83-\uDCAF\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD03-\uDD26\uDD36-\uDD3F\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDD0-\uDDDA\uDDDC\uDDE1-\uDDF4\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDEF0-\uDEF9\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC50-\uDC59\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE50-\uDE59\uDE80-\uDEAA\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF30-\uDF3B]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCF2\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDD50-\uDD59\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC50-\uDC6C\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF2\uDFB0\uDFC0-\uDFD4]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF50-\uDF59\uDF5B-\uDF61\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE96\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD40-\uDD49\uDD4E\uDEC0-\uDEEB\uDEF0-\uDEF9]|\uD83A[\uDC00-\uDCC4\uDCC7-\uDCCF\uDD00-\uDD43\uDD4B\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83C[\uDD00-\uDD0C]|\uD83E[\uDFF0-\uDFF9]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A])/))){var r=n[1]||n[2]||"";if(!r||""===u||this.rules.inline.punctuation.exec(u)){var i,s=n[0].length-1,l=s,a=0,o="*"===n[0][0]?this.rules.inline.emStrong.rDelimAst:this.rules.inline.emStrong.rDelimUnd;for(o.lastIndex=0,t=t.slice(-1*e.length+s);null!=(n=o.exec(t));)if(i=n[1]||n[2]||n[3]||n[4]||n[5]||n[6])if(i=i.length,n[3]||n[4])l+=i;else if(!((n[5]||n[6])&&s%3)||(s+i)%3){if(!(0<(l-=i))){if(i=Math.min(i,i+l+a),Math.min(s,i)%2){var D=e.slice(1,s+n.index+i);return{type:"em",raw:e.slice(0,s+n.index+i+1),text:D,tokens:this.lexer.inlineTokens(D,[])}}D=e.slice(2,s+n.index+i-1);return{type:"strong",raw:e.slice(0,s+n.index+i+1),text:D,tokens:this.lexer.inlineTokens(D,[])}}}else a+=i}}},t.codespan=function(e){var t=this.rules.inline.code.exec(e);if(t){var u=t[2].replace(/\n/g," "),n=/[^ ]/.test(u),e=/^ /.test(u)&&/ $/.test(u);return n&&e&&(u=u.substring(1,u.length-1)),u=Z(u,!0),{type:"codespan",raw:t[0],text:u}}},t.br=function(e){e=this.rules.inline.br.exec(e);if(e)return{type:"br",raw:e[0]}},t.del=function(e){e=this.rules.inline.del.exec(e);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2],[])}},t.autolink=function(e,t){e=this.rules.inline.autolink.exec(e);if(e){var u,t="@"===e[2]?"mailto:"+(u=Z(this.options.mangle?t(e[1]):e[1])):u=Z(e[1]);return{type:"link",raw:e[0],text:u,href:t,tokens:[{type:"text",raw:u,text:u}]}}},t.url=function(e,t){var u,n,r,i;if(u=this.rules.inline.url.exec(e)){if("@"===u[2])r="mailto:"+(n=Z(this.options.mangle?t(u[0]):u[0]));else{for(;i=u[0],u[0]=this.rules.inline._backpedal.exec(u[0])[0],i!==u[0];);n=Z(u[0]),r="www."===u[1]?"http://"+n:n}return{type:"link",raw:u[0],text:n,href:r,tokens:[{type:"text",raw:n,text:n}]}}},t.inlineText=function(e,t){e=this.rules.inline.text.exec(e);if(e){t=this.lexer.state.inRawBlock?this.options.sanitize?this.options.sanitizer?this.options.sanitizer(e[0]):Z(e[0]):e[0]:Z(this.options.smartypants?t(e[0]):e[0]);return{type:"text",raw:e[0],text:t}}},e}(),y=w,z=b,w=v,b={newline:/^(?: *(?:\n|$))+/,code:/^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,fences:/^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?=\n|$)|$)/,hr:/^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,heading:/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,blockquote:/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,list:/^( {0,3}bull)( [^\n]+?)?(?:\n|$)/,html:"^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",def:/^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,table:y,lheading:/^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,_paragraph:/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html| +\n)[^\n]+)*)/,text:/^[^\n]+/,_label:/(?!\s*\])(?:\\[\[\]]|[^\[\]])+/,_title:/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/};b.def=z(b.def).replace("label",b._label).replace("title",b._title).getRegex(),b.bullet=/(?:[*+-]|\d{1,9}[.)])/,b.listItemStart=z(/^( *)(bull) */).replace("bull",b.bullet).getRegex(),b.list=z(b.list).replace(/bull/g,b.bullet).replace("hr","\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def","\\n+(?="+b.def.source+")").getRegex(),b._tag="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",b._comment=/<!--(?!-?>)[\s\S]*?(?:-->|$)/,b.html=z(b.html,"i").replace("comment",b._comment).replace("tag",b._tag).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),b.paragraph=z(b._paragraph).replace("hr",b.hr).replace("heading"," {0,3}#{1,6} ").replace("|lheading","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",b._tag).getRegex(),b.blockquote=z(b.blockquote).replace("paragraph",b.paragraph).getRegex(),b.normal=w({},b),b.gfm=w({},b.normal,{table:"^ *([^\\n ].*\\|.*)\\n {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)\\|?(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"}),b.gfm.table=z(b.gfm.table).replace("hr",b.hr).replace("heading"," {0,3}#{1,6} ").replace("blockquote"," {0,3}>").replace("code"," {4}[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",b._tag).getRegex(),b.pedantic=w({},b.normal,{html:z("^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:\"[^\"]*\"|'[^']*'|\\s[^'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))").replace("comment",b._comment).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:y,paragraph:z(b.normal._paragraph).replace("hr",b.hr).replace("heading"," *#{1,6} *[^\n]").replace("lheading",b.lheading).replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").getRegex()});y={escape:/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,autolink:/^<(scheme:[^\s\x00-\x1f<>]*|email)>/,url:y,tag:"^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",link:/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,reflink:/^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,nolink:/^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,reflinkSearch:"reflink|nolink(?!\\()",emStrong:{lDelim:/^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,rDelimAst:/\_\_[^_*]*?\*[^_*]*?\_\_|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,rDelimUnd:/\*\*[^_*]*?\_[^_*]*?\*\*|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/},code:/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,br:/^( {2,}|\\)\n(?!\s*$)/,del:y,text:/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,punctuation:/^([\spunctuation])/,_punctuation:"!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~"};y.punctuation=z(y.punctuation).replace(/punctuation/g,y._punctuation).getRegex(),y.blockSkip=/\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g,y.escapedEmSt=/\\\*|\\_/g,y._comment=z(b._comment).replace("(?:--\x3e|$)","--\x3e").getRegex(),y.emStrong.lDelim=z(y.emStrong.lDelim).replace(/punct/g,y._punctuation).getRegex(),y.emStrong.rDelimAst=z(y.emStrong.rDelimAst,"g").replace(/punct/g,y._punctuation).getRegex(),y.emStrong.rDelimUnd=z(y.emStrong.rDelimUnd,"g").replace(/punct/g,y._punctuation).getRegex(),y._escapes=/\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g,y._scheme=/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/,y._email=/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,y.autolink=z(y.autolink).replace("scheme",y._scheme).replace("email",y._email).getRegex(),y._attribute=/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/,y.tag=z(y.tag).replace("comment",y._comment).replace("attribute",y._attribute).getRegex(),y._label=/(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,y._href=/<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/,y._title=/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/,y.link=z(y.link).replace("label",y._label).replace("href",y._href).replace("title",y._title).getRegex(),y.reflink=z(y.reflink).replace("label",y._label).getRegex(),y.reflinkSearch=z(y.reflinkSearch,"g").replace("reflink",y.reflink).replace("nolink",y.nolink).getRegex(),y.normal=w({},y),y.pedantic=w({},y.normal,{strong:{start:/^__|\*\*/,middle:/^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,endAst:/\*\*(?!\*)/g,endUnd:/__(?!_)/g},em:{start:/^_|\*/,middle:/^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,endAst:/\*(?!\*)/g,endUnd:/_(?!_)/g},link:z(/^!?\[(label)\]\((.*?)\)/).replace("label",y._label).getRegex(),reflink:z(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",y._label).getRegex()}),y.gfm=w({},y.normal,{escape:z(y.escape).replace("])","~|])").getRegex(),_extended_email:/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,url:/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,_backpedal:/(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,text:/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/}),y.gfm.url=z(y.gfm.url,"i").replace("email",y.gfm._extended_email).getRegex(),y.breaks=w({},y.gfm,{br:z(y.br).replace("{2,}","*").getRegex(),text:z(y.gfm.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()});var b={block:b,inline:y},j=_,L=t.exports.defaults,Q=b.block,U=b.inline,P=S;function M(e){return e.replace(/---/g,"—").replace(/--/g,"–").replace(/(^|[-\u2014/(\[{"\s])'/g,"$1‘").replace(/'/g,"’").replace(/(^|[-\u2014/(\[{\u2018\s])"/g,"$1“").replace(/"/g,"”").replace(/\.{3}/g,"…")}function N(e){for(var t,u="",n=e.length,r=0;r<n;r++)t=e.charCodeAt(r),u+="&#"+(t=.5<Math.random()?"x"+t.toString(16):t)+";";return u}var y=function(){function u(e){this.tokens=[],this.tokens.links=Object.create(null),this.options=e||L,this.options.tokenizer=this.options.tokenizer||new j,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,(this.tokenizer.lexer=this).inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};e={block:Q.normal,inline:U.normal};this.options.pedantic?(e.block=Q.pedantic,e.inline=U.pedantic):this.options.gfm&&(e.block=Q.gfm,this.options.breaks?e.inline=U.breaks:e.inline=U.gfm),this.tokenizer.rules=e}u.lex=function(e,t){return new u(t).lex(e)},u.lexInline=function(e,t){return new u(t).inlineTokens(e)};var e,t,n=u.prototype;return n.lex=function(e){var t;for(e=e.replace(/\r\n|\r/g,"\n").replace(/\t/g,"    "),this.blockTokens(e,this.tokens);t=this.inlineQueue.shift();)this.inlineTokens(t.src,t.tokens);return this.tokens},n.blockTokens=function(r,t){var u,e,i,n,s=this;for(void 0===t&&(t=[]),this.options.pedantic&&(r=r.replace(/^ +$/gm,""));r;)if(!(this.options.extensions&&this.options.extensions.block&&this.options.extensions.block.some(function(e){return!!(u=e.call({lexer:s},r,t))&&(r=r.substring(u.raw.length),t.push(u),!0)})))if(u=this.tokenizer.space(r))r=r.substring(u.raw.length),u.type&&t.push(u);else if(u=this.tokenizer.code(r))r=r.substring(u.raw.length),!(e=t[t.length-1])||"paragraph"!==e.type&&"text"!==e.type?t.push(u):(e.raw+="\n"+u.raw,e.text+="\n"+u.text,this.inlineQueue[this.inlineQueue.length-1].src=e.text);else if(u=this.tokenizer.fences(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.heading(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.hr(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.blockquote(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.list(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.html(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.def(r))r=r.substring(u.raw.length),!(e=t[t.length-1])||"paragraph"!==e.type&&"text"!==e.type?this.tokens.links[u.tag]||(this.tokens.links[u.tag]={href:u.href,title:u.title}):(e.raw+="\n"+u.raw,e.text+="\n"+u.raw,this.inlineQueue[this.inlineQueue.length-1].src=e.text);else if(u=this.tokenizer.table(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.lheading(r))r=r.substring(u.raw.length),t.push(u);else if(i=r,this.options.extensions&&this.options.extensions.startBlock&&function(){var t,u=1/0,n=r.slice(1);s.options.extensions.startBlock.forEach(function(e){"number"==typeof(t=e.call({lexer:this},n))&&0<=t&&(u=Math.min(u,t))}),u<1/0&&0<=u&&(i=r.substring(0,u+1))}(),this.state.top&&(u=this.tokenizer.paragraph(i)))e=t[t.length-1],n&&"paragraph"===e.type?(e.raw+="\n"+u.raw,e.text+="\n"+u.text,this.inlineQueue.pop(),this.inlineQueue[this.inlineQueue.length-1].src=e.text):t.push(u),n=i.length!==r.length,r=r.substring(u.raw.length);else if(u=this.tokenizer.text(r))r=r.substring(u.raw.length),(e=t[t.length-1])&&"text"===e.type?(e.raw+="\n"+u.raw,e.text+="\n"+u.text,this.inlineQueue.pop(),this.inlineQueue[this.inlineQueue.length-1].src=e.text):t.push(u);else if(r){var l="Infinite loop on byte: "+r.charCodeAt(0);if(this.options.silent){console.error(l);break}throw new Error(l)}return this.state.top=!0,t},n.inline=function(e,t){this.inlineQueue.push({src:e,tokens:t})},n.inlineTokens=function(r,t){var u,e,i,s=this;void 0===t&&(t=[]);var n,l,a,o=r;if(this.tokens.links){var D=Object.keys(this.tokens.links);if(0<D.length)for(;null!=(n=this.tokenizer.rules.inline.reflinkSearch.exec(o));)D.includes(n[0].slice(n[0].lastIndexOf("[")+1,-1))&&(o=o.slice(0,n.index)+"["+P("a",n[0].length-2)+"]"+o.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;null!=(n=this.tokenizer.rules.inline.blockSkip.exec(o));)o=o.slice(0,n.index)+"["+P("a",n[0].length-2)+"]"+o.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);for(;null!=(n=this.tokenizer.rules.inline.escapedEmSt.exec(o));)o=o.slice(0,n.index)+"++"+o.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);for(;r;)if(l||(a=""),l=!1,!(this.options.extensions&&this.options.extensions.inline&&this.options.extensions.inline.some(function(e){return!!(u=e.call({lexer:s},r,t))&&(r=r.substring(u.raw.length),t.push(u),!0)})))if(u=this.tokenizer.escape(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.tag(r))r=r.substring(u.raw.length),(e=t[t.length-1])&&"text"===u.type&&"text"===e.type?(e.raw+=u.raw,e.text+=u.text):t.push(u);else if(u=this.tokenizer.link(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.reflink(r,this.tokens.links))r=r.substring(u.raw.length),(e=t[t.length-1])&&"text"===u.type&&"text"===e.type?(e.raw+=u.raw,e.text+=u.text):t.push(u);else if(u=this.tokenizer.emStrong(r,o,a))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.codespan(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.br(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.del(r))r=r.substring(u.raw.length),t.push(u);else if(u=this.tokenizer.autolink(r,N))r=r.substring(u.raw.length),t.push(u);else if(this.state.inLink||!(u=this.tokenizer.url(r,N))){if(i=r,this.options.extensions&&this.options.extensions.startInline&&function(){var t,u=1/0,n=r.slice(1);s.options.extensions.startInline.forEach(function(e){"number"==typeof(t=e.call({lexer:this},n))&&0<=t&&(u=Math.min(u,t))}),u<1/0&&0<=u&&(i=r.substring(0,u+1))}(),u=this.tokenizer.inlineText(i,M))r=r.substring(u.raw.length),"_"!==u.raw.slice(-1)&&(a=u.raw.slice(-1)),l=!0,(e=t[t.length-1])&&"text"===e.type?(e.raw+=u.raw,e.text+=u.text):t.push(u);else if(r){var c="Infinite loop on byte: "+r.charCodeAt(0);if(this.options.silent){console.error(c);break}throw new Error(c)}}else r=r.substring(u.raw.length),t.push(u);return t},e=u,t=[{key:"rules",get:function(){return{block:Q,inline:U}}}],(n=null)&&r(e.prototype,n),t&&r(e,t),u}(),X=t.exports.defaults,G=B,V=x,b=function(){function e(e){this.options=e||X}var t=e.prototype;return t.code=function(e,t,u){var n=(t||"").match(/\S*/)[0];return!this.options.highlight||null!=(t=this.options.highlight(e,n))&&t!==e&&(u=!0,e=t),e=e.replace(/\n$/,"")+"\n",n?'<pre><code class="'+this.options.langPrefix+V(n,!0)+'">'+(u?e:V(e,!0))+"</code></pre>\n":"<pre><code>"+(u?e:V(e,!0))+"</code></pre>\n"},t.blockquote=function(e){return"<blockquote>\n"+e+"</blockquote>\n"},t.html=function(e){return e},t.heading=function(e,t,u,n){return this.options.headerIds?"<h"+t+' id="'+this.options.headerPrefix+n.slug(u)+'">'+e+"</h"+t+">\n":"<h"+t+">"+e+"</h"+t+">\n"},t.hr=function(){return this.options.xhtml?"<hr/>\n":"<hr>\n"},t.list=function(e,t,u){var n=t?"ol":"ul";return"<"+n+(t&&1!==u?' start="'+u+'"':"")+">\n"+e+"</"+n+">\n"},t.listitem=function(e){return"<li>"+e+"</li>\n"},t.checkbox=function(e){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"'+(this.options.xhtml?" /":"")+"> "},t.paragraph=function(e){return"<p>"+e+"</p>\n"},t.table=function(e,t){return"<table>\n<thead>\n"+e+"</thead>\n"+(t=t&&"<tbody>"+t+"</tbody>")+"</table>\n"},t.tablerow=function(e){return"<tr>\n"+e+"</tr>\n"},t.tablecell=function(e,t){var u=t.header?"th":"td";return(t.align?"<"+u+' align="'+t.align+'">':"<"+u+">")+e+"</"+u+">\n"},t.strong=function(e){return"<strong>"+e+"</strong>"},t.em=function(e){return"<em>"+e+"</em>"},t.codespan=function(e){return"<code>"+e+"</code>"},t.br=function(){return this.options.xhtml?"<br/>":"<br>"},t.del=function(e){return"<del>"+e+"</del>"},t.link=function(e,t,u){if(null===(e=G(this.options.sanitize,this.options.baseUrl,e)))return u;e='<a href="'+V(e)+'"';return t&&(e+=' title="'+t+'"'),e+=">"+u+"</a>"},t.image=function(e,t,u){if(null===(e=G(this.options.sanitize,this.options.baseUrl,e)))return u;u='<img src="'+e+'" alt="'+u+'"';return t&&(u+=' title="'+t+'"'),u+=this.options.xhtml?"/>":">"},t.text=function(e){return e},e}(),S=function(){function e(){}var t=e.prototype;return t.strong=function(e){return e},t.em=function(e){return e},t.codespan=function(e){return e},t.del=function(e){return e},t.html=function(e){return e},t.text=function(e){return e},t.link=function(e,t,u){return""+u},t.image=function(e,t,u){return""+u},t.br=function(){return""},e}(),B=function(){function e(){this.seen={}}var t=e.prototype;return t.serialize=function(e){return e.toLowerCase().trim().replace(/<[!\/a-z].*?>/gi,"").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g,"").replace(/\s/g,"-")},t.getNextSafeSlug=function(e,t){var u=e,n=0;if(this.seen.hasOwnProperty(u))for(n=this.seen[e];u=e+"-"+ ++n,this.seen.hasOwnProperty(u););return t||(this.seen[e]=n,this.seen[u]=0),u},t.slug=function(e,t){void 0===t&&(t={});var u=this.serialize(e);return this.getNextSafeSlug(u,t.dryrun)},e}(),H=b,J=S,K=B,W=t.exports.defaults,Y=m,ee=y,te=function(){function u(e){this.options=e||W,this.options.renderer=this.options.renderer||new H,this.renderer=this.options.renderer,this.renderer.options=this.options,this.textRenderer=new J,this.slugger=new K}u.parse=function(e,t){return new u(t).parse(e)},u.parseInline=function(e,t){return new u(t).parseInline(e)};var e=u.prototype;return e.parse=function(e,t){void 0===t&&(t=!0);for(var u,n,r,i,s,l,a,o,D,c,h,p,f,g,F,A,C="",d=e.length,k=0;k<d;k++)if(o=e[k],!(this.options.extensions&&this.options.extensions.renderers&&this.options.extensions.renderers[o.type])||!1===(A=this.options.extensions.renderers[o.type].call({parser:this},o))&&["space","hr","heading","code","table","blockquote","list","html","paragraph","text"].includes(o.type))switch(o.type){case"space":continue;case"hr":C+=this.renderer.hr();continue;case"heading":C+=this.renderer.heading(this.parseInline(o.tokens),o.depth,Y(this.parseInline(o.tokens,this.textRenderer)),this.slugger);continue;case"code":C+=this.renderer.code(o.text,o.lang,o.escaped);continue;case"table":for(l=D="",r=o.header.length,u=0;u<r;u++)l+=this.renderer.tablecell(this.parseInline(o.header[u].tokens),{header:!0,align:o.align[u]});for(D+=this.renderer.tablerow(l),a="",r=o.rows.length,u=0;u<r;u++){for(l="",i=(s=o.rows[u]).length,n=0;n<i;n++)l+=this.renderer.tablecell(this.parseInline(s[n].tokens),{header:!1,align:o.align[n]});a+=this.renderer.tablerow(l)}C+=this.renderer.table(D,a);continue;case"blockquote":a=this.parse(o.tokens),C+=this.renderer.blockquote(a);continue;case"list":for(D=o.ordered,E=o.start,c=o.loose,r=o.items.length,a="",u=0;u<r;u++)f=(p=o.items[u]).checked,g=p.task,h="",p.task&&(F=this.renderer.checkbox(f),c?0<p.tokens.length&&"paragraph"===p.tokens[0].type?(p.tokens[0].text=F+" "+p.tokens[0].text,p.tokens[0].tokens&&0<p.tokens[0].tokens.length&&"text"===p.tokens[0].tokens[0].type&&(p.tokens[0].tokens[0].text=F+" "+p.tokens[0].tokens[0].text)):p.tokens.unshift({type:"text",text:F}):h+=F),h+=this.parse(p.tokens,c),a+=this.renderer.listitem(h,g,f);C+=this.renderer.list(a,D,E);continue;case"html":C+=this.renderer.html(o.text);continue;case"paragraph":C+=this.renderer.paragraph(this.parseInline(o.tokens));continue;case"text":for(a=o.tokens?this.parseInline(o.tokens):o.text;k+1<d&&"text"===e[k+1].type;)a+="\n"+((o=e[++k]).tokens?this.parseInline(o.tokens):o.text);C+=t?this.renderer.paragraph(a):a;continue;default:var E='Token with "'+o.type+'" type was not found.';if(this.options.silent)return void console.error(E);throw new Error(E)}else C+=A||"";return C},e.parseInline=function(e,t){t=t||this.renderer;for(var u,n,r="",i=e.length,s=0;s<i;s++)if(u=e[s],!(this.options.extensions&&this.options.extensions.renderers&&this.options.extensions.renderers[u.type])||!1===(n=this.options.extensions.renderers[u.type].call({parser:this},u))&&["escape","html","link","image","strong","em","codespan","br","del","text"].includes(u.type))switch(u.type){case"escape":r+=t.text(u.text);break;case"html":r+=t.html(u.text);break;case"link":r+=t.link(u.href,u.title,this.parseInline(u.tokens,t));break;case"image":r+=t.image(u.href,u.title,u.text);break;case"strong":r+=t.strong(this.parseInline(u.tokens,t));break;case"em":r+=t.em(this.parseInline(u.tokens,t));break;case"codespan":r+=t.codespan(u.text);break;case"br":r+=t.br();break;case"del":r+=t.del(this.parseInline(u.tokens,t));break;case"text":r+=t.text(u.text);break;default:var l='Token with "'+u.type+'" type was not found.';if(this.options.silent)return void console.error(l);throw new Error(l)}else r+=n||"";return r},u}(),ue=_,ne=b,S=S,B=B,re=v,ie=$,se=x,$=t.exports.getDefaults,le=t.exports.changeDefaults,x=t.exports.defaults;function ae(e,u,n){if(null==e)throw new Error("marked(): input parameter is undefined or null");if("string"!=typeof e)throw new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected");if("function"==typeof u&&(n=u,u=null),u=re({},ae.defaults,u||{}),ie(u),n){var r,i=u.highlight;try{r=ee.lex(e,u)}catch(e){return n(e)}var s=function(t){var e;if(!t)try{u.walkTokens&&ae.walkTokens(r,u.walkTokens),e=te.parse(r,u)}catch(e){t=e}return u.highlight=i,t?n(t):n(null,e)};if(!i||i.length<3)return s();if(delete u.highlight,!r.length)return s();var l=0;return ae.walkTokens(r,function(u){"code"===u.type&&(l++,setTimeout(function(){i(u.text,u.lang,function(e,t){return e?s(e):(null!=t&&t!==u.text&&(u.text=t,u.escaped=!0),void(0===--l&&s()))})},0))}),void(0===l&&s())}try{var t=ee.lex(e,u);return u.walkTokens&&ae.walkTokens(t,u.walkTokens),te.parse(t,u)}catch(e){if(e.message+="\nPlease report this to https://github.com/markedjs/marked.",u.silent)return"<p>An error occurred:</p><pre>"+se(e.message+"",!0)+"</pre>";throw e}}return ae.options=ae.setOptions=function(e){return re(ae.defaults,e),le(ae.defaults),ae},ae.getDefaults=$,ae.defaults=x,ae.use=function(){for(var u=this,e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];var r,i=re.apply(void 0,[{}].concat(t)),s=ae.defaults.extensions||{renderers:{},childTokens:{}};t.forEach(function(l){var t;l.extensions&&(r=!0,l.extensions.forEach(function(r){if(!r.name)throw new Error("extension name required");var i;if(r.renderer&&(i=s.renderers?s.renderers[r.name]:null,s.renderers[r.name]=i?function(){for(var e=arguments.length,t=new Array(e),u=0;u<e;u++)t[u]=arguments[u];var n=r.renderer.apply(this,t);return n=!1===n?i.apply(this,t):n}:r.renderer),r.tokenizer){if(!r.level||"block"!==r.level&&"inline"!==r.level)throw new Error("extension level must be 'block' or 'inline'");s[r.level]?s[r.level].unshift(r.tokenizer):s[r.level]=[r.tokenizer],r.start&&("block"===r.level?s.startBlock?s.startBlock.push(r.start):s.startBlock=[r.start]:"inline"===r.level&&(s.startInline?s.startInline.push(r.start):s.startInline=[r.start]))}r.childTokens&&(s.childTokens[r.name]=r.childTokens)})),l.renderer&&function(){var e,s=ae.defaults.renderer||new ne;for(e in l.renderer)!function(r){var i=s[r];s[r]=function(){for(var e=arguments.length,t=new Array(e),u=0;u<e;u++)t[u]=arguments[u];var n=l.renderer[r].apply(s,t);return n=!1===n?i.apply(s,t):n}}(e);i.renderer=s}(),l.tokenizer&&function(){var e,s=ae.defaults.tokenizer||new ue;for(e in l.tokenizer)!function(r){var i=s[r];s[r]=function(){for(var e=arguments.length,t=new Array(e),u=0;u<e;u++)t[u]=arguments[u];var n=l.tokenizer[r].apply(s,t);return n=!1===n?i.apply(s,t):n}}(e);i.tokenizer=s}(),l.walkTokens&&(t=ae.defaults.walkTokens,i.walkTokens=function(e){l.walkTokens.call(u,e),t&&t(e)}),r&&(i.extensions=s),ae.setOptions(i)})},ae.walkTokens=function(e,l){for(var a,t=o(e);!(a=t()).done;)!function(){var t=a.value;switch(l(t),t.type){case"table":for(var e=o(t.header);!(u=e()).done;){var u=u.value;ae.walkTokens(u.tokens,l)}for(var n,r=o(t.rows);!(n=r()).done;)for(var i=o(n.value);!(s=i()).done;){var s=s.value;ae.walkTokens(s.tokens,l)}break;case"list":ae.walkTokens(t.items,l);break;default:ae.defaults.extensions&&ae.defaults.extensions.childTokens&&ae.defaults.extensions.childTokens[t.type]?ae.defaults.extensions.childTokens[t.type].forEach(function(e){ae.walkTokens(t[e],l)}):t.tokens&&ae.walkTokens(t.tokens,l)}}()},ae.parseInline=function(e,t){if(null==e)throw new Error("marked.parseInline(): input parameter is undefined or null");if("string"!=typeof e)throw new Error("marked.parseInline(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected");t=re({},ae.defaults,t||{}),ie(t);try{var u=ee.lexInline(e,t);return t.walkTokens&&ae.walkTokens(u,t.walkTokens),te.parseInline(u,t)}catch(e){if(e.message+="\nPlease report this to https://github.com/markedjs/marked.",t.silent)return"<p>An error occurred:</p><pre>"+se(e.message+"",!0)+"</pre>";throw e}},ae.Parser=te,ae.parser=te.parse,ae.Renderer=ne,ae.TextRenderer=S,ae.Lexer=ee,ae.lexer=ee.lex,ae.Tokenizer=ue,ae.Slugger=B,ae.parse=ae})();

    window.parse = parseMarkdownText;
    function parseMarkdownText(text) {
        // First, we go through the text looking for [code] ... [/code] delimiters. Delimiters that
        // are empty or only have spaces in between them are unwrapped and replaced with its inner
        // contents since there is no code inside them that matters, and it will allow the markdown
        // parser to read them as spaces instead of "[code][/code]" text. Any [code] blocks that
        // were not removed because they have non-space content inside them is completely emptied
        // out to leave only "[code][/code]". When Marked parses the text, that will allow it to
        // ignore all the text inside the [code] blocks and treat it as a regular span of text. Once
        // it has been parsed, we go back through and replace each "[code][/code]" marker with all
        // the text was original inside them so that the text inside remains unparsed. 

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
            
            // Keep track of how many nested "[code] ... [/code]" blocks we find. Start at 1 since
            // we just found the first "[code]".
            let codeInstances = 1;
            // Keep going until we get to 0 codeInstances to indicate we found a matching closing
            // "[/code]".
            while (codeInstances) {
                // Get the indices for the next "[code]" and "[/code]".
                let startIndex = text.indexOf("[code]");
                let endIndex = text.indexOf("[/code]");

                // If there is no "[/code]" block, it means we've reached the end of the string
                // without being able to close it. Add on an extra "[/code]" to the end so we can
                // parse it on the next iteration.
                if (!~endIndex) {
                    text += "[/code]";
                    continue;
                }

                if (~startIndex && startIndex < endIndex) {
                    // If there is a "[code]" that comes before a "[/code]", it means we found a
                    // nested "[code]", and will need to find an extra "[/code]". Nested [code]s
                    // are ignored by ServiceNow, so we can just remove the "[code]" and "[/code]"
                    // altogether.
                    // Add the text up to the "[code]" to the code block's text.
                    codeBlock += text.substring(0, startIndex);
                    // Remove the text up to and including the "[code]" so we can parse inside of
                    // it.
                    text = text.substring(startIndex + 6);
                    // Increment codeInstances we know to look for an extra "[/code]" block.
                    codeInstances++;
                } else {
                    // If we found a closing "[/code]", we add all the text up to the "[/code]" to
                    // the code block.
                    codeBlock += text.substring(0, endIndex);
                    // Remove the "[/code]" from the text so we can parse after it now.
                    text = text.substring(endIndex + 7);
                    // Decrement codeInstances so we know how many more "[/code]" blocks to look
                    // for/
                    codeInstances--;
                }
            }

            // Now we've parsed all the text inside a "[code][/code]" block and removed any nested
            // "[code][/code]" blocks that may have been inside. If the content of the code block
            // is just spaces, or nothing, we don't need to add this [code] block to the filtered-
            // Text so that Marked will just treat it as space instead of text.
            if (codeBlock.replace(/ +/, "") == "") {
                // Just add the spaces directly.
                filteredText += codeBlock;
            } else {
                // Otherwise, we will add a "[code][/code]" to serve as a marker for when we need to
                // go back and insert the text again.
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

        // Now we go back through and replace instances of "[code][/code]" with the corresponding
        // code block.
        let codeIndex;
        while (~(codeIndex = filteredText.lastIndexOf("[code][/code]"))) {
            filteredText = filteredText.substring(0, codeIndex + 6) + (codeBlocks.pop() || "") + filteredText.substring(codeIndex + 6);
        }

        // Sometimes, newlines ("\n") seem to slip in sometimes, even though new lines in text are
        // *supposed* to be converted to <br>s. We just replace any lingering newlines into "" to
        // get rid of these.
        filteredText = filteredText.replace(/\n/g, "");

        // Now, to shorten the text a bit, get rid of any "[/code][code]" substrings (i.e., the end
        // of a [code] block followed immediately by the start of a code block) so that we can just
        // collapse adjacent [code] blocks.
        filteredText = filteredText.replace(/\[\/code\]\[code\]/g, "");

        return filteredText
    }
    marked.use({
        renderer: {
            code: function(code, infostring, escaped) {
                return `[code]<pre><code>[/code]${code.replace(/\n/g, "[code]<br>[/code]")}[code]</code></pre>[/code]`;
            },
            blockquote: function(quote) {
                return `[code]<blockquote>[/code]${quote}[code]</blockquote>[/code]`;
            },
            // HTML is treated as plain text instead of trying to render it, so we don't wrap it in
            // [code] ... [/code] blocks.
            // html: function(html) {},
            heading: function(text, level, raw, slugger) {
                return `[code]<h${level}>[/code]${text}[code]</h${level}>[/code]`;
            },
            hr: function() {
                return `[code]<hr/>[/code]`;
            },
            list: function(body, ordered, start) {
                return `[code]<${ordered ? `ol${start == 1 ? "" : ` start="${start}"`}` : "ul"}>[/code]\n${body}[code]</${ordered ? "o" : "u"}l>[/code]`;
            },
            listitem: function(text, task, checked) {
                return `[code]<li>[/code]${text}[code]</li>[/code]`;
            },
            checkbox: function(checked) {
                return `[code]<input type="checkbox" disabled${checked ? " checked" : ""}>[/code] `;
            },
            paragraph: function(text) {
                return `[code]<p>[/code]${text}[code]</p>[/code]`;
            },
            table: function(header, body) {
                return `[code]<table><thead>[/code]${header}[code]</thead><tbody>[/code]${body}[code]</tbody></table>[/code]`;
            },
            tablerow: function(content) {
                return `[code]<tr>[/code]${content}[code]</tr>[/code]`;
            },
            tablecell: function(content, flags) {
                return `[code]<td${flags.align ? ` style="text-align:${flags.align}"` : ""}>[/code]${content}[code]</td>[/code]`
            },
            strong: function(text) {
                return `[code]<strong>[/code]${text}[code]</strong>[/code]`;
            },
            em: function(text) {
                return `[code]<em>[/code]${text}[code]</em>[/code]`;
            },
            codespan: function(code) {
                return `[code]<code>[/code]${code}[code]</code>[/code]`
            },
            br: function() {
                return "[code]<br/>[/code]";
            },
            del: function(text) {
                return `[code]<span style="text-decoration:line-through"><del>[/code]${text}[code]</del></span>[/code]`
            },
            link: function(href, title, text) {
                return `[code]<a href="${href}"${title ? ` title="${title}"`: ""}>[/code]${text}[code]</a>[/code]`;
            },
            image: function(src, title, text) {
                return `[code]<img style="max-width:100%" src="${src}"${text ? ` alt="${text}"` : ""}${title ? ` title="${title}"` : ""}/>[/code]`
            },
            text: function(text) {
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
                    let index = src.indexOf("[code][/code]");
                    return ~index ? index : src.length;
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
            }
        ]
    });

    function dedent(string) {
        let lines = string.split("\n");
        let longestCommonPrefix = null;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (!lines[i].trim().length) {
                lines[i] = "";
                continue;
            }
            let prefix = lines[i].substring(0, lines[i].length - lines[i].trimLeft().length);
            if (longestCommonPrefix == null) {
                longestCommonPrefix = prefix;
                continue;
            }
            if (prefix == longestCommonPrefix) {
                continue;
            }
            let shorter = prefix.length < longestCommonPrefix.length ? prefix : longestCommonPrefix;
            let longer = prefix.length < longestCommonPrefix.length ? longestCommonPrefix : prefix;
            for (let i = 1; i < shorter.length; i++) {
                if (shorter.substring(0, i) != longer.substring(0, i)) {
                    longestCommonPrefix = shorter.substring(0, i - 1);
                    if (i == 1) {
                        break;
                    }
                    continue;
                }
            }
            longestCommonPrefix = shorter;
        }
        if (longestCommonPrefix) {
            for (let i = lines.length - 1; i >= 0; i--) {
                lines[i] = lines[i].substring(longestCommonPrefix.length);
            }
        }
        while (lines[lines.length - 1] == "") {
            lines.pop();
        }
        while (lines[0] == "") {
            lines.shift();
        }
        return lines.join("\n");
    }

    const CURSOR_REGEX = /\$\{CURSOR\((?:"((?:[^"]|\\")*)")?\)\}/;
    function CURSOR(defaultValue) {
        return defaultValue === undefined || defaultValue === null || defaultValue === "" ?
            "${CURSOR()}" :
            '${CURSOR("' + defaultValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '")}'; // Encode as URI to prevent nested "}"
    }

    let textareaDatas = new Map();
    function updateTextareas() {
        for (const [textarea, textareaData] of textareaDatas) {
            if (!document.body.contains(textarea)) {
                textareaDatas.delete(textarea);
                if (textareaData.mirror.parentNode) textareaData.mirror.parentNode.removeChild(textareaData.mirror);
                if (textareaData.autoFiller.parentNode) textareaData.autoFiller.parentNode.removeChild(textareaData.autoFiller);
                if (textareaData.markdownPreviewer.parentNode) textareaData.markdownPreviewer.parentNode.removeChild(textareaData.markdownPreviewer);
                textareaData.elementParent.removeEventListener("focusout", textareaData.elementParentFocusOutListener);
            }
        }
    }

    function getIncompleteTrigger(textareaData) {
        // If there are less characters in the textarea than there are characters in START_DELIMITER,
        // there's no way that our caret is positioned after a start delimiter.
        if (textareaData.element.selectionStart < START_DELIMITER.length) {
            return null;
        }
        // Determine if our caret is positioned after a starting delimiter, but not if there is an end-
        // ing delimiter that closes it.
        let startDelimIndex = textareaData.element.value.lastIndexOf(START_DELIMITER, textareaData.element.selectionStart - START_DELIMITER.length);
        let endDelimIndex = textareaData.element.value.lastIndexOf(END_DELIMITER, textareaData.element.selectionStart - 1);
        if (!~startDelimIndex || (~endDelimIndex && startDelimIndex < endDelimIndex)) {
            return null;
        }

        // Return the text from the starting delimiter up to the caret.
        return textareaData.element.value.substring(startDelimIndex + START_DELIMITER.length, textareaData.element.selectionStart);
    }

    function focusAutoFillItem(textareaData) {
        let index = textareaData.autoFillerFocusedIndex;
        let children = textareaData.autoFiller.children;
        // If the index is out of bounds, do nothing.
        if (index < 0 || index >= children.length) {
            return;
        }
        // Reset other elements that previously had artificial-focusing set to true.
        for (const elem of textareaData.autoFiller.querySelectorAll(`[data-${CSS_PREFIX}-artificial-focusing="true"]`)) {
            elem.setAttribute(`data-${CSS_PREFIX}-artificial-focusing`, "false");
            if (elem.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && elem.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true") {
                elem.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
            }
        }
        // Set the now-focused element to artificial-focusing=true
        children[index].setAttribute(`data-${CSS_PREFIX}-artificial-focusing`, "true");
        children[index].firstElementChild.classList.add("sn-card-component_accent-bar_dark");
        // Scroll it into view to appear as if it is focused.
        if (typeof children[index].scrollIntoViewIfNeeded == "function") {
            children[index].scrollIntoViewIfNeeded();
        }
    }

    function showOrHideAutoFiller(textareaData) {
        let incompleteMacro = getIncompleteTrigger(textareaData);

        // If we are not currently typing out a macro, we can hide the autoFiller and return.
        if (incompleteMacro === null || document.activeElement != textareaData.element) {
            textareaData.autoFiller.style.display = "none";
            textareaData.autoFilling = false;
            return;
        }

        // Otherwise, we want to show the autoFiller and calculate where to show it.
        textareaData.autoFiller.style.display = "block";

        // Copy the textarea's content to the mirror. We first paste all the text up to the starting
        // delimiter. Then, we insert a <span> with the start delimiter, as well as the word that
        // follows it (i.e., everything up to the next space). Then we calculate the vertical and
        // horizontal position of the span to determine where to place the autoFiller box.
        let startDelimIndex = textareaData.element.value.lastIndexOf(START_DELIMITER, textareaData.element.selectionStart - START_DELIMITER.length);
        textareaData.mirror.innerText = textareaData.element.value.substring(0, startDelimIndex);
        let caret = document.createElement("span");
        let spaceIndex = textareaData.element.value.indexOf(" ", startDelimIndex);
        // We count a newline or tab as whitespace too since the browser may wrap at those points.
        let newlineIndex = textareaData.element.value.indexOf("\n", startDelimIndex);
        let tabIndex = textareaData.element.value.indexOf("\t", startDelimIndex);
        let whiteSpaceIndex = textareaData.element.selectionStart;
        if (~spaceIndex) {
            whiteSpaceIndex = Math.min(spaceIndex, whiteSpaceIndex);
        }
        if (~newlineIndex) {
            whiteSpaceIndex = Math.min(newlineIndex, whiteSpaceIndex);
        }
        if (~tabIndex) {
            whiteSpaceIndex = Math.min(tabIndex, whiteSpaceIndex);
        }
        caret.innerText = textareaData.element.value.substring(startDelimIndex, whiteSpaceIndex);
        textareaData.mirror.appendChild(caret);
        textareaData.caretTop = textareaData.mirror.getBoundingClientRect().height;
        textareaData.caretLeft = caret.offsetLeft;

        // Now we can position the autoFiller directly underneath the opening delimiter.
        textareaData.autoFiller.style.left =
            Math.min(
                textareaData.caretLeft,
                parseFloat(textareaData.mirror.style.width) - 200 
            ) +
            parseFloat(textareaData.styles.paddingLeft) +
            parseFloat(textareaData.styles.borderLeftWidth) +
            textareaData.element.offsetLeft + "px";
        textareaData.autoFiller.style.top =
            textareaData.caretTop +
            parseFloat(textareaData.styles.paddingTop) +
            parseFloat(textareaData.styles.borderTopWidth) +
            textareaData.element.offsetTop + "px";

        // Set the autoFiller's artificial focus index to 0 (the first item in the list).
        textareaData.autoFillerFocusedIndex = 0;

        textareaData.autoFilling = true;
    }

    function sanitizeHTML(string) {
        return string
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function selectAutoFillerItem(e, textareaData) {
        let item = e.currentTarget;
        let name = item.getAttribute(`data-${CSS_PREFIX}-replacement-name`);

        let previousStartDelimIndex = textareaData.element.value.lastIndexOf(START_DELIMITER, textareaData.element.selectionStart - START_DELIMITER.length);
        let nextStartDelimIndex = textareaData.element.value.indexOf(START_DELIMITER, textareaData.element.selectionStart);
        let nextEndDelimIndex = textareaData.element.value.indexOf(END_DELIMITER, textareaData.element.selectionStart);

        let newValue;
        let newCaretPos;
        if (~nextEndDelimIndex && (!~nextStartDelimIndex || nextEndDelimIndex > nextStartDelimIndex)) {
            // If there is a closing delimiter after the current selection, and it is not the closing
            // delimiter for another opening delimiter, we can replace up to that point.
            newValue = textareaData.element.value.substring(0, previousStartDelimIndex + START_DELIMITER.length) +
                name +
                textareaData.element.value.substring(nextEndDelimIndex);
            newCaretPos = previousStartDelimIndex + START_DELIMITER.length + name.length + END_DELIMITER.length;
        } else {
            // Otherwise, we just want to replace from the start delimiter up to the caret, and insert
            // the closing delimiter ourself.
            newValue = textareaData.element.value.substring(0, previousStartDelimIndex + START_DELIMITER.length) +
                name +
                (AUTOFILL_REPLACEMENT ? END_DELIMITER : "") +
                textareaData.element.value.substring(Math.max(textareaData.element.selectionStart, textareaData.element.selectionEnd));
            newCaretPos = previousStartDelimIndex + START_DELIMITER.length + name.length + (AUTOFILL_REPLACEMENT ? END_DELIMITER.length : 0);
        }

        // Select all the text in the <textarea>.
        setTextareaValue(textareaData, newValue, true);
        // Set the selection back to where it should be.
        textareaData.element.setSelectionRange(newCaretPos, newCaretPos);
        // Check if there are any new replacements to make.
        checkReplacements(textareaData);
    }

    function setTextareaValue(textareaData, value, suppressInputs) {
        if (suppressInputs) {
            textareaData.suppressInputs = true;
        }
        textareaData.element.focus();
        if (document.queryCommandSupported("insertHTML") && document.queryCommandEnabled("insertHTML")) {
            // We set the textarea's value using insertHTML to allow for undoing/redoing, and
            // because insertHTML seems to perform much faster than insertText in some browsers.
            textareaData.element.setSelectionRange(0, textareaData.element.value.length);
            document.execCommand("insertHTML", false, sanitizeHTML(value) + (value[value.length - 1] == "\n" ? "<br>" : ""));
        } else if (document.queryCommandSupported("insertText") && document.queryCommandEnabled("insertText")) {
            // Fall back to insertText if insertHTML is not enabled (Firefox).
            textareaData.element.setSelectionRange(0, textareaData.element.value.length);
            document.execCommand("insertText", false, value);
        } else {
            // Set the value directly if all else fails.
            textareaData.value = value;
        }
        textareaData.suppressInputs = false;
    }

    function checkReplacements(textareaData, customValue, customCaret) {
        let value = customValue || textareaData.element.value;
        let lastIndex = value.length;
        let startIndex;
        let caretPosition = customCaret || Math.min(textareaData.element.selectionStart, textareaData.element.selectionEnd);

        while (~(startIndex = value.lastIndexOf(START_DELIMITER, lastIndex)) && lastIndex >= 0) {
            let endIndex = value.indexOf(END_DELIMITER, startIndex);
            // No end delimiter indicates there are no more replacements to make.
            if (!~endIndex) {
                break;
            }

            let nestedString = value.substring(startIndex + START_DELIMITER.length, endIndex);
            let [expansion, gotExpanded] = expandString(nestedString, 0);

            if (endIndex + END_DELIMITER.length <= caretPosition && gotExpanded) {
                // If the caret position is after the current replacement, we need to move it to account
                // for the new characters.
                caretPosition += expansion.length - (endIndex + END_DELIMITER.length - startIndex);
            } else if (startIndex < caretPosition && gotExpanded) {
                // If the caretPosition is in between the starting end ending delimiters, we move the
                // caret position to be right after the replacement.
                caretPosition = startIndex + expansion.length;
            }

            value = value.substring(0, startIndex) + expansion + value.substring(endIndex + END_DELIMITER.length);
            lastIndex = startIndex - 1;
        }

        let caretPositions = [];

        // Now we look for any ${CURSOR()} markers to indicate where we should place the caret.
        let match;
        while (match = CURSOR_REGEX.exec(value)) {
            let selection = (match[1] || "").replace(/\\"/g, '"').replace(/\\\\/g, "\\");

            value = value.substring(0, match.index) + selection + value.substring(match.index + match[0].length);
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

        // Add the default caretPosition on to the end so that the cursor will always end up there.
        caretPositions.push([caretPosition, caretPosition]);

        // caretPositions may have multiple positions where we can place the caret. For now, we just
        // look at the first one, although this may change in the future.

        setTextareaValue(textareaData, value, true);
        // Set the selection back to where it should be.
        textareaData.element.setSelectionRange(...caretPositions[0]);
    }

    function expandString(string, level) {
        if (level >= MAX_RECURSION_DEPTH) {
            return ["[Maximum recursion depth exceeded]", true];
        }
        let unchanged = string;

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
        if (string in _REPLACEMENTS) {
            if (typeof _REPLACEMENTS[string].value == "function") {
                let value = _REPLACEMENTS[string].value();
                if (value == null) {
                    // If the function returns null, it means we shouldn't expand to anything.
                    return [START_DELIMITER + unchanged + END_DELIMITER, false];
                }
                replacement = dedent(value + "");
            } else {
                replacement = _REPLACEMENTS[string].value; // Already dedented.
            }
        } else {
            // No trigger with this name; return the value unchanged.
            return [START_DELIMITER + unchanged + END_DELIMITER, false];
        }
        
        // Now that we have the replaced value, we need to check to see if there were any nested
        // replacements.
        let lastIndex = replacement.length;
        let startIndex;
        while (~(startIndex = replacement.lastIndexOf(START_DELIMITER, lastIndex)) && lastIndex >= 0) {
            let endIndex = replacement.indexOf(END_DELIMITER, startIndex);
            if (!~endIndex) {
                break;
            }
            let nestedString = replacement.substring(startIndex + START_DELIMITER.length, endIndex);
            let [expansion, _] = expandString(nestedString, level + 1);
            replacement = replacement.substring(0, startIndex) + expansion + replacement.substring(endIndex + END_DELIMITER.length);
            lastIndex = startIndex - 1;
        }

        return [replacement, true];
    }

    function populateAutoFiller(textareaData) {
        let incompleteMacro = getIncompleteTrigger(textareaData).trim().toLowerCase();

        let filteredIndices = [];
        for (let i = 0, l = REPLACEMENTS.length; i < l; i++) {
            if (REPLACEMENTS[i].mainTrigger.startsWith(incompleteMacro)) {
                filteredIndices.push(i)
            }
        }

        // If there are no results to show, hide the autoFiller entirely.
        if (filteredIndices.length == 0) {
            textareaData.autoFillerIndices = [];
            textareaData.autoFilling = false;
            textareaData.autoFiller.style.display = "none";
        }

        if (textareaData.autoFillerVisibleIndices.join("|") == filteredIndices.join("|")) {
            // The same macros as before are going to be shown. No need to update the menu.
            focusAutoFillItem(textareaData);
            return;
        }

        // Make a fragment where we will add all the results.
        let fragment = document.createDocumentFragment();

        for (const index of filteredIndices) {
            let replacement = REPLACEMENTS[index];
            // Each entry is a <li>.
            let li = document.createElement("li");
            li.innerHTML = `
                <div class="sn-card-component_accent-bar"></div>
                <strong>${START_DELIMITER}${sanitizeHTML(replacement.mainTrigger).replace(/(\.|_)/g, "$1<wbr>") || ""}${END_DELIMITER}</strong>
                ${
                    typeof replacement.description == "string" ?
                        `<small>${replacement.description || '""'}</small>` :
                        `<small class="${CSS_PREFIX}-desc-flex">"<span>${replacement.description[1]}</span>"</small>`
                }
            `;
            li.setAttribute(`data-${CSS_PREFIX}-replacement-name`, replacement.mainTrigger);
            if (typeof replacement.value != "function") {
                li.title = replacement.value;
                li.setAttribute("data-original-title", replacement.value);
            }
            li.tabIndex = 0;
            li.role = "button";

            // Add a click listener to make it autocomplete the replacement.
            li.addEventListener("click", e => selectAutoFillerItem(e, textareaData));
            // Also add a keydown listener for Enter and Spacebar to activate the click listener like
            // how a button would.
            li.addEventListener("keydown", function(e) {
                if (e.code == "Enter" || e.code == " ") selectAutoFillerItem(e, textareaData);
            });
            // Hover-in listener to left-align the tooltip, as well as make the item highlighted.
            li.addEventListener("mouseenter", function(e) {
                li.setAttribute(`data-${CSS_PREFIX}-hovering`, "true");
                li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
                document.documentElement.setAttribute(`data-${CSS_PREFIX}-left-align-tooltip`, "true");
                document.documentElement.setAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`, "true");
                for (const tooltip of document.getElementsByClassName("tooltip")) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            });
            // Hover-out listener to make the tooltip return to normal, as well as un-highlight the
            // item.
            li.addEventListener("mouseleave", function(e) {
                li.setAttribute(`data-${CSS_PREFIX}-hovering`, "false");
                if (li.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                    li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                    document.documentElement.setAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`, "false");

                    // The tooltip lingers even after hovering out, so we need to wait for the tooltip
                    // to actually disappear before we can return the center alignment is normally has.
                    let tooltip = document.getElementsByClassName("tooltip")[0];
                    if (tooltip) {
                        new MutationObserver(function(_, self) {
                            self.disconnect();
                            if (document.documentElement.getAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`) != "true") {
                                document.documentElement.setAttribute(`data-${CSS_PREFIX}-left-align-tooltip`, "false");
                            }
                        }).observe(tooltip.parentNode, {
                            childList: true,
                            characterData: true,
                            subtree: true
                        });
                    }
                }
            });
            // Focusing on the item is treated the same same as hovering in.
            li.addEventListener("focus", function(e) {
                li.setAttribute(`data-${CSS_PREFIX}-focusing`, "true");
                li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
                document.documentElement.setAttribute(`data-${CSS_PREFIX}-left-align-tooltip`, "true");
                document.documentElement.setAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`, "true");
                for (const tooltip of document.getElementsByClassName("tooltip")) {
                    tooltip.parentNode.removeChild(tooltip);
                }
                // Also update the focusedIndex we have saved to match.
                textareaData.autoFillerFocusedIndex = Array.prototype.indexOf.call(li.parentNode.children, li);
                focusAutoFillItem(textareaData);
            });
            // Blurring the item is the same as hovering out.
            li.addEventListener("blur", function(e) {
                li.setAttribute(`data-${CSS_PREFIX}-focusing`, "false");
                if (li.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                    li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                    document.documentElement.setAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`, "false");
                    let tooltip = document.getElementsByClassName("tooltip")[0];
                    if (tooltip) {
                        new MutationObserver(function(_, self) {
                            self.disconnect();
                            if (document.documentElement.getAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`) != "true") {
                                document.documentElement.setAttribute(`data-${CSS_PREFIX}-left-align-tooltip`, "false");
                            }
                        }).observe(tooltip.parentNode, {
                            childList: true,
                            characterData: true,
                            subtree: true
                        });
                    }
                }
            });
            fragment.appendChild(li);
        }

        // Replace the content of the autoFiller with the new items.
        textareaData.autoFiller.innerText = "";
        textareaData.autoFiller.appendChild(fragment);
        textareaData.autoFillerVisibleIndices = filteredIndices;
    }

    function selectMacroItem(e) {
        let name = e.currentTarget.getAttribute(`data-${CSS_PREFIX}-macro-name`);
        let macro = _MACROS[name];

        // First get the macro's value.
        let value;
        if (typeof macro.value == "function") {
            value = macro.value();
            value = value === null ? "" : value; // null expands to an empty string
            value = dedent(value + "");
        } else {
            value = macro.value; // Already dedented.
        }

        // Check what kind of textarea(s) is/are currently showing.
        let textarea = document.getElementById("activity-stream-textarea");
        // .offsetParent can be used to check if the element is actually visible.
        if (textarea && textarea.offsetParent) {
            let textareaType = textarea.getAttribute("data-stream-text-input");
            // Check if we need to switch to the other type of <textarea>
            if ((textareaType == "comments" && macro.type == PRIVATE) || (textareaType == "work_notes" && macro.type == PUBLIC)) {
                // Manually click the checkbox to toggle work notes.
                let checkbox = document.querySelector(".sn-controls.row .pull-right input[type='checkbox'][name='work_notes-journal-checkbox'], .sn-controls.row .pull-right input[type='checkbox'][name='comments-journal-checkbox']");
                if (checkbox) {
                    checkbox.click();
                }
            }
        } else {
            // If there was no textarea found above, we must be in the mode where both textareas are
            // showing, in which case, we can target the desired one by an ID.
            textarea = macro.type == PUBLIC ? document.getElementById("activity-stream-comments-textarea") : document.getElementById("activity-stream-work_notes-textarea");
        }

        if (!textarea) {
            return;
        }

        // Instead of insertHTML-ing it like we normally do to update the <textarea> value, we pass the
        // value directly to checkReplacements() instead so that it can handle the insertHTML. If we
        // we tried to do it here, it would insert the HTML, call the "input" handler on the <textarea>,
        // go to checkReplacements(), and eventually re-insert HTML. This isn't much of a problem since
        // it adds very little extra runtime, but Chrome has a "feature" where if it detects one
        // insertHTML triggers another insertHTML, it thinks it's going to cause an infinite recursion
        // and doesn't execute the second insertHTML, so we can only stick to one insertHTML instead.
        checkReplacements(textareaDatas.get(textarea), value, value.length);
    }

    function focusMacroItem(macroContainer) {
        let index = +macroContainer.getAttribute(`data-${CSS_PREFIX}-focused-index`);
        let children = macroContainer.lastElementChild.children;
        // If the index is out of bounds, do nothing.
        if (index < 0 || index >= children.length) {
            return;
        }
        // Reset other elements that previously had artificial-focusing set to true.
        for (const elem of macroContainer.lastElementChild.querySelectorAll(`[data-${CSS_PREFIX}-artificial-focusing="true"]`)) {
            elem.setAttribute(`data-${CSS_PREFIX}-artificial-focusing`, "false");
            if (elem.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && elem.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true") {
                elem.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
            }
        }
        // Set the now-focused element to artificial-focusing=true
        children[index].setAttribute(`data-${CSS_PREFIX}-artificial-focusing`, "true");
        children[index].firstElementChild.classList.add("sn-card-component_accent-bar_dark");
        children[index].focus();
        // Scroll it into view to appear as if it is focused.
        if (typeof children[index].scrollIntoViewIfNeeded == "function") {
            children[index].scrollIntoViewIfNeeded();
        }
    }

    function updateTextareaSelection(textareaData) {
        showOrHideAutoFiller(textareaData);
        if (textareaData.autoFilling) {
            populateAutoFiller(textareaData);
        }
    }

    window.addEventListener("resize", updateTextareas);

    document.addEventListener("input", function(e) {
        updateTextareas();
        let textareaData = textareaDatas.get(e.target);
        if (textareaData) {
            if (!textareaData.suppressInputs) {
                checkReplacements(textareaData);
            }
            showOrHideAutoFiller(textareaData);
            if (textareaData.autoFilling) {
                populateAutoFiller(textareaData);
            }
        }
    });

    document.addEventListener("selectionchange", function(e) {
        let textareaData = textareaDatas.get(document.activeElement);
        if (textareaData) {
            updateTextareaSelection(textareaData);
        }
    });

    function f() {
        let textareaElements = document.querySelectorAll(`textarea:not([data-${CSS_PREFIX}-found-textarea])`);
        for (const textarea of textareaElements) {
            textarea.setAttribute(`data-${CSS_PREFIX}-found-textarea`, "true");

            let styles = getComputedStyle(textarea);
            let mirror = document.createElement("div");
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

            let autoFiller = document.createElement("ul");
            autoFiller.classList.add(`${CSS_PREFIX}-auto-filler`, "h-card");
            autoFiller.style.display = "none";
            textarea.parentNode.insertBefore(autoFiller, textarea.nextElementSibling);

            let markdownPreviewer = document.createElement("div");
            markdownPreviewer.classList.add(`${CSS_PREFIX}-textarea-md-preview`, "form-control");
            markdownPreviewer.setAttribute(`data-${CSS_PREFIX}-is-previewing`, "false");
            markdownPreviewer.style.display = "none";
            let markdownPreviewerRoot = markdownPreviewer.attachShadow({mode: "open"});
            markdownPreviewerRoot.innerHTML = `<link href="styles/activity_encapsulated.css" rel="stylesheet" type="text/css"><style>:host img{max-width:100%;height:auto;overflow:hidden}</style><div style="max-height:100%;overflow:auto;padding:0 18px"></div>`;
            textarea.parentNode.insertBefore(markdownPreviewer, textarea.nextElementSibling);

            function parentFocusOut(e) {
                if (e.relatedTarget === null || (e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget))) {
                    showOrHideAutoFiller(textareaData);
                }
            }
            textarea.parentNode.addEventListener("focusout", parentFocusOut);

            let textareaData = {
                element: textarea,
                mirror: mirror,
                autoFiller: autoFiller,
                autoFilling: false,
                autoFillerVisibleIndices: [],
                markdownPreviewer: markdownPreviewer,
                markdownPreviewerRoot: markdownPreviewerRoot.lastElementChild,
                caretTop: null,
                caretLeft: null,
                styles: styles,
                elementParent: textarea.parentNode,
                elementParentFocusOutListener: parentFocusOut
            };
            textareaDatas.set(textarea, textareaData);

            textarea.addEventListener("keydown", function(e) {
                // Only intercept keypresses when the autFiller is open.
                if (textareaData.autoFilling) {
                    if (e.code == "ArrowDown") {
                        // An arrow down should move the focus down one.
                        e.preventDefault();
                        if (textareaData.autoFillerFocusedIndex < textareaData.autoFiller.children.length - 1) {
                            textareaData.autoFillerFocusedIndex++;
                            focusAutoFillItem(textareaData);
                        }
                    } else if (e.code == "ArrowUp") {
                        // An arrow up should move the focus up one.
                        e.preventDefault();
                        if (textareaData.autoFillerFocusedIndex > 0) {
                            textareaData.autoFillerFocusedIndex--;
                            focusAutoFillItem(textareaData);
                        }
                    } else if (e.code == "Tab" || e.code == "Enter") {
                        // A Tab or Enter is used to "click" on the currently selected item from the
                        // list. Normally, a button only activates on Spacebar and Enter, but Tab is
                        // more natural for auto-completing, and Spacebar instead should insert an
                        // actual space.
                        e.preventDefault();
                        textareaData.autoFiller.children[textareaData.autoFillerFocusedIndex].click();
                    }
                }
            });

            textarea.addEventListener("mousedown", function(e) {
                updateTextareaSelection(textareaData);
            });

            textarea.addEventListener("mouseup", function(e) {
                updateTextareaSelection(textareaData);
            });
        }

        let pullRightSections = document.querySelectorAll(`.sn-controls.row .pull-right:not([data-${CSS_PREFIX}-macro-btn-inserted])`);
        for (const section of pullRightSections) {
            section.setAttribute(`data-${CSS_PREFIX}-macro-btn-inserted`, "true");
            let macroContainer = document.createElement("span");
            macroContainer.classList.add(`${CSS_PREFIX}-macro-list-container`);
            macroContainer.addEventListener("keydown", function(e) {
                if (macroContainer.firstElementChild.getAttribute(`data-${CSS_PREFIX}-list-expanded`) == "true") {
                    let index = +macroContainer.getAttribute(`data-${CSS_PREFIX}-focused-index`);
                    if (e.code == "ArrowDown") {
                        // An arrow down should move the focus down one.
                        e.preventDefault();
                        if (index < macroContainer.lastElementChild.children.length - 1) {
                            macroContainer.setAttribute(`data-${CSS_PREFIX}-focused-index`, index + 1);
                            focusMacroItem(macroContainer);
                        }
                    } else if (e.code == "ArrowUp") {
                        // An arrow up should move the focus up one.
                        e.preventDefault();
                        if (index > 0) {
                            macroContainer.setAttribute(`data-${CSS_PREFIX}-focused-index`, index - 1);
                            focusMacroItem(macroContainer);
                        } else if (index == 0) {
                            // Close the menu and focus the button if we are already at the top.
                            macroContainer.firstElementChild.setAttribute(`data-${CSS_PREFIX}-list-expanded`, "true");
                            macroContainer.firstElementChild.click();
                            macroContainer.firstElementChild.focus();
                        }
                    } else if (e.code == " " || e.code == "Enter") {
                        // A Tab or Enter is used to "click" on the currently selected item from the
                        // list. Normally, a button only activates on Spacebar and Enter, but Tab is
                        // more natural for auto-completing, and Spacebar instead should insert an
                        // actual space.
                        e.preventDefault();
                        macroContainer.lastElementChild.children[index].click();
                    }
                } else if (document.activeElement == macroContainer.firstElementChild && e.code == "ArrowDown") {
                    // If the menu is closed, and the button is focused, and we hit ArrowDown, we open
                    // the menu.
                    e.preventDefault();
                    macroContainer.firstElementChild.click();
                }
            });
            macroContainer.addEventListener("focusout", function(e) {
                if (e.relatedTarget === null || (e.relatedTarget instanceof HTMLElement && !macroContainer.contains(e.relatedTarget))) {
                    // Set to true so we can toggle it to false.
                    macroContainer.firstElementChild.setAttribute(`data-${CSS_PREFIX}-list-expanded`, "true");
                    macroContainer.firstElementChild.click();
                }
            });

            let btn = document.createElement("button");
            btn.classList.add(`${CSS_PREFIX}-macro-btn`, "btn", "btn-default");
            btn.setAttribute(`data-${CSS_PREFIX}-list-expanded`, "false");
            btn.setAttribute("type", "button");
            btn.tabIndex = 0;
            btn.innerText = "Apply Macro";
            btn.addEventListener("mousedown", function(e) {
                // The <button> is receiving focus. Safari and Firefox have a bug where a <button> won't
                // be focused when you click on it
                // (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#clicking_and_focus)
                // so we have to do that ourselves.
                if (document.activeElement != btn) {
                    btn.focus();
                    e.preventDefault();
                }
            });
            btn.addEventListener("click", function(e) {
                let expanded = btn.getAttribute(`data-${CSS_PREFIX}-list-expanded`) != "true";
                btn.setAttribute(`data-${CSS_PREFIX}-list-expanded`, expanded);
                if (expanded) {
                    macroContainer.lastElementChild.style.display = "block";
                    macroContainer.setAttribute(`data-${CSS_PREFIX}-focused-index`, 0);
                    focusMacroItem(macroContainer);
                    let previewBtn = section.querySelector(`.${CSS_PREFIX}-preview-btn[data-${CSS_PREFIX}-is-previewing="true"]`);
                    if (previewBtn) {
                        previewBtn.click();
                    }
                } else {
                    macroContainer.lastElementChild.style.display = "none";
                }
            });
            macroContainer.appendChild(btn);

            let macroList = document.createElement("ul");
            macroList.classList.add(`${CSS_PREFIX}-macro-list`, "h-card");
            macroList.style.display = "none";
            for (const macro of MACROS) {
                let li = document.createElement("li");
                li.innerHTML = `
                    <div class="sn-card-component_accent-bar"></div>
                    <strong>${sanitizeHTML(macro.name).replace(/(\.|_)/g, "$1<wbr>") || "<i>[Empty Name]</i>"}</strong>
                    ${
                        typeof macro.description == "string" ?
                            `<small>${macro.description || '""'}</small>` :
                            `<small class="${CSS_PREFIX}-desc-flex">"<span>${macro.description[1]}</span>"</small>`
                    }
                `;
                li.setAttribute(`data-${CSS_PREFIX}-macro-name`, macro.name);
                li.tabIndex = 0;
                li.role = "button";

                li.addEventListener("click", selectMacroItem);
                li.addEventListener("keydown", function(e) {
                    if (e.code == "Enter" || e.code == " ") selectMacroItem(e);
                });
                li.addEventListener("mouseenter", function(e) {
                    li.setAttribute(`data-${CSS_PREFIX}-hovering`, "true");
                    li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
                });
                li.addEventListener("mouseleave", function(e) {
                    li.setAttribute(`data-${CSS_PREFIX}-hovering`, "false");
                    if (li.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                        li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                    }
                });
                li.addEventListener("focus", function(e) {
                    li.setAttribute(`data-${CSS_PREFIX}-focusing`, "true");
                    li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
                    macroContainer.setAttribute(`data-${CSS_PREFIX}-focused-index`, Array.prototype.indexOf.call(li.parentNode.children, li));
                    focusMacroItem(macroContainer);
                });
                li.addEventListener("blur", function(e) {
                    li.setAttribute(`data-${CSS_PREFIX}-focusing`, "false");
                    if (li.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                        li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                    }
                });
                macroList.appendChild(li);
            }
            macroContainer.appendChild(macroList);

            section.insertBefore(macroContainer, section.firstElementChild);
        }

        pullRightSections = document.querySelectorAll(`.sn-controls.row .pull-right:not([data-${CSS_PREFIX}-preview-btn-inserted])`);
        for (const section of pullRightSections) {
            section.setAttribute(`data-${CSS_PREFIX}-preview-btn-inserted`, "true");
            
            let postBtn = section.querySelector(".activity-submit");
            if (!postBtn) {
                continue;
            }

            // Make a copy of the Post button so that we can parse the markdown first, and then push
            // the actual post button ourself.
            let prePostBtn = document.createElement("button");
            prePostBtn.classList.add(`${CSS_PREFIX}-prepost-btn`, "btn", "btn-default");
            prePostBtn.innerText = postBtn.innerText
            prePostBtn.addEventListener("click", function(e) {
                e.preventDefault();
                // Get the visible textareas.
                let textareas = [
                    document.getElementById("activity-stream-textarea"),
                    document.getElementById("activity-stream-comments-textarea"),
                    document.getElementById("activity-stream-work_notes-textarea")
                ];

                // Go through each textarea and replace its contents with the markdown-parsed
                // version, but only if the textarea is visible (by checking. offsetParent), and if
                // the markdown-parsed text is any different from the textarea's actual text.
                for (const textarea of textareas) {
                    if (!textarea || !textarea.offsetParent) continue;
                    let parsedText = parseMarkdownText(textarea.value);
                    if (textarea.value != parsedText) {
                        setTextareaValue(textareaDatas.get(textarea), parsedText, false);
                    }
                }

                // Wait a little bit of time before clicking the post button to ensure the textarea
                // has had enough time to update.
                setTimeout(function() {
                    postBtn.click();
                }, 250);
            });

            // Make a Preview button to toggle previewing a textarea's markdown.
            let previewBtn = document.createElement("button");
            previewBtn.classList.add(`${CSS_PREFIX}-preview-btn`, "btn", "btn-default");
            previewBtn.innerText = "Preview";
            previewBtn.setAttribute(`data-${CSS_PREFIX}-is-previewing`, "false");
            previewBtn.addEventListener("click", function(e) {
                e.preventDefault();
                let previewing = previewBtn.getAttribute(`data-${CSS_PREFIX}-is-previewing`) != "true";
                previewBtn.setAttribute(`data-${CSS_PREFIX}-is-previewing`, previewing);
                // Get the visible textareas.
                let textareas = [
                    document.getElementById("activity-stream-textarea"),
                    document.getElementById("activity-stream-comments-textarea"),
                    document.getElementById("activity-stream-work_notes-textarea")
                ];

                // For each of the textareas, show its Markdown previewer div.
                for (const textarea of textareas) {
                    if (!textarea) continue;
                    let textareaData = textareaDatas.get(textarea);

                    // Parse the textarea's value as Markdown to turn it into HTML.
                    let parsed = parseMarkdownText(textarea.value);
                    // Now we have to sanitize all the text outside of [code][/code] blocks, while
                    // leaving text inside [code][/code] blocks as-is.

                    // Most of the code below is taken directly from parseMarkdownText().
                    let escaped = "";
                    let startIndex;
                    while (~(startIndex = parsed.indexOf("[code]"))) {
                        escaped += sanitizeHTML(parsed.substring(0, startIndex));
                        parsed = parsed.substring(startIndex + 6);
                        
                        let codeInstances = 1;
                        while (codeInstances) {
                            let startIndex = parsed.indexOf("[code]");
                            let endIndex = parsed.indexOf("[/code]");

                            if (!~endIndex) {
                                parsed += "[/code]";
                                continue;
                            }

                            if (~startIndex && startIndex < endIndex) {
                                escaped += parsed.substring(0, startIndex);
                                parsed = parsed.substring(startIndex + 6);
                                codeInstances++;
                            } else {
                                escaped += parsed.substring(0, endIndex);
                                parsed = parsed.substring(endIndex + 7);
                                codeInstances--;
                            }
                        }
                    }
                    escaped += sanitizeHTML(parsed);

                    textareaData.markdownPreviewerRoot.innerHTML = escaped;
                    textareaData.markdownPreviewer.style.display = previewing ? "block" : "none";

                    textarea.tabIndex = previewing ? -1 : 0;
                    textarea.blur();
                }

                
            });

            // Hide the post button away from view and make it un-clickable so that only we can
            // click it.
            postBtn.style.position = "absolute";
            postBtn.style.opacity = 0;
            postBtn.style.pointerEvents = "none";

            section.insertBefore(prePostBtn, postBtn);
            section.insertBefore(previewBtn, prePostBtn);
        }
    }
    f();
    new MutationObserver(f).observe(document, {
        childList: true,
        subtree: true
    });

    let stylesheet = document.createElement("style");
    stylesheet.innerHTML = `
        .${CSS_PREFIX}-auto-filler,
        .${CSS_PREFIX}-macro-list {
            list-style: none;
            padding: 0 !important;
            margin: 0;
            overflow-y: auto !important;
            position: absolute !important;
            max-height: 120px;
            width: 200px;
            box-sizing: border-box;
            z-index: 1;
        }

        .${CSS_PREFIX}-auto-filler li,
        .${CSS_PREFIX}-macro-list li {
            position: relative;
            padding: 0 5px 0 10px;
            cursor: pointer;
        }

        .${CSS_PREFIX}-auto-filler li .sn-card-component_accent-bar,
        .${CSS_PREFIX}-macro-list li .sn-card-component_accent-bar {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }

        .${CSS_PREFIX}-auto-filler li strong,
        .${CSS_PREFIX}-macro-list li strong {
            display: block;
            word-break: break-word;
        }

        .${CSS_PREFIX}-auto-filler li small,
        .${CSS_PREFIX}-macro-list li small {
            color: #777;
        }

        .${CSS_PREFIX}-auto-filler li small.${CSS_PREFIX}-desc-flex,
        .${CSS_PREFIX}-macro-list li small.${CSS_PREFIX}-desc-flex {
            display: inline-flex;
            max-width: 100%;
        }

        .${CSS_PREFIX}-auto-filler li small.${CSS_PREFIX}-desc-flex span,
        .${CSS_PREFIX}-macro-list li small.${CSS_PREFIX}-desc-flex span {
            white-space: nowrap;
            overflow: hidden;
            max-width: 100%;
            text-overflow: ellipsis;
        }

        .${CSS_PREFIX}-textarea-mirror {
            opacity: 0;
            pointer-events: none;
            position: fixed;
            top: 200vh;
            left: 200vw;
            white-space: pre-wrap;
        }

        .${CSS_PREFIX}-macro-list-container {
            position: relative;
            margin: 0 8px 0 0;
        }

        .${CSS_PREFIX}-macro-btn {
            margin: 0 !important;
        }

        .${CSS_PREFIX}-macro-list {
            right: 0;
            width: 300px !important;
        }

        .${CSS_PREFIX}-preview-btn,
        .${CSS_PREFIX}-prepost-btn,
        .${CSS_PREFIX}-macro-btn {
            vertical-align: top;
        }

        .${CSS_PREFIX}-preview-btn[data-${CSS_PREFIX}-is-previewing="true"] {
            background-color: #e6e9eb !important;
        }

        .${CSS_PREFIX}-textarea-md-preview {
            position: absolute;
            top: 0;
            left: 0;
            height: 100% !important;
            width: 100%;
            z-index: 3;
            padding: 0 !important;
        }

        :root[data-${CSS_PREFIX}-left-align-tooltip="true"] .tooltip-inner {
            text-align: left;
        }
    `;
    document.head.appendChild(stylesheet);
}();
