
const { ExtensionUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionUtils.sys.mjs"
);

var { promiseEvent } = ExtensionUtils;

let sidebery_policy;
let sidebery_url;
let sidebery_extension;


// Fetch first extension matching the name if any
sidebery_policy = WebExtensionPolicy.getActiveExtensions().filter((ext) => ext.name == "Sidebery")[0];
if (sidebery_policy) {
    sidebery_extension = sidebery_policy.extension;
    sidebery_url = sidebery_extension.manifest.sidebar_action.default_panel;

    sidebery_policy.baseCSP = "script-src 'self' https://* http://localhost:* http://127.0.0.1:* moz-extension: chrome: blob: filesystem: 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' chrome:;"

    console.log("1. Found Sidebery extension.");
}



async function setupSideberyPanel(win) {
    // add a separate <browser> element outside of sidebar
    // https://udn.realityripple.com/docs/Archive/Mozilla/XUL/browser
    win.sidebery_browser = win.document.createXULElement("browser");
    win.sidebery_browser.setAttribute("id", "sidebery");
    win.sidebery_browser.setAttribute("type", "content"); // try content-primary for direct access?
    win.sidebery_browser.setAttribute("flex", "1");
    win.sidebery_browser.setAttribute("disableglobalhistory", "true");
    win.sidebery_browser.setAttribute("disablehistory", "true");
    win.sidebery_browser.setAttribute("disablesecurity", "true");
    win.sidebery_browser.setAttribute("messagemanagergroup", "webext-browsers");
    //win.sidebery_browser.setAttribute("webextension-view-type", "sidebar"); // needed?
    win.sidebery_browser.setAttribute("context", "tabContextMenu"); // replace with tab are context menu?
    win.sidebery_browser.setAttribute("tooltip", "tabbrowser-tab-tooltip"); //replace with tab area tooltip?
    win.sidebery_browser.setAttribute("autocompletepopup", "PopupAutoComplete");
    win.sidebery_browser.setAttribute("transparent", "true");
    // Ensure that the browser is going to run in the same bc group as the other
    // extension pages from the same addon.
    win.sidebery_browser.setAttribute("initialBrowsingContextGroupId", sidebery_policy.browsingContextGroupId);

    // make it remote - simply does not work otherwise
    win.sidebery_browser.setAttribute("remote", "true");
    win.sidebery_browser.setAttribute("remoteType", "extension"); // sidebery needs this to access windows
    //win.sidebery_browser.setAttribute("maychangeremoteness", "true"); // it won't

    // load dynamically instead
    //win.sidebery_browser.setAttribute("src", sidebery_url); //moz-extension://975176be-3729-46a4-84fc-204e044f42d3/sidebar/sidebar.html


    //only seems to work as a promiseEvent, not a normal event handler
    awaitFrameLoader = promiseEvent(win.sidebery_browser, "XULFrameLoaderCreated");

    // time to insert, <browser> will be constructed
    oldTabsContainer = win.document.querySelector("#TabsToolbar-customization-target");
    oldTabsContainer.insertAdjacentElement('afterend', win.sidebery_browser);
    console.log("2. Sidebery's browser frame element has been set up.");
    await awaitFrameLoader;
    //oldTabsContainer.style.display = "none";
    loadSideberyPanel(win);
}

function loadSideberyPanel(win) {
    console.log("3. Loading Sidebery into frame...");



    // System Principal should let Sidebery do anything chrome can do, so it's legit native
    let triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
    win.sidebery_browser.loadURI(Services.io.newURI(sidebery_url), { triggeringPrincipal });
    // win.sidebery_browser.addEventListener("load", afterSideberyLoads, true);

    const css = `
    #zen-sidebar-splitter { 
        background-color: var(--zen-colors-border); /* put it back from transparent (normally 0 opacity anyway) */
        margin-left: calc(0px - var(--zen-toolbox-padding)); /* allow tabs to go under it */
    }
    #zen-sidebar-splitter:hover { opacity: 0.5 }
    *[draggable="true"], .browser-toolbar {
        -moz-window-dragging: no-drag;
    }

    #navigator-toolbox:not([zen-sidebar-expanded="true"]) {
        & #titlebar {
            display: revert; /* was grid for compact mode */
        }
    }

    :root {
    --zen-workspace-indicator-height: 40px; /* Enable side by side comparison of tabs */
    }
    `;

    var style = win.document.createElement('style');

    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    win.document.getElementsByTagName('head')[0].appendChild(style);
    console.log("4. Ready for Sidebery to load.");
    afterSideberyLoads(win);
}


