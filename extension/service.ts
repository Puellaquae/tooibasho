import browser from 'webextension-polyfill';
import { Message } from './types';

browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        "id": "add",
        "title": "加入存档队列"
    });
});

browser.contextMenus.onClicked.addListener(async (_info, tab) => {
    await awakeOptionPage();
    sendUrl(tab!.url!);
});

async function awakeOptionPage() {
    try {
        !await browser.runtime.sendMessage({ message: 'awake' })
        return;
    } catch (err) {
        console.log('Option Page Not Opened');
        await browser.runtime.openOptionsPage();
    }
    while (true) {
        try {
            await browser.runtime.sendMessage({ message: 'awake' });
            return;
        } catch (err) {
            console.log('Wait for Option Page Open');
        }
    }
}

function sendUrl(url: string) {
    browser.runtime.sendMessage({ message: 'url', url: url }).catch(_err => {
        sendUrl(url);
    })
}
