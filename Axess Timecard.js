// ==UserScript==
// @name        Axess Timecard
// @description Helps with filling out your time card on Axess by copying data from Schedule Source and filling it out automatically
// @match       *://pshrprd.sahr.stanford.edu/psc/pshrprd/EMPLOYEE/HRMS/c/ROLE_EMPLOYEE.TL_MSS_EE_SRCH_PRD.GBL
// @match       *://schedulesource.net/Enterprise/TeamWork5/Emp/Time/*
// ==/UserScript==

// Branch off depending on which website this is (since this works on two)
!function() {
    if (location.host == "schedulesource.net") {
        schedulesource();
    } else if (location.host == "pshrprd.sahr.stanford.edu") {
        axess();
    }
}();

// Run only code specific to the Axess Timecard page
function axess() {
    let table;
    // This function waits for a table to load so we can modify it
    function f(_, self) {
        if (table) {
            return self && self.disconnect();
        }
        
        table = document.getElementById("ACE_width");
        
        if (table) {
            table.rows[6].innerHTML = `
                <td colspan="13">
                    <a href="https://schedulesource.net/Enterprise/TeamWork5/Emp/Time/#Timesheet" target="_blank">Retrieve Data</a>
                    <a href="https://schedulesource.net/Enterprise/TeamWork5/Emp/Time/#Timesheet" target="_blank" rel="noreferrer noopener">Open Timesheet</a>
                    <input placeholder="Paste Data">
                </td>
            `;
            // Make the first link run as a JavaScript `open` so that we can `close` the page later on
            table.rows[6].firstElementChild.firstElementChild.addEventListener("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                window.open("https://schedulesource.net/Enterprise/TeamWork5/Emp/Time/#Timesheet");
            });
            // Add a paste listener to the input box and send the data to the window as a message
            table.rows[6].firstElementChild.lastElementChild.addEventListener("paste", function(e) {
                window.postMessage(e.clipboardData.getData("text/plain"), "*");
            });
        }
    }
    f();
    new MutationObserver(f).observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // The window will receive a message with all the data
    window.addEventListener("message", async function(e) {
        // The message must originate from Schedule Source or from its own window
        if (e.origin == "https://schedulesource.net" || e.origin == this.origin) {
            // Make sure the message we are receiving is in the proper format
            if (!e.data.match(/^\d+(\|\d+)*$/)) {
                return;
            }
            // Split all the entries by the "|" character
            let rawentries = e.data.split("|");
            // A dict mapping the date to the times worked on that date
            let entries = {};
            for (let entry of rawentries) {
                // Each entry is in the format of mmddyyyyIIIIOOOO
                // where:
                // mm = the month with leading zero padding
                // dd = the day of the month with leading zero padding
                // yyyy = the full four-digit year
                // IIII = the time for clocking in (24-hour, no colon)
                // OOOO = the time for clocking out
                let match = entry.match(/^(\d{2})(\d{2})(\d{4})(\d+)$/);
                let month = match[1];
                let day = match[2];
                let year = match[3];
                let times = match[4];
                // Format the date as (m)m/(d)d
                let monthday = month.replace(/^0/, "") + "/" + day.replace(/^0/, "");
                // Make an array for all the times we clocked in and out for that day
                entries[monthday] = [];
                while (times) {
                    entries[monthday].push([times.substring(0, 4), times.substring(4, 8)]);
                    times = times.substring(8);
                }
            }
            
            // A dict mapping the date (in (m)m/(d)d format) to to the row corresponding to that date
            let rows = {};
            for (let i = 0; true; i++) {
                let date = document.getElementById("PUNCH_DATE_DISPLAY$" + i);
                if (date) {
                    rows[date.innerText] = date.parentNode.parentNode.parentNode;
                } else {
                    break;
                }
            }

            // This screen gets shown whenever something is loading
            // When it's shown, we can't perform any other actions
            // We have to wait for it to disappear, indicating there are no actions running
            // We check for when it is hidden away to indicate that we can move on
            let pauser = document.getElementById("WAIT_win0");
            // This is the list of actions to perform
            // Each action tells it to add another row
            let actions = [];

            // We iterate through the time entries to see if there are any places where we need to add a row
            for (let entry in entries) {
                let row = rows[entry];
                // Each day has two spaces by default
                // Every day that has more than two, we need to add another row
                for (let i = Math.ceil(entries[entry].length / 2) - 1; i > 0; i--) {
                    actions.push("ADD_PB$" + (row.id.match(/\d+$/)[0] - 1));
                }
            }

            // Asynchronous function so we can wait for all the rows to be added
            function addRows() {
                return new Promise(function(resolve, reject) {
                    // Adds one individual row
                    function addRow() {
                        // If there are no more rows to add, return true to indicate we are done
                        if (!actions.length) {
                            return true;
                        }
                        // Add whatever row is at the end of the queue
                        submitAction_win0(document.win0, actions.pop());
                        // Return false to indicate that we are not done yet
                        return false;
                    }
                    // This MutationObserver waits for the pause screen to go away before performing another action
                    let observer = new MutationObserver(function() {
                        if (pauser.style.display == "none") {
                            // Add a row and check if we are done
                            if (addRow()) {
                                // Disconnect the observer since we don't have any more rows to add
                                observer.disconnect();
                                // Resolve the promise so we can move on
                                resolve();
                            }
                        }
                    });
                    // Add the first row (activates the loading screen that activates all the other rows after it)
                    if (addRow()) {
                        // If there are no actions to be done, resolve the promise immediately
                        resolve();
                    } else {
                        // Activate the observer from before
                        observer.observe(pauser, {
                            attributes: true
                        });
                    }
                });
            }
            // Start the function above to add all the rows and wait until it's done
            await addRows();

            // A dict mapping the date in (m)m/(d)d format to the index of the row to start on for that day
            let rowNums = {};
            for (let i = 0; true; i++) {
                let date = document.getElementById("PUNCH_DATE_DISPLAY$" + i);
                if (date) {
                    rowNums[date.innerText] = i;
                } else {
                    break;
                }
            }

            // An array of 3-long arrays
            // The 0th item is the time in IIII or OOOO format (i.e., the time to put in the <input>)
            // The 1st item is the ID of the <input> to add it to
            // The 2nd item is the ID of *another* <input> that we focus on after inserting the time
            // When we focus the second element, the page sees that event and corrects the time for us
            let timeInputs = [];
            for (let entry in entries) {
                let times = entries[entry];
                // Iterate through all the entries for this particular day
                for (let i = 0, l = times.length; i < l; i++) {
                    // Get the row that this entry will be in
                    let row = document.getElementById("PUNCH_DATE_DISPLAY$" + (rowNums[entry] + Math.floor(i / 2))).parentNode.parentNode.parentNode;
                    // Get the first input (i.e., the time we clock in)
                    timeInputs.push([times[i][0], row.querySelectorAll("input")[(i % 2) * 2].id, row.querySelectorAll("input")[(i % 2) * 2 + 1].id]);
                    // Get the next input (i.e., the time we clock out)
                    timeInputs.push([times[i][1], row.querySelectorAll("input")[(i % 2) * 2 + 1].id, row.querySelectorAll("input")[(i % 2) * 2].id]);
                }
            }

            // Same as before: asynchronous function to do all the steps and wait for it to finish
            function addTimes() {
                return new Promise(function(resolve, reject) {
                    function addTime() {
                        // Add one individual time
                        if (!timeInputs.length) {
                            // If we are done adding times, return true
                            return true;
                        }
                        // Get the first item in the queue to work on
                        timeInput = timeInputs.shift();
                        // Get the input we are inserting into
                        let input = document.getElementById(timeInput[1]);
                        // Change its value to the specified time
                        input.value = timeInput[0];
                        // This is normally set when we enter the time manually by typing it out
                        // Since we are doing it automatically, the page's event listeners aren't activated and we need to set this variable ourselves for the scripts on the page to work correctly
                        oChange_win0 = input;
                        // This function gets called when you focus another element, but we call it manually for the same reason as above
                        doFocus_win0(document.getElementById(timeInput[2]), false, true);
                        // Return false to indicate we are not done adding times yet
                        return false;
                    }
                    // Same as previous observer: waits for loading screen to disappear before performing next action
                    let observer = new MutationObserver(function() {
                        if (pauser.style.display == "none") {
                            if (addTime()) {
                                observer.disconnect();
                                resolve();
                            }
                        }
                    });
                    // Add a time and check if we are done
                    if (addTime()) {
                        // Resolve if we don't have any more time to add
                        resolve();
                    } else {
                        // Activate the observer to trigger the filling in of the next time
                        observer.observe(pauser, {
                            attributes: true
                        });
                    }
                });
            }
            await addTimes();
        }
    });
}