function getZenCSSVariables() {
    // TODO see if this is needed for dynamic updates
    const rootStyle = getComputedStyle(window.document.getElementById("tabbrowser-tabs"));
    let css = '';
    for (const property of rootStyle) {
        if (property.startsWith("--")) {
            css += `${property}: ${rootStyle.getPropertyValue(property).trim()};\n`;
        }
    }
    return `:root {\n${css}\n}`;
}

const adaptiveColorIntegration =
    `
#nav-bar, #urlbar-background, #zen-sidebar-web-panel {
    background-color:  var(--lwt-accent-color) !important;
}

panel {
    --panel-background: var(--lwt-accent-color) !important;
}

#browser {
        background-image: none !important;
        background-color:  var(--lwt-accent-color) !important;
        opacity: 1 !important;
}

:root:not([inDOMFullscreen="true"]):not([chromehidden~="location"]):not([chromehidden~="toolbar"]) {
    & #tabbrowser-tabbox #tabbrowser-tabpanels .browserSidebarContainer {
      box-shadow: 0 0 1px 1px light-dark(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)) !important;
    }
  }

#zen-sidebar-web-panel {
    border: none !important;
    box-shadow: 0 0 1px 1px light-dark(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)) !important;
}

#zen-sidebar-web-header, #zen-sidebar-panels-wrapper {
    border-bottom: 0 !important;
    border-top: 0 !important;
}

@media (-moz-bool-pref: "zen.view.compact") {
    :root:not([customizing]):not([inDOMFullscreen="true"]) {
      @media (-moz-bool-pref: "zen.view.compact.hide-tabbar") {
        & #titlebar {
          background: var(--lwt-accent-color) !important;
        }
      }
    }
}

#titlebar {
  background: var(--lwt-accent-color) !important;
}
`


const fixNoGrabbingCursorOnDrag = // attempt to fix bug #3
    `
    #root.root[data-drag="true"], #root.root[data-drag="true"] .AnimatedTabList *, #root.root[data-drag="true"] .Tab, #root.root[data-drag="true"] .drag_image, #root.root[data-drag="true"] .pointer {
        cursor: grabbing !important;
    }
`

const transparentByDefault = //fixes bug #2
    `
    :root {background-color: transparent;}
    #root.root {
        --frame-bg: transparent;
        --toolbar-bg: transparent;
    }
`

const fixInheritBadBrowserStyles = // some zen/ff styles make things worse, put it back
    `
    :root {
        &:not([chromehidden~="toolbar"]) {
            min-width: revert !important; /* was 450px in chrome://browser/skin/browser-shared.css -- too wide */
            min-height: revert; /* was 120px in chrome://browser/skin/browser-shared.css  -- let sidebery decide */
        }
    }

    @media not (forced-colors) {
        .close-icon:hover {
            background-color: revert;
        }
    }

    .close-icon {
        border-radius: revert;
        padding: revert;
        width: revert;
        height: revert;
        outline: revert;
    }
`


const handleCompactMode = //collapsed toolbar goes down to 48px - hide nesting
    `
@media screen and (max-width: 50px) {
    .Tab[data-lvl] {
        padding-left: 0;
    }

    .NavigationBar .static-btns {
        flex-direction: column;
    }

    .NavigationBar .main-items {
        display: none;
    }

    .BottomBar {
        display:none;
    }

}

`


// const fixWidthRoundingUp = // Zen's sidebar tends to have non-integer width (like 356.667), but the sidebery frame's width is a rounded version, causing it to be cut off by a fraction of a pixel
//     `
// html {
//     border: 4px solid red;
// }
// `


