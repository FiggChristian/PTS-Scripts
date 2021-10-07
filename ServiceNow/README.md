# ServiceNow Improvements

This browser extension (more specifically, a script that *runs* on a browser extension) adds three main things to ServiceNow to ease the transition from Zendesk.

## What It Does

### 1. Markdown Support

Zendesk allowed Markdown to be used in its text boxes so that we could *emphasize*, **embolden**, ~~delete~~ text, etc. but ServiceNow seems to only allow typing regular text. Even typing a link won't be recognized and will stay as a boring, old, un-clickable link.

![An un-clickable link](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/An%20Un-clickable%20Link.gif?raw=true)

With this script, you can use Markdown in your ServiceNow comments to do all of the above and more:

![Markdown Preview](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Markdown%20Preview.mov?raw=true)

Use the Preview button (as shown next to the Post button in the video above) to see what your comment will actually look like before posting. When you choose to Post, the comment will automatically be turned into pretty Markdown and posted to the feed as normal.

Most features of Markdown are included, including:

1. ` ``` blocks of code ``` `
2. `> block quotes`
3. `# headings`
4. horizontal line breaks (`---` on its own line)
5. numbered and bulleted lists (optionally with `[X]` or `[ ]` to make checkboxes for each list item)
6. tables ([link to how to make those](https://www.markdownguide.org/extended-syntax/#tables))
7. `**bold**` and `*italicized*` text
8. `~~deleted text~~`
7. <code>\`inline code\`</code>
8. `[links](https://google.com)`
9. `![images](https://google.com/favicon.ico)`

HTML tags like `<code> ... </code>` or `<strong> ... </strong>` are **not** supported by default since you can do almost everything with plain Markdown, but you still *can* use HTML if you want by including it in `[code] ... [/code]` blocks, like `[code]<em>emphasized text</em>[/code]` (the surrounding `[code]` blocks are removed so that only the HTML in between them is shown). Any Markdown content inside `[code]` blocks is completely ignored and will show up exactly as typed (e.g. `[code] # heading [/code]` will show up as "# heading", not an actual "**heading**"). Use the Preview button to see exactly how your Markdown and HTML will show up in the actual comment once Posted.

### 2. Macros

Another useful feature Zendesk had was the ability to use macros to reply to tickets with common problems. You can do that here as well:

![Macro Demo](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Macro%20Demo.gif?raw=true)

At the moment, there's no way to add your own macros without editing the code directly (which if you've ever coded before, shouldn't be much of a problem; there are instructions in the comments). Or you can just tell me in Slack to add another one that'll be public for everyone.

### 3. Text Replacements

Zendesk allowed some placeholder values, like `{{ticket.requester.first_name}}` to get the ticket requester's first name. This is also supported here by typing in the `{{` into the ServiceNow text box to see all the replacements:

![Replacement Demo](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Replacement%20Demo.mov?raw=true)

Some notable ones are:

- `{{ticket.requester.name.first}}` (or `{{ticket.requester.first_name}}`; both work)
- `{{ticket.title}}` (self-explanatory)
- `{{current_user.name.first}}` (or `{{current_user.first_name}}`; your first name)
- `{{link.mac_address}}` (for instructions on how to find a MAC address)
- `{{link.mdm}}` (for instructions on how to install MDM)
- `{{link.swde}}` (for instructions on how to install SWDE)
- A few others you can look at by exploring the menu when you type `{{`

This is most useful for small shortcuts, like phrases you use a lot or links that you don't want to look up every time you want to use them. Same as for macros: there's no built-in way to add your own, but editing the code is self-explanatory if you look at the comments.

### 4. Smart Text Replacement

Zendesk doesn't have this built in, but I think it's helpful enough to add since we deal with MAC addresses and IP addresses enough. Some text in ServiceNow comments gets converted to smart text (shows up as underlined), which lets you hover over it for more options/information. Right now, three different things are recognized and converted to smart text:

1. NetDB node names in the form of `rescomp-##-######` or `sr##-##########`. Hovering over one brings up the options to Copy, and search in NetDB and IPRequest.
2. IP addresses. Hovering over one brings up the same options: Copy, Search in NetDB, and Search in IPRequest.
3. MAC addresses (the most important one). Hovering over one brings up its vendor OUI for quick look up, the option to Copy, and the ability to Search in NetDB, DHCP Log, MyDevices, and IPRequest.

Here are all three in action:

![Smart Text Demo](https://github.com/FiggChristian/PTS-Scripts/blob/main/.github/assets/Smart%20Text%20Demo.mov?raw=true)

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

## Issues

The script only work for INC (incident) and SR (support request) tickets on ServiceNow at the moment, just because the TASK tickets have a completely different UI for whatever reason and it makes it not work on those kinds of tickets.

I've tested the script on Chrome, Safari, and Firefox, but if you run into anything that works not-as-expected, let me know or file an issue [here](https://github.com/FiggChristian/PTS-Scripts/issues). 
