let sidebery_policy;
let sidebery_browser;
let init_sidebery_browser;
let sidebery_uri;
let sidebery_extension;


function getSideberyExtension() {
    // Fetch first extension matching the name if any
    sidebery_policy = WebExtensionPolicy.getActiveExtensions().filter((ext) => ext.name == "Sidebery")[0];
    if (sidebery_policy) {
        sidebery_extension = sidebery_policy.extension;
        sidebery_uri = sidebery_extension.manifest.sidebar_action.default_panel;

        sidebery_policy.baseCSP = "script-src 'self' https://* http://localhost:* http://127.0.0.1:* moz-extension: chrome: blob: filesystem: 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' chrome:;"

        return sidebery_policy;
    } else {
        alert("Sidebery Extension could not be found - is it installed and enabled?");
    }
}


function installScriptToEachNewWindow() {
    // https://firefox-source-docs.mozilla.org/browser/CategoryManagerIndirection.html
    Services.catMan.addCategoryEntry(
        "browser-window-delayed-startup",
        "moz-src://browser/components/tabbrowser/TabUnloader.sys.mjs",
        "TabUnloader.init",
        true,
        true
    )
}

function setupSideberyPanel(win) {
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
    sidebery_browser.setAttribute("context", "contentAreaContextMenu"); // replace with tab are context menu?
    //sidebery_browser.setAttribute("tooltip", "aHTMLTooltip"); //replace with tab area tooltip?
    sidebery_browser.setAttribute("autocompletepopup", "PopupAutoComplete");
    sidebery_browser.setAttribute("transparent", "true");
    // Ensure that the browser is going to run in the same bc group as the other
    // extension pages from the same addon.
    sidebery_browser.setAttribute("initialBrowsingContextGroupId", sidebery_policy.browsingContextGroupId);


    //make it not remote
    //sidebery_browser.setAttribute("remote", "false");

    // make it remote:
    sidebery_browser.setAttribute("remote", "true");
    sidebery_browser.setAttribute("remoteType", "extension");
    sidebery_browser.setAttribute("maychangeremoteness", "true");



    sidebery_browser.setAttribute("src", sidebery_uri); //moz-extension://975176be-3729-46a4-84fc-204e044f42d3/sidebar/sidebar.html
    sidebery_browser.setAttribute("homepage", sidebery_uri);
    //sidebery_browser.setAttribute("src", "chrome://browser/content/webext-panels.xhtml");

    //let readyPromise = promiseEvent(browser, "XULFrameLoaderCreated");

}

function insertSideberyPanel(win) {

    const oldTabsContainer = win.document.querySelector("#TabsToolbar-customization-target");
    oldTabsContainer.insertAdjacentElement('beforebegin', sidebery_browser);
    oldTabsContainer.style.display = "none";
    win.document.getElementById("zen-sidebar-bottom-buttons").style.display = "none";
    win.document.getElementById("zen-sidebar-top-buttons").style.display = "none";

}

function afterSideberyLoads() {
    sidebery_browser.messageManager.loadFrameScript(
        "chrome://extensions/content/ext-browser-content.js",
        false,
        true
    );

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

    init_sidebery_browser = () => {
        oldTabsContainer.style.display = "none";
        let { ExtensionParent } = ChromeUtils.importESModule(
            "resource://gre/modules/ExtensionParent.sys.mjs"
        );

        ExtensionParent.apiManager.emit(
            "extension-browser-inserted",
            sidebery_browser,
            null
        );

        sidebery_browser.messageManager.loadFrameScript(
            "chrome://extensions/content/ext-browser-content.js",
            false,
            true
        );

        sidebery_browser.messageManager.loadFrameScript(
            "chrome://extensions/content/ext-browser-content.js",
            false,
            true
        );

        let options = {};
        options.stylesheets = ["chrome://browser/content/zen-styles/zen-tabs/vertical-tabs.css"];
        sidebery_browser.messageManager.sendAsyncMessage("Extension:InitBrowser", options);
        console.log("Initialized Native Sidebery");


        //sidebery.contentDocument.querySelector("html").style.backgroundColor = "transparent";

    };

    //sidebery_browser.addEventListener("DidChangeBrowserRemoteness", init_sidebery_browser);
    //sidebery_browser.addEventListener("XULFrameLoaderCreated", init_sidebery_browser);
    //sidebery_browser.onload = init_sidebery_browser;
    //sidebery_browser.addEventListener("load", init_sidebery_browser);
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


function addStyles(win) {

    var css = `
        #zen-sidebar-splitter { 
            background-color: var(--zen-colors-border); /* put it back from transparent (normally 0 opacity anyway) */
            margin-left: calc(0px - var(--zen-toolbox-padding)); /* allow tabs to go under it */
        }
        #zen-sidebar-splitter:hover { opacity: 0.5 }
    `;
    var style = win.document.createElement('style');

    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    win.document.getElementsByTagName('head')[0].appendChild(style);




    // const splitter = document.getElementById("zen-sidebar-splitter");
    // splitter.style.marginLeft = "calc(0px - var(--zen-toolbox-padding))";
    // splitter.style.opacity = "var(--dynamic-splitter-opacity)";
    // splitter.style.backgroundColor = "var(--zen-colors-border)";
    // .Tab[data-active="true"] {
    // z-index: 20;
    // margin-right: -24px;
    // width: 100%;
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
        insertSideberyPanel(win);
        addStyles(win);
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


setup();