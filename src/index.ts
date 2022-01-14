import { combineAsyncGenerator, pathJoin } from "./utils";
const { hasOwnProperty } = Object.prototype;

interface Archiver {
    append: (file: Buffer | string, config: { name: string, paths: string[] }) => Archiver
}

interface Plugin {
    urlFilter: RegExp[],
    detect: (url: string) => AsyncGenerator<ArchiveItem, void, void>,
    archive: (item: ArchiveItem, archiver: Archiver) => Promise<{ entryfile: string }>
}

interface ArchiveItem {
    type: 'file' | 'dir',
    title: string,
    catalogPath: { id: number | string, name: string }[],
    name: string,
    from: Plugin,
    auxData: object | null
}

interface ContentTable {
    dirs: {
        [id: string]: { name: string, content: ContentTable }
    },
    items: { link: string, name: string }[]
}

class TooiBasho {
    urlFilters: { reg: RegExp, plugin: Plugin }[] = [];

    addPlugin(plugin: Plugin) {
        this.urlFilters.push(...plugin.urlFilter.map(r => { return { reg: r, plugin: plugin } }));
    }

    async * detect(url: string): AsyncGenerator<ArchiveItem, void, void> {
        const gens = this.urlFilters
            .filter(f => f.reg.test(url))
            .map(f => f.plugin.detect(url))
        yield* combineAsyncGenerator(...gens);
    }

    async * archive(items: ArchiveItem[], archiver: Archiver) {
        const menu: ContentTable = { dirs: {}, items: [] };
        for (const item of items) {
            try {
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
        <title>专栏备份目录</title>
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

export { TooiBasho, Archiver, Plugin, ArchiveItem }