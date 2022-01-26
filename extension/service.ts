import browser from 'webextension-polyfill';
import { ExtensionContextMenuForPageID, ExtensionContextMenuForLinkID, plugins } from './global';

browser.runtime.onInstalled.addListener(() => {
    const urlPattern: string[] = [];
    plugins.forEach(p => urlPattern.push(...p.urlPattern));
    browser.contextMenus.create({
        id: ExtensionContextMenuForPageID,
        title: "将当前页面地址加入存档队列",
        contexts: ["page"],
        documentUrlPatterns: urlPattern
    });
    browser.contextMenus.create({
        id: ExtensionContextMenuForLinkID,
        title: "将链接地址加入存档队列",
        contexts: ["link"],
        targetUrlPatterns: urlPattern
    });
});

browser.contextMenus.onClicked.addListener(async (info) => {
    await awakeOptionPage();
    if (info.menuItemId === ExtensionContextMenuForPageID && info.pageUrl) {
        sendUrl(info.pageUrl);
    }
    else if (info.menuItemId === ExtensionContextMenuForLinkID && info.linkUrl) {
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