const zenStylesByDefault = // fixes bug #4
    `
    #root {
    --general-border-radius: var(--zen-border-radius);
	--s-frame-bg: var(--zen-themed-toolbar-bg-transparent);
	--s-frame-fg: inherit;
	--s-toolbar-bg: var(--zen-themed-toolbar-bg);
	--s-toolbar-fg: inherit;
	--s-act-el-bg: rgba(106,106,120,0.7);
	--s-act-el-fg: rgb(255,255,255);
	--s-popup-bg: var(--arrowpanel-background);
	--s-popup-fg: var(--arrowpanel-color);
	--s-popup-border: var(--zen-colors-border);
    --nav-btn-fg: var(--toolbarbutton-icon-fill);

    --nav-btn-width: calc(2 * var(--toolbarbutton-inner-padding) + 16px);
    --nav-btn-height: calc(2 * var(--toolbarbutton-inner-padding) + 16px);
    --nav-btn-border-radius: var(--toolbarbutton-border-radius);
    --tabs-activated-bg: var(--tab-selected-bgcolor);
    --tabs-activated-shadow: var(--tab-selected-shadow);
    --tabs-activated-fg: var(--tab-selected-textcolor);
    --tabs-border-radius: var(--border-radius-medium);
    --tab-hover-background-color: var(--active-el-overlay-hover-bg);
    --tabs-font: message-box;
    --tabs-height: var(--tab-min-height);
    --tabs-margin: calc(var(--tab-block-margin) * 2);


    }
    .SubPanel {
    	--s-frame-bg: var(--zen-themed-toolbar-bg-transparent);
	    --s-frame-fg: inherit;
    }
    body {
        color: var(--toolbox-textcolor);
        &:-moz-window-inactive {
            color: var(--toolbox-textcolor-inactive);
        }
    }
    .fav-icon {
        border-radius: 4px;
    }
        padding: 0 var(--tab-inline-padding);

    .Tab {

    }

}
`


allStyleMods = [getZenCSSVariables(), fixNoGrabbingCursorOnDrag, transparentByDefault, fixInheritBadBrowserStyles, zenStylesByDefault, handleCompactMode]

function afterSideberyLoads(win) {
    console.log("5. Sidebery has loaded! Inserting scripts and styles.");
    win.sidebery_browser.messageManager.loadFrameScript(
        "chrome://extensions/content/ext-browser-content.js",
        false,
        true
    );
    let { ExtensionParent } = ChromeUtils.importESModule(
        "resource://gre/modules/ExtensionParent.sys.mjs"
    );

    ExtensionParent.apiManager.emit(
        "extension-browser-inserted",
        win.sidebery_browser
    );

    const zenStylesheets = [...win.document.styleSheets].map((styleSheet) => { return styleSheet.href; });
    const allStyleModsAsDataURLs = allStyleMods.map((css) => `data:text/css,${encodeURIComponent(css)}`);

    let stylesheets = [...zenStylesheets, "chrome://browser/content/extension.css", ...allStyleModsAsDataURLs].filter(sheet => sheet); //discard nulls
    console.log(stylesheets);
    win.sidebery_browser.messageManager.sendAsyncMessage("Extension:InitBrowser", { stylesheets });


    //keep inner browser zoom in sync with outer - TODO test 
    win.sidebery_browser.addEventListener(
        "DoZoomEnlargeBy10",
        () => {
            let { ZoomManager } = browser.ownerGlobal;
            let zoom = browser.fullZoom;
            zoom += 0.1;
            if (zoom > ZoomManager.MAX) {
                zoom = ZoomManager.MAX;
            }
            browser.fullZoom = zoom;
            console.log("Zen-Sidebery-Mod: zooming in");
        }, true
    );

    win.sidebery_browser.addEventListener(
        "DoZoomReduceBy10",
        () => {
            let { ZoomManager } = browser.ownerGlobal;
            let zoom = browser.fullZoom;
            zoom -= 0.1;
            if (zoom < ZoomManager.MIN) {
                zoom = ZoomManager.MIN;
            }
            browser.fullZoom = zoom;
            console.log("Zen-Sidebery-Mod: zooming out");
        }, true
    );

    // ignore window close command
    win.sidebery_browser.addEventListener("DOMWindowClose", event => { event.stopPropagation(); });
    alert("Sidebery Mod Complete");
    console.log("6. Sidebery mod complete. Hiding original Zen Tabs...");
    oldTabsContainer = win.document.querySelector("#TabsToolbar-customization-target");
    // Zen's bars are right next to Sidebery's, looks ugly with both - hide Zen's for now, buttons can be moved elsewhere
    //win.document.getElementById("zen-sidebar-bottom-buttons").style.display = "none";
    win.document.getElementById("zen-sidebar-top-buttons").style.display = "none";
    oldTabsContainer.style.display = "none";
}

