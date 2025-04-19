
const { ExtensionUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionUtils.sys.mjs"
);

var { promiseEvent } = ExtensionUtils;

let sidebery_policy;
let sidebery_browser;
let sidebery_url;
let sidebery_extension;
let oldTabsContainer;

function getSideberyExtension() {
    // Fetch first extension matching the name if any
    sidebery_policy = WebExtensionPolicy.getActiveExtensions().filter((ext) => ext.name == "Sidebery")[0];
    if (sidebery_policy) {
        sidebery_extension = sidebery_policy.extension;
        sidebery_url = sidebery_extension.manifest.sidebar_action.default_panel;

        sidebery_policy.baseCSP = "script-src 'self' https://* http://localhost:* http://127.0.0.1:* moz-extension: chrome: blob: filesystem: 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' chrome:;"

        console.log("1. Found Sidebery extension.");
        return sidebery_policy;
    } else {
        alert("Sidebery Extension could not be found - is it installed and enabled?");
        return null;
    }
}



async function setupSideberyPanel(win) {
    // add a separate <browser> element outside of sidebar
    // https://udn.realityripple.com/docs/Archive/Mozilla/XUL/browser
    sidebery_browser = win.document.createXULElement("browser");
    sidebery_browser.setAttribute("id", "sidebery");
    sidebery_browser.setAttribute("type", "content");
    sidebery_browser.setAttribute("flex", "1");
    sidebery_browser.setAttribute("disableglobalhistory", "true");
    sidebery_browser.setAttribute("disablehistory", "true");
    sidebery_browser.setAttribute("disablesecurity", "true");
    sidebery_browser.setAttribute("messagemanagergroup", "webext-browsers");
    //sidebery_browser.setAttribute("webextension-view-type", "sidebar"); // needed?
    sidebery_browser.setAttribute("context", "tabContextMenu"); // replace with tab are context menu?
    sidebery_browser.setAttribute("tooltip", "tabbrowser-tab-tooltip"); //replace with tab area tooltip?
    sidebery_browser.setAttribute("autocompletepopup", "PopupAutoComplete");
    sidebery_browser.setAttribute("transparent", "true");
    // Ensure that the browser is going to run in the same bc group as the other
    // extension pages from the same addon.
    sidebery_browser.setAttribute("initialBrowsingContextGroupId", sidebery_policy.browsingContextGroupId);

    // make it remote - simply does not work otherwise
    sidebery_browser.setAttribute("remote", "true");
    sidebery_browser.setAttribute("remoteType", "extension"); // sidebery needs this to access windows
    //sidebery_browser.setAttribute("maychangeremoteness", "true"); // it won't

    // load dynamically instead
    //sidebery_browser.setAttribute("src", sidebery_url); //moz-extension://975176be-3729-46a4-84fc-204e044f42d3/sidebar/sidebar.html


    //only seems to work as a promiseEvent, not a normal event handler
    awaitFrameLoader = promiseEvent(browser, "XULFrameLoaderCreated");

    // time to insert, <browser> will be constructed
    oldTabsContainer = win.document.querySelector("#TabsToolbar-customization-target");
    oldTabsContainer.insertAdjacentElement('beforebegin', sidebery_browser);
    console.log("2. Sidebery's browser frame element has been set up.");
    await awaitFrameLoader;

    loadSideberyPanel(win);
}