// Run only code specific to Schedule Source
function schedulesource() {
    let ul, grid;
    // Wait for a specific <ul> and other <div> element to load
    function f(_, self) {
        // If we already have access to the two elements we are waiting on, disconnect this Mutation Observer
        if (ul && grid) {
            return self && self.disconnect();
        }
        
        // Try to get the <ul> and other <div> element
        ul = document.querySelector("#tsDiv ul[role='tablist']");
        grid = document.getElementById("entriesGrid");
        
        // If we successfully got the grid <div> element, and this page was opened by clicking the link from the Axess page, we can send a message to the opener window and close this page automatically
        if (grid && document.referrer.match(/^https?:\/\/pshrprd\.sahr\.stanford\.edu\/psc\/pshrprd\/EMPLOYEE\/HRMS\/c\/ROLE_EMPLOYEE.TL_MSS_EE_SRCH_PRD.GBL/)) {
            // Get the time data we need to fill in on the Axess time sheet 
            getTimes().then(function(times) {
                if (window.opener) {
                    // If we have access to the opening window, we can post a message
                    window.opener.postMessage(times, "*");
                } else {
                    // Otherwise, we just copy it to the clipboard so the user can paste it themselves
                    navigator.clipboard.writeText(times);
                }
                // Close out this window automatically since we got the data we came for
                window.close();
            });
        }
        
        // Check if the <ul> and <div> element are loaded
        if (ul && grid) {
            // We add an extra tab at the top that says Copy and copies all the time data to the clipboard
            let li = document.createElement("li");
            li.innerHTML = "<a style='cursor:pointer'>Copy</a>"
            ul.insertBefore(li, ul.firstElementChild.nextSibling);
            // When we click this tab, we want to copy the data to the clipboard
            li.addEventListener("click", async function(e) {
                e.stopPropagation();
                e.preventDefault();
                navigator.clipboard.writeText(await getTimes());
            });
        }
    }
    f();
    new MutationObserver(f).observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // This function gets all the time data and encodes it as a numerical string with "|" delimiters
    function getTimes(noobserve) {
        return new Promise(function(resolve, reject) {
            // Get the <tbody> that houses all the time data
            let tbody = grid.querySelector("tbody");
            let rows = tbody.rows;
            // If the rows haven't finished loading, we need to wait for them still
            if (rows.length == 0) {
                // If noobserve is true, we shouldn't make another MutationObserver
                if (noobserve) {
                    return;
                }
                // Otherwise, make a MutationObserver to check when the rows have finished loading
                new MutationObserver(function() {
                    // Call the same function each time there's an update
                    getTimes(true).then(function(times) {
                        resolve(times);
                    }, function(err) {
                        reject(err);
                    })
                }).observe(tbody, {
                    childList: true
                });
            } else {
                // There are more than 0 rows, so we can take the data from them now
                // This is the numerical string that encodes all the data
                let times = "";
                for (let row of rows) {
                    if (row.classList.contains("k-grouping-row")) {
                        // A grouping row indicates the start of a new day
                        // All the rows after this until the next day are entries for this same day
                        
                        // Get the date this row represents
                        let match = row.innerText.match(/^Date: (\d+)\/(\d+)\/(\d+) \(.+\);/);
                        let month = match[1];
                        let day = match[2];
                        let year = match[3];
                        // Add this date to the string
                        times += `|${("00" + month).substring(month.length)}${("00" + day).substring(day.length)}${year}`;
                    } else if (row.classList.contains("k-master-row")) {
                        // A "master" row indicates a clock-in and -out entry for the same day
                        // Get the time that we clocked in for this row
                        let match = row.querySelector("[title='On']").innerText.match(/^(\d+):(\d+)\s*([AP])M/);
                        let entry = "";
                        let hour, min;
                        if (match) {
                            // If the clock in data was retrieved successfully, encode it as a four-digit string
                            hour = ((match[1] == "12" ? 0 : +match[1]) + (match[3] == "P" ? 12 : 0)).toString();
                            min = match[2];
                            entry += ("00" + hour).substring(hour.length) + ("00" + min).substring(min.length);
                        } else {
                            // Otherwise, we skip this row entirely since we need both clock-in and -out data
                            continue;
                        }
                        // Now do the same thing for the time for clocking out
                        match = row.querySelector("[title='Off']").innerText.match(/^(\d+):(\d+)\s*([AP])M/);
                        if (match) {
                            hour = ((match[1] == "12" ? 0 : +match[1]) + (match[3] == "P" ? 12 : 0)).toString();
                            min = match[2];
                            entry += ("00" + hour).substring(hour.length) + ("00" + min).substring(min.length);
                        } else {
                            continue;
                        }
                        // If we got clocking and out data, add it to the overall string
                        times += entry;
                    }
                }
                // Resolve this promise once we've collected all the data
                // Remove the first character since it's always a "|" delimiter
                resolve(times.substring(1));
            }
        });
    }
}
