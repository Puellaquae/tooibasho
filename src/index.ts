import { combineAsyncGenerator } from "./utils";
import { join as pathJoin } from "path-browserify";
const { hasOwnProperty } = Object.prototype;

interface Archiver {
    append: (file: Buffer | string, config: { name: string, paths: string[] }) => Archiver
}

interface Plugin {
    readonly urlPattern: string[];
    readonly label: string;
    readonly description: string;

    readonly test: (url: string) => boolean;
    readonly detect: (url: string) => AsyncGenerator<ArchiveItem, void, void>;
    readonly archive: (item: ArchiveItem, archiver: Archiver) => Promise<{ entryfile: string }>;
}

interface ArchiveItem {
    type: 'file' | 'dir',
    title: string,
    catalogPath: { id: number | string, name: string }[],
    name: string,
    from: Plugin,
    auxData?: unknown
}

interface ContentTable {
    dirs: {
        [id: string]: { name: string, content: ContentTable }
    },
    items: { link: string, name: string }[]
}

async function* detect(url: string, plugins: Plugin[]): AsyncGenerator<ArchiveItem, void, void> {
    const gens = plugins
        .filter(f => f.test(url))
        .map(f => f.detect(url))
    yield* combineAsyncGenerator(...gens);
}

async function* archive(items: ArchiveItem[], archiver: Archiver, beforeArchive?: (index: number, item: ArchiveItem) => void) {
    const menu: ContentTable = { dirs: {}, items: [] };
    for (const [index, item] of items.entries()) {
        try {
            beforeArchive && beforeArchive(index, item);
            const { entryfile } = await item.from.archive(item, archiver);
            let curmenu = menu;
            for (const path of item.catalogPath) {
                curmenu.dirs[path.id] = curmenu.dirs[path.id] ?? { name: path.name, content: { dirs: {}, items: [] } };
                curmenu = curmenu.dirs[path.id].content;
            }
            curmenu.items.push({
                name: item.title,
                link: pathJoin(...item.catalogPath.map(c => c.id.toString()), entryfile)
            })
            yield { item: item, success: true };
        } catch (err) {
            yield { item: item, success: false, err: err };
        }
    }
    archiver.append(buildContentMenu(menu), { name: 'index.html', paths: [] });

    return;
}


function buildContentMenu(menu: ContentTable): string {
    function buildContent(name: string, menu: ContentTable): string {
        let html = `<details><summary>${name}</summary>`
        for (const dir in menu.dirs) {
            if (hasOwnProperty.call(menu.dirs, dir)) {
                html += buildContent(menu.dirs[dir].name, menu.dirs[dir].content);
            }
        }
        for (const item of menu.items) {
            html += `<a href='${item.link}'>${item.name}</a>`
        }
        html += "</details>";
        return html;
    }

    let html = `
    <!DOCTYPE html>
    <html lang="zh-cn">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>??????????????????</title>
        <style> a { display: block; } details>details, details>a { margin-left: 2em; } </style>
    </head>
    <body>
    `
    for (const dir in menu.dirs) {
        if (hasOwnProperty.call(menu.dirs, dir)) {
            html += buildContent(menu.dirs[dir].name, menu.dirs[dir].content);
        }
    }
    for (const item of menu.items) {
        html += `<a href='${item.link}'>${item.name}</a>`
    }
    html += "</body></html>";
    return html;
}

export { detect, archive, Archiver, Plugin, ArchiveItem }