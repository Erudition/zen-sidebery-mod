# zen-sidebery-mod (Alpha)
Integrate the amazing [Sidebery](https://addons.mozilla.org/en-US/firefox/addon/sidebery/?utm_source=activity-stream&utm_campaign=firstrun&utm_medium=referral&utm_term=aboutwelcome-default-screen) with [Zen browser](https://zen-browser.app/).

Despite the name "Zen Mods", they can't modify the browser chrome, only theme it - at least not yet. The kind of integration offered in this mod is more than a Theme, so there isn't yet a way to install it - only to try it.

# Try It
Press `Ctrl+Shift+J` to open the Browser Console.
(Alternatively, click `Menu -> More Tools -> Browser Console`.)

Then paste the following snippet:
```js
fetch("https://raw.githubusercontent.com/Erudition/zen-sidebery-mod/refs/heads/main/zen-sidebery-integration.mjs").then((response) => response.text().then((code) => eval(code)));
```

See what this does [here](https://github.com/Erudition/zen-sidebery-mod/blob/main/zen-sidebery-integration.mjs).

The effect only lasts until the end of your browsing session. However, you could put the code in your `userChrome.js`, detailed elsewhere.

# Alpha
Please report any issues. If you love it, give this repo a star!

# Sidebery setup
- For now, make sure "Use Native Context Menu" is unchecked.
- Remove all but the Default Workspace in Zen - else you can still toggle them with mousewheel tilts and shortcuts accidentally. Sidebery's workspaces (panels) are superior.
- Before applying, use Zen's "Customize Toolbar" to move any buttons you've placed in the left panel (top or bottom) somewhere else in the chrome. Sidebery has it's own top and bottom bar, which can't be moved elsewhere, and having double bars does not look very Zen.
