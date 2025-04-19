const { InfoBar } = ChromeUtils.importESModule("resource:///modules/asrouter/InfoBar.sys.mjs");
const { FeatureCalloutBroker } = ChromeUtils.importESModule("resource:///modules/asrouter/FeatureCalloutBroker.sys.mjs");

let notif = InfoBar.showInfoBarMessage(window, bar, ASRouter.dispatchCFRAction);


ASRouter.routeCFRMessage(spotlight, window, spotlight.trigger, true)

const bar = {
    "content": {
        "text": "Success!",
        "type": "global",

        "buttons": [
            {
                "label": "Okay",
                "action": {
                    "type": "ACCEPT_DOH"
                },
                "primary": true
            },
            {
                "label": "Disable",
                "action": {
                    "type": "DISABLE_DOH"
                }
            }
        ],
        "priority": 1,
        "bucket_id": "TEST_DOH_BUCKET"
    },
    "trigger": {
        "id": "openURL",
        "patterns": [
            "*://*/*"
        ]
    },
    "template": "infobar",
    "frequency": {
        "lifetime": 3
    },
    "targeting": "firefoxVersion >= 89",
    "id": "Test_Infobar"
};

const callout = {
    "weight": 100,
    "id": "wxyz",
    "template": "feature_callout",
    "groups": [
        "cfr"
    ],
    "content": {
        "id": "CLOSE_TAB_GROUP_TEST_CALLOUT",
        "template": "multistage",
        "backdrop": "transparent",
        "transitions": false,
        "screens": [
            {
                "id": "CLOSE_TAB_GROUP_TEST_CALLOUT",
                "anchors": [
                    {
                        "selector": "#TabsToolbar",
                        "panel_position": {
                            "anchor_attachment": "topright",
                            "callout_attachment": "topleft",
                            "panel_position_string": "topright topleft"
                        }
                    }
                ],
                "content": {
                    "position": "callout",
                    "padding": 16,
                    "width": "330px",
                    "title_logo": {
                        "imageURL": "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                        "width": "24px",
                        "height": "24px",
                        "marginInline": "0 16px",
                        "alignment": "top"
                    },
                    "title": {
                        "raw": "If you close a tab group, you can reopen it here anytime."
                    },
                    "primary_button": {
                        "label": {
                            "raw": "Got it"
                        },
                        "action": {
                            "dismiss": true
                        }
                    }
                }
            }
        ]
    },
    "targeting": "providerCohorts.panel_local_testing == \"SHOW_TEST\"",
    "trigger": {
        "id": "openURL",
        "patterns": [
            "*://*/*"
        ]
    },
    "frequency": {
        "lifetime": 100
    }
};

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