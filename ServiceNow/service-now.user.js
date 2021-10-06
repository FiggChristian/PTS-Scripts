// ==UserScript==
// @name        ServiceNow Improvements
// @namespace   https://github.com/FiggChristian/PTS-Scripts
// @match       *://stanford.service-now.com/ticket.do*
// @match       *://stanford.service-now.com/incident.do*
// @match       *://stanford.service-now.com/sc_task.do*
// @match       *://mydevices.stanford.edu/*
// @version     1.2.0
// @description Adds macros, replacements, and Markdown support to ServiceNow tickets.
// @icon        https://stanford.service-now.com/stanford_favicon.png
// @downloadURL https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/master/ServiceNow/service-now.user.js
// @updateURL   https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/master/ServiceNow/service-now.user.js
// @supportURL  https://github.com/FiggChristian/PTS-Scripts/issues
// @homepageURL https://github.com/FiggChristian/PTS-Scripts/
// @require     https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @run-at      document-end
// ==/UserScript==

// To make your own macros, look at line 30.
// To make your own {{text replacements}}, look at line 254.

!function (PUBLIC, PRIVATE) {
    "use strict";
    const MAX_RECURSION_DEPTH = 10; // How many times we should expand a replacement inside a replacement inside a replacement...
    const START_DELIMITER = "{{"; // The text to delimit the start of a replacement. Zendesk's default is "{{"
    const END_DELIMITER = "}}"; // The text to delimit the end of a replacement.
    const AUTOFILL_REPLACEMENT = true; // Whether choosing a replacement from the menu will insert the entire replacement (vs. just the name)
    const NETDB_HOST = "netdb-backup.stanford.edu"; // NetDB host name; allowed values: netdb.stanford.edu | netdb-backup.stanford.edu | netdb-dev.stanford.edu | netdb-tng.stanford.edu

    const MACROS = [
        // {
        //     name: "Your Macro's Name",
        //     value: `
        //         Hi {{current_user.name.first}},
        //         (that'll be replaced with your first name above)

        //         All of this is the text that the macro will insert into the text box.
        //         You can include replacements like "{{ticket.requester.name.first}}" to get the ticket requester's first name, as well as other replacements.

        //         Feel free to include Markdown, like **bold**, *italics*, [links](https://google.com), etc.

        //         You can also choose where you want your cursor to end up at once you insert a macro:

        //         ${CURSOR("Selected text")}

        //         Once you insert this macro, your cursor will be selecting the line above that says "Selected text", allowing you to edit it from there.
        //         Make sure to include the double quotes around the text in the parentheses.
        //         You can also use "${CURSOR()}" without anything in the parentheses if you just want your cursor to be placed at a certain point without selecting anything.

        //         If you want to make a macro, un-comment these lines (by removing the "//" at the beginning of each line) and edit this text as you see fit.

        //         Best,
        //         {{current_user.name.first}} (that's your first name again)
        //     `,
        //     description: "This is the description that will show up underneath your macro's name in the Apply Macro menu.",
        //     type: PUBLIC // Either PUBLIC (applies macro to the customer-facing textarea) or PRIVATE (applies macro to the private work notes textarea)
        // },
        {
            name: "Ask for MAC Address",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                    
                Could you please provide the hardware address (also known as a MAC address) for this device? Here are instructions on how to find it: ${START_DELIMITER}link.mac_address${END_DELIMITER}
                
                With this information we'll be able to look into your issue further.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Ask user to provide the MAC address for the device in question",
            type: PUBLIC
        },
        {
            name: "Wireless Trouble",
            value: `
                Hello ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                Thank you for reporting your trouble with the wireless network connectivity on the Stanford campus. There are some easy steps to take that resolve wireless network issues for most registered devices on campus:

                1. Forget/remove "Stanford Visitor" and "eduroam" wireless networks from your device. Connect only to the "Stanford" wireless network. You can find instructions for forgetting a Wi-Fi network here: [Mac](${START_DELIMITER}link.forget_wifi.mac${END_DELIMITER}) | [Windows](${START_DELIMITER}link.forget_wifi.windows${END_DELIMITER}) | [iOS](${START_DELIMITER}link.forget_wifi.ios${END_DELIMITER}) | [Android](${START_DELIMITER}link.forget_wifi.android${END_DELIMITER})
                2. Toggle the Wi-Fi on your device off and back on again.
                3. Completely power down and restart your computer or device.

                In the event that these steps don't resolve your wireless trouble, please find your device's MAC address and send it to us so we may begin troubleshooting for you.  Please see the following resource for additional information about finding your MAC address: ${START_DELIMITER}link.mac_address${END_DELIMITER}

                Again, we will require the MAC address of the device that you would like assistance with in order to help you. Thank you for your patience and cooperation.

                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Gives the user instructions for troubleshooting Wi-Fi",
            type: PUBLIC
        },
        {
            name: "Register via IPRequest",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                To register your device, you can follow these steps:
                
                1. You'll need to find the device's hardware address (also called its MAC address). Here are instructions for how to do so: ${START_DELIMITER}link.mac_address${END_DELIMITER}.
                2. Once you've found the MAC address for your device, go to ${START_DELIMITER}link.iprequest${END_DELIMITER} on your computer (make sure the computer is already connected to the Stanford network or Stanford's VPN, as the website will not load otherwise).
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
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Gives the user step-by-step instructions for registering a device through IPRequest",
            type: PUBLIC
        },
        {
            name: "Register Router",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},

                Please follow the steps below for setting up your own router:
                
                1. Purchase a router. Most major router brands (e.g. TP-Link, NETGEAR, ASUS, Linksys, Google, etc.) should do, so feel free to choose one that best suits your needs and price point.
                2. Once you have the router, look for its MAC address, which is usually printed on the side. It should be 12 alphanumeric digits in the form of \`A1:B2:C3:D4:E5:F6\`.
                3. Once you've found the MAC address, go to ${START_DELIMITER}link.iprequest${END_DELIMITER} on your computer (make sure the computer you're using is connected to the Stanford network, **not** the router's network).
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
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Gives the user step-by-step instructions for setting up a router",
            type: PUBLIC
        },
        {
            name: "Stale Ticket Check-In",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                
                Just wanted to check in and see if you were able to solve your issue or if you required further assistance? Please let us know so we can close this ticket or continue troubleshooting if necessary. 
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Asks the user for an update on an old ticket",
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
            description: "Gives the user step-by-step instructions for upgrading to Windows 10 Education",
            type: PUBLIC
        },
        {
            name: "Unregistered MAC Address",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                
                Looking on our end for the device with the MAC address you provided, it looks like it's not showing up in out system, indicating that your device is not yet registered. To register it, please go to your device's network settings, connect to the "Stanford" network, then navigate to [snsr.stanford.edu](https://snsr.stanford.edu) in a web browser. Please follow the prompts through there until your device is registered. If you are still having problems connecting after registering (it can take about 20 minutes to update, so it may not work immediately), please let us know and we can continue troubleshooting.
                
                Please let us know if you have questions or issues.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Gives the user instructions for registering their device once they've provided an unregistered MAC address",
            type: PUBLIC
        },
        {
            name: "Net Trouble Report",
            value: `
                ### Network Trouble Report

                Wireless/wired/both: ${CURSOR()}
                MAC addresses: ${CURSOR()}
                Device description: ${CURSOR()}
                Operating system: ${CURSOR()}
                1st timestamp: ${CURSOR()}
                2nd timestamp: ${CURSOR()}
                3rd timestamp: ${CURSOR()}
                Specific location of issue inside apartment: ${CURSOR()}
                Nature of issue (slow, trouble connecting, dropped sessions, poor coverage): ${CURSOR()}
                Specific issue details: ${CURSOR()}
                Troubleshooting attempted thus far: ${CURSOR()}
            `,
            description: "Shows the form to fill out to submit a report to the NetTrouble team",
            type: PRIVATE
        },
        {
            name: "2.4 GHz-Only Devices",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                
                It looks like that the kind of device you want to use only works on a 2.4 GHz band, which Stanford's network is not currently set up to provide in the way at-home Wi-Fi routers do. You can read more about unsupported devices here: https://stanford.service-now.com/student_services?id=kb_article&sys_id=fb9174068746f850d9e07778cebb35d1.
                
                While your device won't be able to connect to Stanford's network, you have two options:
                
                1. Buy another device that does work with both 2.4 GHz and 5 GHz bands (which may or may not exist since many devices, especially "smart home" devices, are made for exactly that: homes with a private Wi-Fi network, not campuses with enterprise-grade Wi-Fi networks). If buying online such as from Amazon, make sure to look at comments and reviews to verify that the device does in fact work on both 2.4 GHz and 5 GHz bands.
                2. Set up your own router. You can purchase your own router and get it connected to the Stanford network, and the router should be able to broadcast both 2.4 GHz and 5 GHz bands correctly for the device to connect to. We can guide you through the process of setting up your router if you choose to go this route.
                
                Please let us know if you have questions or issues.
                
                Best,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Explains what to do for devices that only work on 2.4 a GHz band",
            type: PUBLIC,
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
            description: "To request timestamps from customer for Net Trouble ticket",
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
            description: "Asks the user for the MAC address, a picture of the ethernet port, and whether they've tried the other ports in the room",
            type: PUBLIC
        },
        {
            name: "Dubious Node",
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                
                It looks like the device associated with this record has been blocked from using the on-campus network. The default at Stanford is that devices that connect to the network should be encrypted unless you actively indicate why it should be exempt. Common conditions in which a device will get blocked are when the owner does not complete the process, or when the owner indicates a condition in which it should be encrypted, but do not encrypt the device, specifically that the device is used to manage "high-risk data".

                Whether or not you handle "high-risk data", you'll need to indicate that through the Encryption Enrollment app from here: ${START_DELIMITER}link.enrollment_quiz${END_DELIMITER}. If you don't deal with high-risk data, or any of the other conditions, this should clear your device from having to encrypt and will reinstate the device's ability to use the on-campus network.
                
                We have temporarily restored this device's access to the network so you can complete this process. At some point in the next couple of hours, it will get blocked again. 
                
                Please let us know how everything goes regardless.
                
                Thanks,
                ${START_DELIMITER}current_user.name.first${END_DELIMITER}
            `,
            description: "Lets the user know that the device has been blocked due to compliance and gives them instructions for how to resolve it",
            type: PUBLIC
        }
    ];

    const REPLACEMENTS = [
        // {
        //     triggers: [
        //         "my_trigger",
        //         "my_other_trigger"
        //     ],
        //     value: `
        //         This is a replacement, which you can trigger by typing in a set of double curly braces in the text box in ServiceNow.
        //         This replacement will show up as "my_trigger" in the menu when you type in the double curly braces.
        //         You can type out the name "my_trigger", or you can also trigger this replacements by typing out "my_other_trigger".
        //         Only the first trigger in the list above will show up in the menu, but any from the list can be used when typing a replacement's name.
        //         Most replacements are simple one-liners, like a link, but you can have multiple lines of text the way this one does.
        //         Don't forget to un-comment these lines (by removing the "//" at the start of each line) in order for this trigger to actually show up.
        //     `,
        //     description: "This is the description that will show up underneath your replacement's name in the replacement menu."
        // },
        {
            triggers: [
                ""
            ],
            value: `
                Hi ${START_DELIMITER}ticket.requester.name.first${END_DELIMITER},
                
                ${CURSOR()}
                
                Please let us know if you have questions or issues.
                
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
                        return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6, 10)}`;
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
                "link.bigfix",
                "link.big_fix"
            ],
            value: `https://uit.stanford.edu/software/bigfix`,
            description: "Link to BigFix page for all devices"
        },
        {
            triggers: [
                "link.vpn"
            ],
            value: `https://uit.stanford.edu/service/vpn`,
            description: "Link to Stanford VPN page for all devices"
        },
        {
            triggers: [
                "link.vpn.mac",
                "link.vpn.macbook",
                "link.vpn.macos",
                "link.vpn.osx"
            ],
            value: `https://web.stanford.edu/dept/its/support/vpn/installers/InstallAnyConnect.pkg`,
            description: "Link to download VPN for MacBooks"
        },
        {
            triggers: [
                "link.vpn.windows",
                "link.vpn.pc"
            ],
            value: `https://web.stanford.edu/dept/its/support/vpn/installers/InstallAnyConnect.exe`,
            description: "Link to download VPN for Windows PCs"
        },
        {
            triggers: [
                "link.vlre"
            ],
            value: `https://uit.stanford.edu/service/vlre`,
            description: "Link to download VLRE for all devices"
        },
        {
            triggers: [
                "link.vlre.mac",
                "link.vlre.macbook",
                "link.vlre.macos",
                "link.vlre.osx"
            ],
            value: `https://uit.stanford.edu/service/vlre/mac`,
            description: "Link to download VLRE for MacBooks"
        },
        {
            triggers: [
                "link.vlre.windows",
                "link.vlre.pc"
            ],
            value: `https://uit.stanford.edu/service/vlre/windows`,
            description: "Link to download VLRE for Windows PCs"
        },
        {
            triggers: [
                "link.cardinal_key",
                "link.cardinalkey"
            ],
            value: `https://uit.stanford.edu/service/cardinalkey/installation`,
            description: "Link to download Cardinal Key for all devices"
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
            description: "Link to download Cardinal Key for MacBooks"
        },
        {
            triggers: [
                "link.cardinal_key.windows",
                "link.cardinal_key.pc",
                "link.cardinalkey.windows",
                "link.cardinalkey.pc"
            ],
            value: `https://uit.stanford.edu/service/cardinalkey/installation##windows`,
            description: "Link to download Cardinal Key for Windows PCs"
        },
        {
            triggers: [
                "link.ssrt"
            ],
            value: `https://uit.stanford.edu/software/ssrt`,
            description: "Link to download SSRT for all devices"
        },
        {
            triggers: [
                "link.ssrt.mac",
                "link.ssrt.macbook",
                "link.ssrt.macos",
                "link.ssrt.osx"
            ],
            value: `https://web.stanford.edu/dept/its/support/ess/mac/unrestricted/SSRT.pkg`,
            description: "Link to download SSRT for MacBooks"
        },
        {
            triggers: [
                "link.ssrt.windows",
                "link.ssrt.pc"
            ],
            value: `https://web.stanford.edu/dept/its/support/ess/pc/unrestricted/RunSSRT.exe`,
            description: "Link to download SSRT for Windows PCs"
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
                "link.forget_wifi.mac",
                "link.forget_wifi.macbook",
                "link.forget_wifi.macos",
                "link.forget_wifi.osx"
            ],
            value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018430`,
            description: "Link to instructions for forgetting Wi-Fi networks on MacBooks"
        },
        {
            triggers: [
                "link.forget_wifi.windows",
                "link.forget_wifi.pc",
            ],
            value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018429`,
            description: "Link to instructions for forgetting Wi-Fi networks on Windows PCs"
        },
        {
            triggers: [
                "link.forget_wifi.ios",
                "link.forget_wifi.iphone",
            ],
            value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018427`,
            description: "Link to instructions for forgetting Wi-Fi networks on iPhones"
        },
        {
            triggers: [
                "link.forget_wifi.android"
            ],
            value: `https://stanford.service-now.com/student_services?id=kb_article&number=KB00018428`,
            description: "Link to instructions for forgetting Wi-Fi networks on Android phones"
        },
        {
            triggers: [
                "link.enrollment_quiz",
                "link.enrollment_questionnaire",
                "link.enrollment"
            ],
            value: `https://uit.stanford.edu/service/enrollment`,
            description: "Link to Enrollment Questionnaire page"
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
            description: "Link to Enrollment Questionnaire for MacBooks"
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
            description: "Link to Enrollment Questionnaire for Windows PCs"
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
            description: "Link to Enrollment Questionnaire for Mobile Device"
        },
        {
            triggers: [
                "number.pts",
                "number.us"
            ],
            value: `(650) 723-9204`,
            description: "Phone number for PTS"
        },
        {
            triggers: [
                "icon.mydevices.compliant",
                "icon.my_devices.compliant"
            ],
            value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-not_compliant.svg" alt=""/>[/code]`,
            description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-not_compliant.svg" alt="green checkmark icon"/>"`
        },
        {
            triggers: [
                "icon.mydevices.n/a",
                "icon.mydevices.na",
                "icon.my_devices.n/a",
                "icon.my_devices.na"
            ],
            value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-na.svg" alt=""/>[/code]`,
            description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-na.svg" alt="gray dash icon"/>"`
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
            value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-compliant.svg" alt=""/>[/code]`,
            description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/mydevices-compliant.svg" alt="red X icon"/>"`
        },
        {
            triggers: [
                "icon.info",
                "icon.information"
            ],
            value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/info.svg" alt="info icon"/>[/code]`,
            description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/info.svg" alt="circled info icon"/>"`
        },
        {
            triggers: [
                "icon.apple",
                "icon.apple_logo",
                "icon.apple_menu"
            ],
            value: `[code]<img style="height:1em;vertical-align:-.15em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/apple.svg" alt="Apple logo"/>[/code]`,
            description: `Inserts a "<img style="height:1em" src="https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/.github/assets/apple.svg" alt="black Apple logo"/>"`
        }
    ];

    // A prefix used by all classes and attributes to target in CSS stylesheets.
    const CSS_PREFIX = "pts-injected-script";
    // The delay between when the user pushes the Post/Save button and when we push the actual but-
    // ton ourself. There shjould be a delay to allow the textareas to update their values.
    const SUBMIT_DELAY = 200;

    // This snippet of code handles MyDevices. Whenever we navigate to a mydevices page with
    // "?[CSS_PREFIX]-search-mac=[MAC Address]" in the URL, we make MyDevices search for that
    // MAC Address. NetDB, IPRequest, and DHCP Log do not need to do this even though we are using
    // them to perform searches because MyDevices forces you to be authenticated and includes an
    // authentication token in each search. Without that token, we can't search, so we need to open
    // MyDevices, fetch that authentication token ourselves, and then perform the search.
    if (location.hostname == "mydevices.stanford.edu") {
        const pairs = location.search.substring(1).split("&");
        for (const pair of pairs) {
            let key, val;
            try {
                [key, val] = pair.split("=");
                // Only look for "[CSS_PREFIX]-search-mac=[MAC Address]"
                if (decodeURIComponent(key) == `${CSS_PREFIX}-search-mac`) {
                    val = decodeURIComponent(val);
                } else continue;
            } catch (e) {
                continue;
            }
            // We found a MAC address to search for in the URL. Now we have to get the search form.
            const searchForm = document.querySelector("form.mais-universal-search.search-form.navbar-search");
            if (!searchForm) break;
            // We can extract the authentication token from its action attribute.
            const match = searchForm.action.match(/p_auth=([^&=]+)/);
            if (!match) break;
            const authToken = match[1];
            // Now that we have the auth token, we can perform the search by navigating straight to
            // the correct endpoint.
            location.replace(`https://mydevices.stanford.edu/group/mydevices/m?p_p_id=mydevicesportlet_WAR_maismydevicesportlet&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&_mydevicesportlet_WAR_maismydevicesportlet_action=deviceSearch&p_auth=${authToken}&_mydevicesportlet_WAR_maismydevicesportlet_searchInput=${encodeURIComponent(val)}`);
            break;
        }
        // The rest of the code in this script is only for ServiceNow, so we can return early to
        // prevent running that too.
        return;
    }

    const TICKET_TYPE = location.pathname == "/sc_task.do" ? "TASK" : location.pathname == "/incident.do" ? "INC" : location.pathname == "/ticket.do" ? "TICKET" : null;
    const DO_MACROS = TICKET_TYPE != "TASK";
    const DO_REPLACEMENTS = true;
    const DO_MARKDOWN = TICKET_TYPE != "TASK";
    const DO_SMART_TEXT = TICKET_TYPE != "TASK";

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
                [Symbol.for("truncated-description"), escapeHTML(macro.value) + ""];
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
                [Symbol.for("truncated-description"), escapeHTML(replacement.value) + ""];
        } else {
            replacement.description = dedent(replacement.description);
        }

        for (const trigger of (replacement.triggers || [])) {
            _REPLACEMENTS[(trigger + "").trim().toLowerCase()] = replacement;
        }
    }

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
                return `[code]<table style="border-collapse:collapse"><thead style="vertical-align:top">[/code]${header}[code]</thead><tbody style="vertical-align:top">[/code]${body}[code]</tbody></table>[/code]`;
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
                start: function (src) {
                    let index = src.indexOf("[code][/code]");
                    return ~index ? index : src.length;
                },
                tokenizer: function (src, tokens) {
                    if (src.startsWith("[code][/code]")) {
                        return {
                            type: "codeBlock",
                            raw: "[code][/code]",
                            tokens: []
                        };
                    } else return false;
                },
                renderer: function (token) {
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
            '${CURSOR("' + defaultValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '")}';
    }

    let textareaDatas = new Map();
    function updateTextareas() {
        for (const [textarea, textareaData] of textareaDatas) {
            if (!document.body.contains(textarea)) {
                // Remove textareas that are no longer in the DOM.
                textareaDatas.delete(textarea);
                if (textareaData.mirror.parentNode) textareaData.mirror.parentNode.removeChild(textareaData.mirror);
                if (textareaData.autoFiller.parentNode) textareaData.autoFiller.parentNode.removeChild(textareaData.autoFiller);
                if (textareaData.markdownPreviewer.parentNode) textareaData.markdownPreviewer.parentNode.removeChild(textareaData.markdownPreviewer);
                textareaData.elementParent.removeEventListener("focusout", textareaData.elementParentFocusOutListener);
            } else if (textarea.offsetParent) {
                // Update width of textarea mirrors.
                textareaData.mirror.style.width =
                    textarea.getBoundingClientRect().width -
                    parseFloat(textareaData.styles.paddingLeft) -
                    parseFloat(textareaData.styles.paddingRight) -
                    parseFloat(textareaData.styles.borderLeftWidth) -
                    parseFloat(textareaData.styles.borderRightWidth) + "px";
                textareaData.mirror.style.fontFamily = textareaData.styles.fontFamily;
                textareaData.mirror.style.fontWeight = textareaData.styles.fontWeight;
                textareaData.mirror.style.fontStyle = textareaData.styles.fontStyle;
                textareaData.mirror.style.fontSize = textareaData.styles.fontSize;
                textareaData.mirror.style.lineHeight = textareaData.styles.lineHeight;
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

        // If there is a newline character between the start delimiter and out cursor, we don't want
        // to show the auto filler because more than likely, the user will still want to use the
        // up and down arrow keys to move the caret instead of scrolling through the auto filler
        // menu.
        let newLineIndex = textareaData.element.value.indexOf("\n", startDelimIndex);
        if (~newLineIndex && newLineIndex < textareaData.element.selectionStart) {
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
            textareaData.element.offsetLeft -
            textareaData.element.scrollLeft + "px";
        textareaData.autoFiller.style.top =
            textareaData.caretTop +
            parseFloat(textareaData.styles.paddingTop) +
            parseFloat(textareaData.styles.borderTopWidth) +
            textareaData.element.offsetTop -
            textareaData.element.scrollTop + "px";

        // Set the autoFiller's artificial focus index to 0 (the first item in the list).
        textareaData.autoFillerFocusedIndex = 0;

        textareaData.autoFilling = true;
    }

    function escapeHTML(string) {
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

        // Call checkReplacements() to evaluate the new value. The text will be inserted into the
        // textarea in this function call.
        checkReplacements(textareaData, newValue, newCaretPos);
    }

    function setTextareaValue(textareaData, value, suppressInputs) {
        // If the textarea's data doesn't need to be updated to begin with, don't do anything.
        if (textareaData.element.value == value) {
            return;
        }
        if (suppressInputs) {
            textareaData.suppressInputs = true;
        }
        textareaData.element.focus();

        // Check if the browser will let us carry out the proper commands.
        const selectAllAllowed = document.queryCommandSupported("selectAll") && document.queryCommandEnabled("selectAll");
        const insertHTMLAllowed = document.queryCommandSupported("insertHTML") && document.queryCommandEnabled("insertHTML");
        const insertTextAllowed = document.queryCommandSupported("insertText") && document.queryCommandEnabled("insertText");

        let hasBeenReplaced = false;

        if (insertHTMLAllowed) {
            // Call selectAll command instead of selecting the text manually, if allowed.
            if (!selectAllAllowed || !document.execCommand("selectAll", false)) {
                textareaData.element.setSelectionRange(0, textareaData.element.value.length);
            }

            // We set the textarea's value using insertHTML to allow for undoing/redoing, and
            // because insertHTML seems to perform much faster than insertText in some browsers.
            hasBeenReplaced = document.execCommand("insertHTML", false, escapeHTML(value) + (value[value.length - 1] == "\n" ? "<br>" : ""));
        } else if (insertTextAllowed) {
            if (!selectAllAllowed || !document.execCommand("selectAll", false)) {
                textareaData.element.setSelectionRange(0, textareaData.element.value.length);
            }

            // Fall back to insertText if insertHTML is not enabled (Firefox).
            hasBeenReplaced = document.execCommand("insertText", false, value);
        }

        if (!hasBeenReplaced) {
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

        // If there are no ${CURSOR()} markers, add the current caretPosition so that the caret goes
        // back to where it was originally.
        if (!caretPositions.length) {
            caretPositions = [[caretPosition, caretPosition]]
        }

        // If there are multiple ${CURSOR()} markers, show the tab indicator to show that.
        if (caretPositions.length > 1) {
            textareaData.tabIndicator.style.display = "";
            textareaData.isTabbing = true;
            textareaData.tabFieldIndex = 1;
            textareaData.tabIndicator.lastElementChild.innerText = `${textareaData.tabFieldIndex}/${caretPositions.length}`;
            textareaData.textBetweenFields = new Array(caretPositions.length + 1);
            for (let i = 0, lastIndex = 0; i < caretPositions.length; i++) {
                textareaData.textBetweenFields[i] = value.substring(lastIndex, caretPositions[i][0]);
                lastIndex = caretPositions[i][1];
            }
            textareaData.textBetweenFields[caretPositions.length] = value.substring(caretPositions[caretPositions.length - 1][1]);
        }

        // If the textarea's value doesn't need to be updated to begin with, there's no point in
        // messing with it at all, and we can just return without making any changes.
        if (textareaData.element.value == value && caretPositions.length == 1) {
            textareaData.element.focus();
            return;
        }

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
        const incompleteMacro = getIncompleteTrigger(textareaData).trim().toLowerCase();

        const filteredIndices = [];
        for (let i = 0, l = REPLACEMENTS.length; i < l; i++) {
            if (REPLACEMENTS[i].mainTrigger.startsWith(incompleteMacro) && (AUTOFILL_REPLACEMENT || REPLACEMENTS[i].mainTrigger != incompleteMacro)) {
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

        textareaData.autoFillerVisibleIndices = filteredIndices;

        // Make a fragment where we will add all the results.
        const fragment = document.createDocumentFragment();

        for (const index of filteredIndices) {
            const replacement = REPLACEMENTS[index];
            // Each entry is a <li>.
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="sn-card-component_accent-bar"></div>
                <strong>${START_DELIMITER}${escapeHTML(replacement.mainTrigger).replace(/(\.|_)/g, "$1<wbr>") || ""}${END_DELIMITER}</strong>
                ${typeof replacement.description == "string" ?
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
            li.addEventListener("keydown", function (e) {
                if (e.code == "Enter" || e.code == " ") selectAutoFillerItem(e, textareaData);
            });
            // Hover-in listener to left-align the tooltip, as well as make the item highlighted.
            li.addEventListener("mouseenter", function (e) {
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
            li.addEventListener("mouseleave", function (e) {
                li.setAttribute(`data-${CSS_PREFIX}-hovering`, "false");
                if (li.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                    li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                    document.documentElement.setAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`, "false");

                    // The tooltip lingers even after hovering out, so we need to wait for the tooltip
                    // to actually disappear before we can return the center alignment is normally has.
                    const tooltip = document.getElementsByClassName("tooltip")[0];
                    if (tooltip) {
                        new MutationObserver(function (_, self) {
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
            li.addEventListener("focus", function (e) {
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
            li.addEventListener("blur", function (e) {
                li.setAttribute(`data-${CSS_PREFIX}-focusing`, "false");
                if (li.getAttribute(`data-${CSS_PREFIX}-hovering`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                    li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                    document.documentElement.setAttribute(`data-${CSS_PREFIX}-hovering-auto-filler-option`, "false");
                    const tooltip = document.getElementsByClassName("tooltip")[0];
                    if (tooltip) {
                        new MutationObserver(function (_, self) {
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
    }

    function selectMacroItem(e) {
        const macro = _MACROS[e.currentTarget.getAttribute(`data-${CSS_PREFIX}-macro-name`)];

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
            const textareaType = textarea.getAttribute("data-stream-text-input");
            // Check if we need to switch to the other type of <textarea>
            if ((textareaType == "comments" && macro.type == PRIVATE) || (textareaType == "work_notes" && macro.type == PUBLIC)) {
                // Manually click the checkbox to toggle work notes.
                const checkbox = document.querySelector(".sn-controls.row .pull-right input[type='checkbox'][name='work_notes-journal-checkbox'], .sn-controls.row .pull-right input[type='checkbox'][name='comments-journal-checkbox']");
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
        const index = +macroContainer.getAttribute(`data-${CSS_PREFIX}-focused-index`);
        const children = macroContainer.lastElementChild.children;
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

    if (DO_REPLACEMENTS) {
        document.addEventListener("input", function (e) {
            updateTextareas();
            const textareaData = textareaDatas.get(e.target);
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

        document.addEventListener("selectionchange", function (e) {
            const textareaData = textareaDatas.get(document.activeElement);
            if (textareaData) {
                updateTextareaSelection(textareaData);
                if (textareaData.wasTabbing || textareaData.isTabbing) {
                    // Determine which field is currently focused.
                    const caretPos = textareaData.element.selectionStart;
                    const value = textareaData.element.value;
                    const betweenText = textareaData.textBetweenFields;

                    // Try to match the beginning of the text.
                    if (!Array.isArray(betweenText) || !value.startsWith(betweenText[0])) {
                        textareaData.isTabbing = false;
                        textareaData.wasTabbing = false;
                        textareaData.textBetweenFields = null;
                        textareaData.tabFieldIndex = 0;
                        textareaData.tabIndicator.style.display = "none";
                        return;
                    }

                    // If the caret is before the first field, make the index 0.5 to indicate it is
                    // between 0 and 1.
                    if (caretPos < betweenText[0].length) {
                        textareaData.isTabbing = false;
                        textareaData.wasTabbing = true;
                        textareaData.tabFieldIndex = 0.5;
                        textareaData.tabIndicator.style.display = "none";
                        return;
                    }

                    let lastIndex = betweenText[0].length;
                    for (let i = 1; i < betweenText.length; i++) {
                        const index = value.indexOf(betweenText[i], lastIndex)
                        // If we can't match the text, we should stop allowing tabs since the text
                        // in between has changed and we can't match it anymore.
                        if (!~index) {
                            textareaData.isTabbing = false;
                            textareaData.wasTabbing = false;
                            textareaData.textBetweenFields = null;
                            textareaData.tabFieldIndex = 0;
                            textareaData.tabIndicator.style.display = "none";
                            return;
                        }
                        // If our caret is before the next index of matched text, it means our caret
                        // is focusing on this field.
                        if (caretPos <= index) {
                            textareaData.isTabbing = true;
                            textareaData.wasTabbing = false;
                            textareaData.tabFieldIndex = i;
                            textareaData.tabIndicator.lastElementChild.innerText = `${i}/${betweenText.length - 1}`;
                            textareaData.tabIndicator.style.display = "";
                            return;
                        }

                        lastIndex = index + betweenText[i].length;
                        // If our caret is somewhere in the text between fields, make our index half
                        // way in between the two.
                        if (caretPos < lastIndex) {
                            textareaData.isTabbing = false;
                            textareaData.wasTabbing = true;
                            textareaData.tabFieldIndex = i + 0.5;
                            textareaData.tabIndicator.lastElementChild.innerText = `?/${betweenText.length - 1}`;
                            return;
                        }
                    }
                }
            }
        });
    }

    const OUIsPopulated = new Promise(function (resolve, reject) {
        const url = "https://gitlab.com/wireshark/wireshark/-/raw/master/manuf";
        let xhr = new XMLHttpRequest();
        // Use allorigins.win to override the CORS policy
        xhr.open("GET", `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${new Date().valueOf()}`);
        xhr.addEventListener("readystatechange", function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    resolve(getOUIObject(JSON.parse(this.response).contents));
                } else {
                    // If allorigins.win fails, we fallback to a list on the GitHub repo.
                    xhr = new XMLHttpRequest();
                    xhr.open("GET", `https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/OUI_list.txt?timestamp=${new Date().valueOf()}`);
                    xhr.addEventListener("readystatechange", function () {
                        if (this.readyState == 4) {
                            if (this.status == 200) {
                                resolve(getOUIObject(this.response));
                            } else {
                                // If this failed too, we just give up.
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

    const MAC_ADDRESS_SPAN_STYLES = `
        .${CSS_PREFIX}-smart-text-span {
            padding: .5rem;
            margin: -.5rem;
            z-index: 1;
            position: relative;
        }

        .${CSS_PREFIX}-smart-text-span:hover {
            padding: .75rem 1rem;
            margin: -.75rem -1rem;
            z-index: 2;
        }

        .${CSS_PREFIX}-smart-text-span > span:first-child {
            position: absolute;
            opacity: 0;
            pointer-events: none;
            white-space: nowrap;
        }

        .${CSS_PREFIX}-smart-text-span > span:last-child {
            position: relative;
            display: inline-block;
        }

        .${CSS_PREFIX}-smart-text-span > span > input {
            text-decoration: underline;
            margin: 0;
            border: 0;
            padding: 0;
            font-family: inherit;
            font-size: inherit;
            font-weight: inherit;
            color: inherit;
            vertical-align: baseline;
            background: transparent;
        }

        .${CSS_PREFIX}-smart-text-span:hover .${CSS_PREFIX}-smart-text-popup,
        .${CSS_PREFIX}-smart-text-span > span > input:focus ~ .${CSS_PREFIX}-smart-text-popup,
        .${CSS_PREFIX}-smart-text-span > span:focus-within > .${CSS_PREFIX}-smart-text-popup {
            display: block;
        }

        .${CSS_PREFIX}-smart-text-popup,
        .${CSS_PREFIX}-smart-text-popup ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .${CSS_PREFIX}-smart-text-popup {
            display: none;
            position: absolute;
            top: initial;
            bottom: calc(100% + .5rem);
            left: 50%;
            background-color: white;
            border-radius: 3px;
            border: 1px solid #cbcbcb;
            font-size: 13px;
            font-weight: initial;
            font-style: initial;
            text-decoration: initial;
            color: initial;
            width: 140px;
            transform: translateX(-50%);
            padding: .25em 0;
            font-family: SourceSansPro, "Helvetica Neue", Helvetica, Arial, sans-serif;
            margin: 0 !important;
        }

        .${CSS_PREFIX}-smart-text-popup li {
            list-style: none;
            padding: .1em .25em !important;
            box-sizing: border-box;
            margin: 0;
        }

        .${CSS_PREFIX}-smart-text-popup button,
        .${CSS_PREFIX}-smart-text-popup a {
            text-decoration: underline;
            color: inherit;
            margin: -.1em -.25em;
            border: 0;
            border-radius: 0;
            padding: .1em .25em !important;
            background: transparent;
            min-height: initial;
            min-width: initial;
            line-height: inherit;
            font-size: inherit;
            font-family: inherit;
            vertical-align: baseline;
            cursor: pointer;
            height: 100%;
            width: calc(100% + .5em);
            display: inline-block;
            text-align: left;
            box-sizing: border-box;
        }

        .${CSS_PREFIX}-smart-text-popup button:hover,
        .${CSS_PREFIX}-smart-text-popup button:focus,
        .${CSS_PREFIX}-smart-text-popup a:hover,
        .${CSS_PREFIX}-smart-text-popup a:focus {
            background-color: #e6e9eb;
            text-decoration: underline;
        }

        .${CSS_PREFIX}-smart-text-popup li ul {
            margin: -.25em;
        }

        .${CSS_PREFIX}-smart-text-popup li ul li {
            padding: .1em .25em 0 1.25em !important;
        }

        .${CSS_PREFIX}-smart-text-popup li ul li button,
        .${CSS_PREFIX}-smart-text-popup li ul li a {
            margin: -.1em -.25em 0 -1.25em;
            padding: .1em .25em 0 1.25em !important;
            width: calc(100% + 1.5em);
        }

        .${CSS_PREFIX}-smart-text-popup > li:first-child {
            font-weight: bold;
            text-transform: uppercase;
            font-size: .8em;
            letter-spacing: .25px;
            text-align: center;
        }
    `;

    const MAC_ADDRESS_REGEX = /\b(?:[a-f\d]{12}(?![a-f\d])|[a-f\d]{4}(?:[-–][a-f\d]{4}){2}|[a-f\d]{4}([^a-z\d\s])[a-f\d]{4}\1[a-f\d]{4}(?!\1?[a-f\d])|[a-f\d]{2}(?:[-–][a-f\d]{2}){5}|[a-f\d]{2}([^a-z\d])[a-f\d]{2}(?:\2[a-f\d]{2}){4})(?!\2?[a-f\d])/i;
    const IP_ADDRESS_REGEX = /(^|[^.])\b((?:[1-9]?\d|1\d\d|2[0-4]\d|2[0-5][0-5])(?:\.(?:[1-9]?\d|1\d\d|2[0-4]\d|2[0-5][0-5])){3})\b(?!\.\d)/;
    const NODE_NAME_REGEX = /\b(rescomp-\d+-\d+|sr\d+-[\da-f]+)(?:\.stanford.edu)?\b/;
    function replaceSmartText(node) {
        if (node.nodeType == Node.TEXT_NODE) {
            let macAddressMatch;
            let ipAddressMatch;
            let nodeNameMatch;

            while (true) {
                macAddressMatch = MAC_ADDRESS_REGEX.exec(node.textContent);
                ipAddressMatch = IP_ADDRESS_REGEX.exec(node.textContent);
                nodeNameMatch = NODE_NAME_REGEX.exec(node.textContent);

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

                // Break if htere are no matches.
                if (firstMatch === null) {
                    break;
                }

                if (firstMatch == macAddressMatch) {
                    const formatted = macAddressMatch[0].toUpperCase().replace(/[^A-F\d]/g, "").replace(/(.{2})/g, ":$1").substring(1);
                    const macSpan = document.createElement("span");
                    macSpan.classList.add(`${CSS_PREFIX}-smart-text-span`);
                    macSpan.innerHTML = `<span>${macAddressMatch[0]}</span><span><input value="${macAddressMatch[0]}" readonly/><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>MAC Address</li><li class="${CSS_PREFIX}-mac-address-oui" style="font-style:italic">Loading OUIs...</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a target="netdb" href="https://${NETDB_HOST}/fs_node_result?display_order.hardware_address=1&display_order.object=2&display_order.ip_address=3&display_order.node_state=4&display_order.make_and_model=5&display_order.os=6&display_order.department=7&display_order.user=8&column=Name&direction=ascending&purge=&hardware_address=${formatted}">NetDB</a></li><li><a target="dhcp_log" href="http://day.stanford.edu:9696/manage/dhcplog/check_db?input=${formatted}">DHCP Log</a></li><li><a target="mydevices" href="https://mydevices.stanford.edu/group/mydevices?${encodeURIComponent(`${CSS_PREFIX}-search-mac`)}=${encodeURIComponent(formatted)}">MyDevices</a></li><li><a target="iprequest" href="https://iprequest.stanford.edu/iprequest/process/search.jsp?ipaddr=&macaddress=${encodeURIComponent(formatted)}&search=0&sort=UPPER%28lastname%29%2C+UPPER%28firstname%29">IPRequest</a></li></ul></li></ul></span>`;

                    macSpan.addEventListener("click", e => e.stopPropagation());

                    let input = macSpan.lastElementChild.firstElementChild;
                    input.addEventListener("click", function (e) {
                        e.preventDefault();
                        input.focus();
                        input.select();
                    });

                    const OUISpan = macSpan.querySelector(`.${CSS_PREFIX}-mac-address-oui`);
                    OUIsPopulated.then(function (OUIs) {
                        let prefix = formatted.substring(0, 8);
                        if (!(prefix in OUIs)) {
                            OUISpan.textContent = "Unregistered OUI";
                        } else if (typeof OUIs[prefix] == "number") {
                            prefix = formatted.substring(0, OUIs[prefix]);
                            if (prefix in OUIs) {
                                OUISpan.textContent = `OUI: ${OUIs[prefix]}`;
                                OUISpan.style.fontStyle = "initial";
                            } else {
                                OUISpan.textContent = "Unregistered OUI";
                            }
                        } else {
                            OUISpan.textContent = `OUI: ${OUIs[prefix]}`;
                            OUISpan.style.fontStyle = "initial";
                        }
                    }, function () {
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
                    macSpan.lastElementChild.firstElementChild.style.width = macSpan.firstElementChild.getBoundingClientRect().width + "px";
                    node.textContent = node.textContent.substring(macAddressMatch.index + macAddressMatch[0].length);
                }

                if (firstMatch == ipAddressMatch) {
                    let formatted = ipAddressMatch[2];
                    const ipSpan = document.createElement("span");
                    ipSpan.classList.add(`${CSS_PREFIX}-smart-text-span`);
                    ipSpan.innerHTML = `${ipAddressMatch[1]}<span>${ipAddressMatch[2]}</span><span><input value="${ipAddressMatch[2]}" readonly/><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>IP Address</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a target="netdb" href="https://${NETDB_HOST}/fs_network_result?display_order.object=1&display_order.location=2&display_order.address_space=2&display_order.comment=3&purge=&dhcp_address=${formatted}">NetDB</a></li><li><a target="iprequest" href="https://iprequest.stanford.edu/iprequest/process/search.jsp?ipaddr=${encodeURIComponent(formatted)}&macaddress=&search=0&sort=UPPER%28lastname%29%2C+UPPER%28firstname%29">IPRequest</a></li></ul></li></ul></span>`;

                    ipSpan.addEventListener("click", e => e.stopPropagation());

                    let input = ipSpan.lastElementChild.firstElementChild;
                    input.addEventListener("click", function (e) {
                        e.preventDefault();
                        input.focus();
                        input.select();
                    });

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
                    ipSpan.lastElementChild.firstElementChild.style.width = ipSpan.firstElementChild.getBoundingClientRect().width + "px";
                    node.textContent = node.textContent.substring(ipAddressMatch.index + ipAddressMatch[0].length);
                }

                if (firstMatch == nodeNameMatch) {
                    const formatted = nodeNameMatch[1];
                    const nodeSpan = document.createElement("span");
                    nodeSpan.classList.add(`${CSS_PREFIX}-smart-text-span`);
                    nodeSpan.innerHTML = `<span>${nodeNameMatch[0]}</span><span><input value="${nodeNameMatch[0]}" readonly/><ul class="${CSS_PREFIX}-smart-text-popup dropdown-menu"><li>Node Name</li><li><button class="btn ${CSS_PREFIX}-smart-text-copy">Copy</button></li><li>Search in:</li><li><ul><li><a target="netdb" href="https://${NETDB_HOST}/node_info?name=${formatted}.stanford.edu">NetDB</a></li><li><a target="iprequest" href="https://iprequest.stanford.edu/iprequest/process/search.jsp?ipaddr=&macaddress=&hostname=${encodeURIComponent(formatted)}&search=0&sort=UPPER%28lastname%29%2C+UPPER%28firstname%29">IPRequest</a></li></ul></li></ul></span>`;

                    nodeSpan.addEventListener("click", e => e.stopPropagation());

                    let input = nodeSpan.lastElementChild.firstElementChild;
                    input.addEventListener("click", function (e) {
                        e.preventDefault();
                        input.focus();
                        input.select();
                    });

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
                    nodeSpan.lastElementChild.firstElementChild.style.width = nodeSpan.firstElementChild.getBoundingClientRect().width + "px";
                    node.textContent = node.textContent.substring(nodeNameMatch.index + nodeNameMatch[0].length);
                }
            }
        } else if (node.nodeType == Node.ELEMENT_NODE || node.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                replaceSmartText(node.childNodes[i]);
            }
        }
    }

    // Find the indices where the tab field corresponding with the given index starts and end.
    function getCaretIndicesOfTabField(textareaData, index) {
        if (!Array.isArray(textareaData.textBetweenFields) || index < 1 || index >= textareaData.textBetweenFields) {
            return null;
        }

        const value = textareaData.element.value;
        const betweenText = textareaData.textBetweenFields;
        if (!value.startsWith(betweenText[0])) {
            return null;
        }

        let lastIndex = betweenText[0].length;
        for (let i = 1; i < index; i++) {
            const index = value.indexOf(betweenText[i], lastIndex)
            if (!~index) {
                return null;
            }
            lastIndex = index + betweenText[i].length;
        }

        const nextIndex = value.indexOf(betweenText[index], lastIndex);
        if (!~nextIndex) {
            return null;
        }

        return [lastIndex, nextIndex];
    }

    function f() {
        let textareaElements = document.querySelectorAll(`textarea:not([data-${CSS_PREFIX}-found-textarea])`);
        for (const textarea of textareaElements) {
            textarea.setAttribute(`data-${CSS_PREFIX}-found-textarea`, "true");
            const styles = getComputedStyle(textarea);

            let textareaData = {
                element: textarea,
                elementParent: textarea.parentNode,
                styles: styles
            };

            if (DO_REPLACEMENTS) {
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
                autoFiller.classList.add(`${CSS_PREFIX}-auto-filler`, "h-card", "dropdown-menu");
                autoFiller.style.display = "none";
                textarea.parentNode.appendChild(autoFiller);

                function parentFocusOut(e) {
                    if (e.relatedTarget === null || (e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget))) {
                        showOrHideAutoFiller(textareaData);
                        textareaData.isTabbing = false;
                        textareaData.wasTabbing = true;
                        textareaData.tabIndicator.style.display = "none";
                    }
                }
                textarea.parentNode.addEventListener("focusout", parentFocusOut);

                textarea.addEventListener("keydown", function (e) {
                    // Only intercept keypresses when the autoFiller is open.
                    if (textareaData.autoFilling) {
                        if (e.code == "ArrowDown") {
                            // An arrow down should move the focus down one.
                            if (textareaData.autoFillerFocusedIndex < textareaData.autoFiller.children.length - 1) {
                                e.preventDefault();
                                textareaData.autoFillerFocusedIndex++;
                                focusAutoFillItem(textareaData);
                            }
                        } else if (e.code == "ArrowUp") {
                            // An arrow up should move the focus up one.
                            if (textareaData.autoFillerFocusedIndex > 0) {
                                e.preventDefault();
                                textareaData.autoFillerFocusedIndex--;
                                focusAutoFillItem(textareaData);
                            }
                        } else if (e.code == "Tab" || e.code == "Enter") {
                            // A Tab or Enter is used to "click" on the currently selected item from the
                            // list. Normally, a button only activates on Spacebar and Enter, but Tab is
                            // more natural for auto-completing, and Spacebar instead should insert an
                            // actual space.
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            textareaData.autoFiller.children[textareaData.autoFillerFocusedIndex].click();
                        }
                    }
                });

                textarea.addEventListener("mousedown", function (e) {
                    updateTextareaSelection(textareaData);
                });

                textarea.addEventListener("mouseup", function (e) {
                    updateTextareaSelection(textareaData);
                });

                textareaData.mirror = mirror;
                textareaData.autoFiller = autoFiller;
                textareaData.autoFilling = false;
                textareaData.autoFillerVisibleIndices = [];
                textareaData.caretTop = null;
                textareaData.caretLeft = null;
                textareaData.elementParentFocusOutListener = parentFocusOut;
            }

            if (DO_MARKDOWN) {
                let markdownPreviewer = document.createElement("div");
                markdownPreviewer.classList.add(`${CSS_PREFIX}-textarea-md-preview`, "form-control");
                markdownPreviewer.setAttribute(`data-${CSS_PREFIX}-is-previewing`, "false");
                markdownPreviewer.style.display = "none";
                let markdownPreviewerRoot = markdownPreviewer.attachShadow({ mode: "open" });
                markdownPreviewerRoot.innerHTML = `<style>${MAC_ADDRESS_SPAN_STYLES}</style><link href="styles/activity_encapsulated.css" rel="stylesheet" type="text/css"><style>:host img{max-width:100%;height:auto;overflow-y:visible}</style><div style="overflow-y:visible;padding:0 18px;border-top:1px solid transparent;border-bottom:1px solid transparent;margin:-1px 0"></div>`;
                textarea.parentNode.insertBefore(markdownPreviewer, textarea.nextElementSibling);

                textareaData.oldHeight = null;
                textareaData.markdownPreviewer = markdownPreviewer;
                textareaData.markdownPreviewerRoot = markdownPreviewerRoot.lastElementChild;
            }

            if (DO_REPLACEMENTS || DO_MACROS) {
                let tabIndicator = document.createElement("div");
                tabIndicator.innerHTML = `<button class="btn btn-default"><span class="icon icon-connect-close"></span></button>Use <kbd>Tab</kbd> to move to the next field (<span>0/0</span>)`;
                tabIndicator.classList.add(`${CSS_PREFIX}-tab-indicator`, "form-control");
                tabIndicator.style.display = "none";
                textarea.parentNode.appendChild(tabIndicator);
                textareaData.tabIndicator = tabIndicator;
                textareaData.tabFieldIndex = 0;
                textareaData.textBetweenFields = null;
                tabIndicator.firstElementChild.addEventListener("mousedown", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
                tabIndicator.firstElementChild.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    textareaData.isTabbing = false;
                    textareaData.wasTabbing = false;
                    textareaData.tabFieldIndex = 0;
                    textareaData.textBetweenFields = null;
                    textareaData.tabIndicator.style.display = "none";
                });

                textarea.addEventListener("keydown", function (e) {
                    if (e.code == "Tab" && (textareaData.isTabbing || textareaData.wasTabbing)) {
                        const index = e.shiftKey ? Math.ceil(textareaData.tabFieldIndex) - 1 : Math.floor(textareaData.tabFieldIndex) + 1;
                        let caretIndices = getCaretIndicesOfTabField(textareaData, index);
                        // Allow a Tab event to go through as normal if we are no longer focusing on
                        // a tabbable field.
                        if (caretIndices) {
                            e.preventDefault();
                            textareaData.tabFieldIndex = index;
                            textareaData.element.setSelectionRange(...caretIndices);
                            tabIndicator.lastElementChild.innerText = `${textareaData.tabFieldIndex}/${textareaData.textBetweenFields.length - 1}`;
                        }
                    }
                });
            }

            textareaDatas.set(textarea, textareaData);
        }

        let pullRightSections = document.querySelectorAll(`.sn-controls.row .pull-right:not([data-${CSS_PREFIX}-macro-btn-inserted])`);
        if (DO_MACROS) {
            for (const section of pullRightSections) {
                section.setAttribute(`data-${CSS_PREFIX}-macro-btn-inserted`, "true");
                let macroContainer = document.createElement("span");
                macroContainer.classList.add(`${CSS_PREFIX}-macro-list-container`);
                macroContainer.addEventListener("keydown", function (e) {
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
                macroContainer.addEventListener("focusout", function (e) {
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
                btn.addEventListener("mousedown", function (e) {
                    // The <button> is receiving focus. Safari and Firefox have a bug where a <button> won't
                    // be focused when you click on it
                    // (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#clicking_and_focus)
                    // so we have to do that ourselves.
                    if (document.activeElement != btn) {
                        btn.focus();
                        e.preventDefault();
                    }
                });
                btn.addEventListener("click", function (e) {
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
                macroList.classList.add(`${CSS_PREFIX}-macro-list`, "h-card", "dropdown-menu");
                macroList.style.display = "none";
                for (const macro of MACROS) {
                    let li = document.createElement("li");
                    li.innerHTML = `
                    <div class="sn-card-component_accent-bar"></div>
                    <strong>${escapeHTML(macro.name).replace(/(\.|_)/g, "$1<wbr>") || "<i>[Empty Name]</i>"}</strong>
                    ${typeof macro.description == "string" ?
                            `<small>${macro.description || '""'}</small>` :
                            `<small class="${CSS_PREFIX}-desc-flex">"<span>${macro.description[1]}</span>"</small>`
                        }
                `;
                    li.setAttribute(`data-${CSS_PREFIX}-macro-name`, macro.name);
                    li.tabIndex = 0;
                    li.role = "button";

                    li.addEventListener("click", selectMacroItem);
                    li.addEventListener("keydown", function (e) {
                        if (e.code == "Enter" || e.code == " ") selectMacroItem(e);
                    });
                    li.addEventListener("mouseenter", function (e) {
                        li.setAttribute(`data-${CSS_PREFIX}-hovering`, "true");
                        li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
                    });
                    li.addEventListener("mouseleave", function (e) {
                        li.setAttribute(`data-${CSS_PREFIX}-hovering`, "false");
                        if (li.getAttribute(`data-${CSS_PREFIX}-focusing`) != "true" && li.getAttribute(`data-${CSS_PREFIX}-artificial-focusing`) != "true") {
                            li.firstElementChild.classList.remove("sn-card-component_accent-bar_dark");
                        }
                    });
                    li.addEventListener("focus", function (e) {
                        li.setAttribute(`data-${CSS_PREFIX}-focusing`, "true");
                        li.firstElementChild.classList.add("sn-card-component_accent-bar_dark");
                        macroContainer.setAttribute(`data-${CSS_PREFIX}-focused-index`, Array.prototype.indexOf.call(li.parentNode.children, li));
                        focusMacroItem(macroContainer);
                    });
                    li.addEventListener("blur", function (e) {
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
        }

        pullRightSections = document.querySelectorAll(`.sn-controls.row .pull-right:not([data-${CSS_PREFIX}-preview-btn-inserted])`);
        if (DO_MARKDOWN) {
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
                prePostBtn.addEventListener("click", function (e) {
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
                    let hasChangedValue = false;
                    for (const textarea of textareas) {
                        if (!textarea || !textarea.offsetParent) continue;
                        let parsedText = parseMarkdownText(textarea.value);
                        if (textarea.value != parsedText) {
                            setTextareaValue(textareaDatas.get(textarea), parsedText, false);
                            hasChangedValue = true;
                        }
                    }

                    // Wait a little bit of time before clicking the post button to ensure the textarea
                    // has had enough time to update.
                    setTimeout(function () {
                        postBtn.click();
                        let previewBtn = section.querySelector(`.${CSS_PREFIX}-preview-btn[data-${CSS_PREFIX}-is-previewing="true"]`);
                        if (previewBtn) {
                            previewBtn.click();
                        }
                    }, hasChangedValue ? SUBMIT_DELAY : 0);
                });

                // Make a Preview button to toggle previewing a textarea's markdown.
                let previewBtn = document.createElement("button");
                previewBtn.classList.add(`${CSS_PREFIX}-preview-btn`, "btn", "btn-default");
                previewBtn.innerText = "Preview";
                previewBtn.setAttribute(`data-${CSS_PREFIX}-is-previewing`, "false");
                previewBtn.addEventListener("click", function (e) {
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

                        if (previewing) {
                            // Most of the code below is taken directly from parseMarkdownText().
                            let escaped = "";
                            let startIndex;
                            while (~(startIndex = parsed.indexOf("[code]"))) {
                                escaped += escapeHTML(parsed.substring(0, startIndex));
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
                            escaped += escapeHTML(parsed);

                            textareaData.markdownPreviewerRoot.innerHTML = escaped;
                            textareaData.markdownPreviewer.style.display = "block";
                            textarea.tabIndex = -1;
                            replaceSmartText(textareaData.markdownPreviewerRoot);

                            textareaData.oldHeight = textareaData.element.style.height;
                            textareaData.element.style.height = textareaData.markdownPreviewerRoot.scrollHeight + "px";
                            textareaData.element.style.maxHeight = "initial";
                        } else {
                            textareaData.markdownPreviewer.style.display = "none";
                            // For whatever reason, ServiceNow seems to have a bug where a textarea with
                            // tabindex=0 does not allow you to push Enter (???). The cursor just does
                            // not move to a new line when you push Enter, and I don't know why. Instead
                            // of explicitly setting the tabindex to 0, we just remove the tabindex
                            // attribute off the element altogether so that it implicitly goes back to
                            // 0.
                            textarea.removeAttribute("tabindex");

                            textareaData.element.style.height = textareaData.oldHeight;
                            textareaData.element.style.maxHeight = "initial";
                            textareaData.oldHeight = null;
                        }

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

        let comments = document.querySelectorAll(`.sn-widget-textblock-body:not([data-${CSS_PREFIX}-smart-text-searched]),.sn-widget-list-table-cell:not([data-${CSS_PREFIX}-smart-text-searched]),sn-html-content-wrapper:not([data-${CSS_PREFIX}-smart-text-searched])`);
        if (DO_SMART_TEXT) {
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

                if (comment.shadowRoot) {
                    const stylesheet = document.createElement("style");
                    stylesheet.innerHTML = MAC_ADDRESS_SPAN_STYLES;
                    comment.shadowRoot.insertBefore(stylesheet, comment.shadowRoot.firstChild);
                    replaceSmartText(comment.shadowRoot);
                } else {
                    replaceSmartText(comment);
                }
            }
        }

        let saveBtn = document.querySelector(`#sysverb_update_and_stay:not([data-${CSS_PREFIX}-save-btn-inserted])`);
        if (DO_MARKDOWN && saveBtn) {
            saveBtn.setAttribute(`data-${CSS_PREFIX}-save-btn-inserted`, "true");
            let preSaveBtn = document.createElement("button");
            preSaveBtn.classList.add(`${CSS_PREFIX}-presave-btn`, "btn", "btn-default", "action_context");
            preSaveBtn.innerText = saveBtn.innerText;
            preSaveBtn.addEventListener("click", function (e) {
                e.preventDefault();
                let textareas = [
                    document.getElementById("activity-stream-textarea"),
                    document.getElementById("activity-stream-comments-textarea"),
                    document.getElementById("activity-stream-work_notes-textarea")
                ];

                let hasChangedValue = false;
                for (const textarea of textareas) {
                    if (!textarea || !textarea.offsetParent) continue;
                    let parsedText = parseMarkdownText(textarea.value);
                    if (textarea.value != parsedText) {
                        setTextareaValue(textareaDatas.get(textarea), parsedText, false);
                        hasChangedValue = true;
                    }
                }

                setTimeout(function () {
                    saveBtn.click();
                }, hasChangedValue ? SUBMIT_DELAY : 0);
            });

            saveBtn.style.position = "absolute";
            saveBtn.style.opacity = 0;
            saveBtn.style.pointerEvents = "none";
            saveBtn.parentNode.insertBefore(preSaveBtn, saveBtn);
        }

        let saveExitBtn = document.querySelector(`#sysverb_update:not([data-${CSS_PREFIX}-save-exit-btn-inserted])`);
        if (DO_MARKDOWN && saveExitBtn) {
            saveExitBtn.setAttribute(`data-${CSS_PREFIX}-save-exit-btn-inserted`, "true");
            let preSaveExitBtn = document.createElement("button");
            preSaveExitBtn.classList.add(`${CSS_PREFIX}-presave-exit-btn`, "btn", "btn-default", "action_context");
            preSaveExitBtn.innerText = saveExitBtn.innerText;
            preSaveExitBtn.addEventListener("click", function (e) {
                e.preventDefault();
                let textareas = [
                    document.getElementById("activity-stream-textarea"),
                    document.getElementById("activity-stream-comments-textarea"),
                    document.getElementById("activity-stream-work_notes-textarea")
                ];

                let hasChangedValue = false;
                for (const textarea of textareas) {
                    if (!textarea || !textarea.offsetParent) continue;
                    let parsedText = parseMarkdownText(textarea.value);
                    if (textarea.value != parsedText) {
                        setTextareaValue(textareaDatas.get(textarea), parsedText, false);
                        hasChangedValue = true;
                    }
                }

                setTimeout(function () {
                    saveExitBtn.click();
                }, hasChangedValue ? SUBMIT_DELAY : 0);
            });

            saveExitBtn.style.position = "absolute";
            saveExitBtn.style.opacity = 0;
            saveExitBtn.style.pointerEvents = "none";
            saveExitBtn.parentNode.insertBefore(preSaveExitBtn, saveExitBtn);
        }

        let templateBar = document.querySelector(`#template-bar-aria-container:not([data-${CSS_PREFIX}-template-bar-handler-added])`);
        if (false && templateBar) {
            templateBar.setAttribute(`data-${CSS_PREFIX}-template-bar-handler-added`, "true");
            templateBar.addEventListener("click", function () {
                const previousTextareaValues = new Map();
                for (const [textarea, textareaData] of textareaDatas) {
                    previousTextareaValues.set(textarea, textarea.value);
                    console.log(textarea)
                    console.log(textarea.value)
                }

                setTimeout(function () {
                    for (const [textarea, textareaData] of textareaDatas) {
                        console.log(textarea)
                        console.log(textarea.value)
                        if (textarea.value != previousTextareaValues.get(textarea) && !textareaData.suppressInputs) {
                            checkReplacements(textareaData);
                        }
                    }
                }, 5000);
            });
        }
    }
    f();
    new MutationObserver(f).observe(document, {
        childList: true,
        subtree: true
    });

    const stylesheet = document.createElement("style");
    stylesheet.innerHTML = `
        .${CSS_PREFIX}-auto-filler,
        .${CSS_PREFIX}-macro-list {
            list-style: none;
            padding: 0 !important;
            margin: 0;
            overflow-y: auto !important;
            position: absolute !important;
            max-height: 120px;
            width: 220px;
            box-sizing: border-box;
            z-index: 3;
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
            top: initial;
            left: initial;
            width: 300px !important;
            max-height: 180px;
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

        .${CSS_PREFIX}-tab-indicator {
            position: absolute;
            top: 1px;
            right: 1px;
            padding: .2em .4em !important;
            width: initial;
            height: initial !important;
            min-height: initial !important;
            border-top-width: 0;
            border-right-width: 0;
            border-top-left-radius: 0;
            border-bottom-right-radius: 0;
            font-size: 13px !important;
        }

        .${CSS_PREFIX}-tab-indicator button {
            height: 18px;
            width: 18px;
            padding: 0;
            margin-right: .444em;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            font-size: 90%;
        }

        ${MAC_ADDRESS_SPAN_STYLES}
    `;
    document.head.appendChild(stylesheet);
}(Symbol.for("PUBLIC"), Symbol.for("PRIVATE"));