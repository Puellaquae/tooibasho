import { TooiBasho, ArchiveItem } from '../src/index'
import { ZipArchiver } from '../src/archiver/zip';
import BilibiliZhuanlan from '../src/bilibili/zhuanlan';
import { pathJoin } from '../src/utils';
import browser from 'webextension-polyfill';
import { Message } from './types';

const tooibasho = new TooiBasho();
tooibasho.addPlugin(new BilibiliZhuanlan());
const archiver = new ZipArchiver();
let items: { archiveItem: ArchiveItem, domItem: HTMLElement }[] = [];
const url_list = document.getElementById("url-list")!;
const btn = document.getElementById('archive')!;
const spin = document.getElementById('spin')!;

function buildButton(item: ArchiveItem) {
    const b = document.createElement('button');
    b.appendChild(document.createTextNode('移除'));
    b.addEventListener("click", () => {
        items.forEach(i => {
            if (i.archiveItem === item) {
                url_list.removeChild(i.domItem);
            }
        })
        items = items.filter(i => i.archiveItem !== item);
    });
    return b;
}

browser.runtime.onMessage.addListener(async (message: Message) => {
    console.log(`Received ${message.message} Message`);
    if (message.message === 'awake') {
        return {};
    } else if (message.message === 'url') {
        newUrl(message.url);
        return {};
    }
});

async function newUrl(url: string) {
    document.title = spin.innerText = `解析 ${url} 中`;
    const items_gen = tooibasho.detect(url);
    let count = 0;
    for await (const item of items_gen) {
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(pathJoin(...item.catalogPath.map(c => c.name), item.title)));
        li.appendChild(buildButton(item));
        items.push({ archiveItem: item, domItem: li });
        url_list.appendChild(li);
        count++;
    }
    document.title = `新增${count}篇`;
    setTimeout(() => {
        document.title = 'TooiBasho'
    }, 2000)
    spin.innerText = '';
}

btn.onclick = async () => {
    btn.setAttribute('disable', 'true');
    btn.innerText = '打包中';
    const gen = tooibasho.archive(items.map(i => i.archiveItem), archiver);
    for await (const i of gen) {
        items.forEach(item => {
            if (item.archiveItem === i.item) {
                if (i.success) {
                    item.domItem.className = 'finish';
                } else {
                    item.domItem.className = 'fail';
                    item.domItem.setAttribute('failerr', i.err as string);
                }
            }
        })
    }
    await archiver.package();
    btn.innerText = '打包已完成';
};