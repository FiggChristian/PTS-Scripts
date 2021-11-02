# ServiceNow Improvements

This browser extension (more specifically, a script that *runs* on a browser extension) adds four main improvements to ServiceNow.

## How To Get It

### Google Chrome, Firefox, Edge

1. Install the Violentmonkey browser extension: [Chrome](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag?hl=en) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) | [Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
2. Go to https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/ServiceNow/service-now.user.js
3. Select **Confirm installation** and **Close**
4. Go to your ServiceNow tickets (reload the page if you had it open already) to see the results

### Safari

1. Install the [Userscripts browser extension](https://apps.apple.com/us/app/userscripts/id1463298887?mt=12)
2. Enable the extension in your settings.
3. Click the "</>" icon to the left of the URL search bar and select **Open**
4. Click the "+" at the top left of the page, and select **New Remote**
5. Enter `https://raw.githubusercontent.com/FiggChristian/PTS-Scripts/main/ServiceNow/service-now.user.js` in the text box
6. Make sure to Save (Cmd + S) before closing the window
7. Go to your ServiceNow tickets (reload the page if you had it open already) to see the results

## What It Does

### 1. Macros

Use macros to reply to messages much quicker and with less typing:

![Macro Demo](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Macro%20Demo.gif?raw=true)

At the moment, there's no way to add your own macros, but you can just tell me in Slack to add another one that'll be public for everyone.

### 2. Markdown Support

You can write in Markdown instead of keeping everything as ugly plain text. That means, *emphasizing*, **bolding**, putting things as `code` etc.:

![Markdown Preview](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Markdown%20Preview.mov?raw=true)

Use the Preview button underneath the textarea to see what your comment will actually look like before posting. When you choose to Post, the comment will automatically be turned into pretty Markdown and posted to the feed as normal.

Most features of Markdown are included, including:

1. `**bold**` and `*italicized*` text
2. <code>\`inline code\`</code>
3. ` ``` blocks of code ``` `
4. `~~deleted text~~`
5. numbered and bulleted lists (like this one that goes from 1-9)
6. tables ([link to how to make those](https://www.markdownguide.org/extended-syntax/#tables))
7. `[links](https://google.com)`
8. `![images](https://google.com/favicon.ico)`
9. A bunch of the other normal Markdown stuff

HTML tags like `<code> ... </code>` or `<strong> ... </strong>` are **not** supported by default since you can do almost everything with plain Markdown, but you still *can* use HTML if you want by including it in `[code] ... [/code]` blocks, like `[code]<em>emphasized text</em>[/code]` (the surrounding `[code]` blocks are removed so that only the HTML in between them is shown). Any Markdown content inside `[code]` blocks is completely ignored and will show up exactly as typed (e.g. `[code] # heading [/code]` will show up as "# heading", not an actual "**heading**"). Use the Preview button to see exactly how your Markdown and HTML will show up in the actual comment once Posted.

### 3. Text Replacements

You can use text replacements like `{{ticket.requester.first_name}}` to get the ticket requester's first name. To do this, type `{{` into the textarea to see all the supported text replacements.

![Replacement Demo](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Replacement%20Demo.mov?raw=true)

Some notable ones are:

- `{{ticket.requester.name.first}}` (the requester's first name)
- `{{ticket.title}}` (the ticket's title)
- `{{current_user.name.first}}` (your first name)
- `{{link.mac_address}}` (for instructions on how to find a MAC address)

Use `{{` to bring up the full menu of text replacements. This is especially helpful for inserting common links instead of looking them up yourself.

### 4. Smart Text Replacement

Some text in ServiceNow comments gets converted to smart text (shows up as underlined), which lets you hover over it for more options/information. Right now, four things are recognized and underlined for you:

1. MAC addresses: Hovering over one brings up its vendor OUI for quick look up, the option to Copy, and the ability to Search in NetDB, DHCP Log, Cisco Prime, MyDevices, and IPRequest.
2. ServiceNow ticket nubers (these include thigns like `INC#####`, `SR#####`, etc.): Hovering over one bringss up a link to search for that ticket number so you can go directly to it.
3. IP addresses: Hovering over one brings up the options to Copy, Search in NetDB, and Search in IPRequest.
4. NetDB node names in the form of `rescomp-##-######` or `sr##-######`: Hovering over one brings up the options to Copy, Search in NetDB, and Search in IPRequest.

Here they are in action:

![Smart Text Demo](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Smart%20Text%20Demo.mov?raw=true)

## Issues

I've tested the script on Chrome, Safari, and Firefox, but if you run into anything that works not-as-expected, let me know or file an issue [here](https://github.com/FiggChristian/PTS-Scripts/issues). 
