chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        "id": "add",
        "title": "加入存档队列"
    });
    console.log("Context Menu Created!");
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.runtime.openOptionsPage(() => {
        sendUrl(tab!.url!);
    });
});

function sendUrl(url: string) {
    chrome.runtime.sendMessage({ url: url }, (res) => {
        if (!res) {
            sendUrl(url);
        }
    })
}