function loadSideberyPanel(win) {
    console.log("3. Loading Sidebery into frame...");
    oldTabsContainer.style.display = "none";

    // Zen's bars are right next to Sidebery's, looks ugly with both - hide Zen's for now, buttons can be moved elsewhere
    win.document.getElementById("zen-sidebar-bottom-buttons").style.display = "none";
    win.document.getElementById("zen-sidebar-top-buttons").style.display = "none";

    // System Principal should let Sidebery do anything chrome can do, so it's legit native
    let triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
    sidebery_browser.loadURI(Services.io.newURI(sidebery_url), { triggeringPrincipal });
    // sidebery_browser.addEventListener("load", afterSideberyLoads, true);

    const css = `
    #zen-sidebar-splitter { 
        background-color: var(--zen-colors-border); /* put it back from transparent (normally 0 opacity anyway) */
        margin-left: calc(0px - var(--zen-toolbox-padding)); /* allow tabs to go under it */
    }
    #zen-sidebar-splitter:hover { opacity: 0.5 }
    *[draggable="true"], .browser-toolbar {
        -moz-window-dragging: no-drag;
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
    // see if this is needed for dynamic updates
    const rootStyle = getComputedStyle(window.document.getElementById("tabbrowser-tabs"));
    let css = '';
    for (const property of rootStyle) {
        if (property.startsWith("--zen-")) {
            css += `${property}: ${rootStyle.getPropertyValue(property).trim()};\n`;
        }
    }
    return `:root {\n${css}\n}`;
}

const fixTextSelectable = // fixes bug #1
    `
    #root.root {
        user-select: none; 
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
        --general-border-radius: var(--zen-border-radius);
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
html {
    border: 4px solid red;
}
`
const fixWidthRoundingUp = // Zen's sidebar tends to have non-integer width (like 356.667), but the sidebery frame's width is a rounded version, causing it to be cut off by a fraction of a pixel
    `
:root {
    box-sizing: border-box;
}
html {
    border: 4px solid red;
}
`


const zenStylesByDefault = // fixes bug #4
    `
    #root.root {
        --general-border-radius: var(--zen-border-radius);
    }
`



allStyleMods = [fixTextSelectable, fixNoGrabbingCursorOnDrag, transparentByDefault, fixInheritBadBrowserStyles, zenStylesByDefault]

function afterSideberyLoads(win) {
    console.log("5. Sidebery has loaded! Inserting scripts and styles.");
    sidebery_browser.messageManager.loadFrameScript(
        "chrome://extensions/content/ext-browser-content.js",
        false,
        true
    );
    let { ExtensionParent } = ChromeUtils.importESModule(
        "resource://gre/modules/ExtensionParent.sys.mjs"
    );

    ExtensionParent.apiManager.emit(
        "extension-browser-inserted",
        sidebery_browser
    );

    const zenStylesheets = [...win.document.styleSheets].map((styleSheet) => { return styleSheet.href; })
    const allStyleModsAsDataURLs = allStyleMods.map((css) => `data:text/css,${encodeURIComponent(css)}`);

    let stylesheets = [...zenStylesheets, "chrome://browser/content/extension.css", ...allStyleModsAsDataURLs].filter(sheet => sheet); //discard nulls
    console.log(stylesheets);
    sidebery_browser.messageManager.sendAsyncMessage("Extension:InitBrowser", { stylesheets });



    // const splitter = document.getElementById("zen-sidebar-splitter");
    // splitter.style.marginLeft = "calc(0px - var(--zen-toolbox-padding))";
    // splitter.style.opacity = "var(--dynamic-splitter-opacity)";
    // splitter.style.backgroundColor = "var(--zen-colors-border)";
    // .Tab[data-active="true"] {
    // z-index: 20;
    // margin-right: -24px;
    // width: 100%;


    //keep inner browser zoom in sync with outer - TODO test 
    sidebery_browser.addEventListener(
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

    sidebery_browser.addEventListener(
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
    sidebery_browser.addEventListener("DOMWindowClose", event => { event.stopPropagation(); });


    console.log("6. Sidebery mod complete.");
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
    if (getSideberyExtension()) {
        installInWindow(win);
    } else {
        sideberyMissing();
    }

}

function installInWindow(win) {
    if (sidebery_policy) {
        setupSideberyPanel(win);
    } else {
        sideberyMissing();
    }

}


windowListener = {
    onOpenWindow(xulWindow) {
        const win = xulWindow.docShell.domWindow;
        win.addEventListener(
            "load",
            function () {
                if (
                    win.document.documentElement.getAttribute("id") != "main-window"
                ) {
                    return;
                }
                // Found the window
                //Services.wm.removeListener(windowListener);
                //alert("Found new window");
                setup(win);
            },
            { once: false }
        );
    },
    onCloseWindow() { },
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