function sideberyMissing(win) {
    let spotlight = {
        "weight": 100,
        "id": "get_sidebery_promo",
        // "groups": [
        //   "panel-test-provider"
        // ],
        "template": "spotlight",
        "content": {
            "template": "multistage",
            "backdrop": "transparent",
            "screens": [
                {
                    "id": "UPGRADE_PIN_FIREFOX",
                    "content": {
                        "logo": {
                            "imageURL": "https://raw.githubusercontent.com/mbnuqw/sidebery/v5/docs/assets/readme-logo.svg",
                            "height": "73px"
                        },
                        "has_noodles": true,
                        "title": {
                            "fontSize": "36px",
                            "raw": "Ready for Sidebery"
                        },
                        "title_style": "fancy shine",
                        "background": "url('chrome://activity-stream/content/data/content/assets/confetti.svg') top / 100% no-repeat var(--in-content-page-background)",
                        "subtitle": {
                            "raw": "You need to have the Sidebery addon installed and activated for Zen integration."
                        },
                        "primary_button": {
                            "label": {
                                "raw": "Get the addon"
                            },
                            "action": {
                                "data": {
                                    "args": "https://addons.mozilla.org/en-US/firefox/addon/sidebery/",
                                    // "where": "tabshifted"
                                },
                                "type": "OPEN_URL",
                                "navigate": true
                            }
                        },
                        "secondary_button": {
                            "label": {
                                "string_id": "onboarding-not-now-button-label"
                            },
                            "action": {
                                "navigate": true
                            }
                        }
                    }
                }
            ]
        },
        "trigger": {
            "id": "defaultBrowserCheck"
        },
        "targeting": "false",
        // "provider": "panel_local_testing"
    };
    ASRouter.routeCFRMessage(spotlight, win, spotlight.trigger, true);
}

function setup(win = window) {
    if (sidebery_policy) {
        setupSideberyPanel(win);
    } else {
        sideberyMissing();
    }
}

// apply to new windows
// windowListener = {
//     onOpenWindow(xulWindow) {
//         const win = xulWindow.docShell.domWindow;
//         win.addEventListener(
//             "load",
//             function () {
//                 if (
//                     win.document.documentElement.getAttribute("id") != "main-window"
//                 ) {
//                     return;
//                 }
//                 // Found the window
//                 setupSideberyPanel(win);
//             },
//             { once: false }
//         );
//     },
//     onCloseWindow() { },
// };
// Services.wm.addListener(windowListener);


var { Cc: classes, Ci: interfaces } = Components;
var windowListener = {
    onOpenWindow: function (aWindow) {
        // Wait for the window to finish loading
        let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        console.log("new Window detected. Waiting for it to load...");
        console.log(domWindow);
        domWindow.addEventListener("load", function () {
            if (domWindow.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
                domWindow.removeEventListener("load", arguments.callee, false); //this removes this load function from the window
                console.log("New navigator Window loaded! Injecting sidebery.");
                console.log(domWindow);
                setupSideberyPanel(domWindow);
            } else {
                console.log("It's not a navigator window. Not injecting Sidebery.")
            }
        }, false);


    },
    onCloseWindow: function (aWindow) { },
    onWindowTitleChange: function (aWindow, aTitle) { }
};
Services.wm.addListener(windowListener);


// TODO
// function installScriptToEachNewWindow() {
//     // https://firefox-source-docs.mozilla.org/browser/CategoryManagerIndirection.html
// Services.catMan.addCategoryEntry(
//     "browser-window-delayed-startup",
//     "https://raw.githubusercontent.com/Erudition/zen-sidebery-mod/refs/heads/main/zen-sidebery-integration.mjs",
//     "TabUnloader.init",
//     true,
//     true
// )
// }


setup();