import { TooiBasho, ArchiveItem } from '../src/index'
import { ZipArchiver } from '../src/archiver/zip';
import { BilibiliZhuanlan } from '../src/bilibili/zhuanlan';
import { pathJoin } from '../src/utils';

let tooibasho = new TooiBasho();
tooibasho.addPlugin(new BilibiliZhuanlan());
let archiver = new ZipArchiver();
let items: { archiveItem: ArchiveItem, domItem: HTMLElement }[] = [];
const url_list = document.getElementById("url-list")!;

function buildButton(item: ArchiveItem) {
    let btn = document.createElement('button');
    btn.appendChild(document.createTextNode('移除'));
    btn.addEventListener("click", () => {
        items.forEach(i => {
            if (i.archiveItem === item) {
                url_list.removeChild(i.domItem);
            }
        })
        items = items.filter(i => i.archiveItem !== item);
    });
    return btn;
}

chrome.runtime.onMessage.addListener(async (message, sender, sendReq) => {
    sendReq({});
    const url = message.url as string;
    const new_items = await tooibasho.detect(url);
    for (const item of new_items) {
        let li = document.createElement('li');
        li.appendChild(document.createTextNode(pathJoin(...item.catalogPath.map(c => c.name), item.title)));
        li.appendChild(buildButton(item));
        items.push({ archiveItem: item, domItem: li });
        url_list.appendChild(li);
    }
});

document.getElementById('archive')!.onclick = async () => {
    let gen = tooibasho.archive(items.map(i => i.archiveItem), archiver);
    for await (const i of gen) {
        items.forEach(item => {
            if (item.archiveItem === i.item) {
                if (i.success) {
                    item.domItem.innerText += " Finish";
                    item.domItem.style.color = 'green';
                } else {
                    item.domItem.innerText += ` Fail ${i.err}`;
                    item.domItem.style.color = 'red';
                }
            }
        })
    }
    await archiver.package();
};