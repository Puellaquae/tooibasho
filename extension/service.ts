import browser from 'webextension-polyfill';
import { CONTEXT_MENU_ID_LINK, CONTEXT_MENU_ID_PAGE, initSetting } from './global';

browser.runtime.onInstalled.addListener(async () => {
    await initSetting();
});

browser.contextMenus.onClicked.addListener(async (info) => {
    await awakeOptionPage();
    if (info.menuItemId === CONTEXT_MENU_ID_PAGE && info.pageUrl) {
        sendUrl(info.pageUrl);
    }
    else if (info.menuItemId === CONTEXT_MENU_ID_LINK && info.linkUrl) {
        sendUrl(info.linkUrl);
    }
});

async function awakeOptionPage() {
    try {
        !await browser.runtime.sendMessage({ message: 'awake' })
        return;
    } catch (err) {
        console.log('Option Page Not Opened');
        await browser.runtime.openOptionsPage();
    }
    for (; ;) {
        try {
            await browser.runtime.sendMessage({ message: 'awake' });
            return;
        } catch (err) {
            console.log('Wait for Option Page Open');
        }
    }
}

function sendUrl(url: string) {
    browser.runtime.sendMessage({ message: 'url', url: url }).catch(() => {
        sendUrl(url);
    })
}
