import axios from "axios";
import { ArchiveItem, Archiver, Plugin } from "../..";
import { join, basename } from "path-browserify";

type AuxData = {
    link: string,
    idx: string,
    titles: string[],
    cover: string
}

const NijiyonFirst: Plugin = {
    urlPattern: [
        "*://lovelive-as.bushimo.jp/special/nijiyon/",
        "*://lovelive-as.bushimo.jp/special/nijiyon/page/*"
    ],
    label: "虹四格第一季",
    description: "虹四格第一季",
    test(url: string): boolean {
        return /https?:\/\/lovelive-as\.bushimo\.jp\/special\/nijiyon\/(page\/\d+\/)?$/.test(url)
    },
    async *detect(url: string): AsyncGenerator<ArchiveItem, void, void> {
        const req = await axios.get(url);
        const html = await req.data as string;
        const items = html.match(/<section class="comic-Content-item comic-Item">(.*?)<\/section>/gms);
        if (items) {
            for (const item of items) {
                const linkR = item.match(/<a class="comic-Item-link" href="(.*?)">/);
                if (linkR === null || linkR.length < 2) {
                    continue;
                }
                const idxR = item.match(/<h3 class="comic-Item-chap"><span>(.*?)<\/span><\/h3>/);
                if (idxR === null || idxR.length < 2) {
                    continue;
                }
                const titleR = item.match(/<h2 class="comic-Item-title">(.*?)<\/h2>/);
                if (titleR === null || titleR.length < 2) {
                    continue;
                }
                const coverR = item.match(/<img alt="" class="comic-Item-thumb-image" src="(.*?)">/);
                if (coverR === null || coverR.length < 2) {
                    continue;
                }
                const link = linkR[1];
                const idx = idxR[1];
                const titles = titleR[1].split("<br>");
                const cover = coverR[1]
                yield {
                    type: "dir",
                    title: `${titles.join("、")}`,
                    name: idx,
                    catalogPath: [{ id: "nijiyon", name: "にじよん" }, { id: "first", name: "第一季" }],
                    from: NijiyonFirst,
                    auxData: {
                        link,
                        idx,
                        titles,
                        cover
                    }
                }
            }
        }
        return;
    },
    async archive(item: ArchiveItem, archiver: Archiver): Promise<{ entryfile: string; }> {
        const data = item.auxData as AuxData;
        const paths = [...item.catalogPath.map(c => c.id.toString()), item.name];
        const coverReq = await axios({
            method: "GET",
            url: data.cover,
            responseType: "arraybuffer"
        });
        archiver.append(coverReq.data, {
            name: "cover" + basename(data.cover),
            paths
        });
        const stories = await resolveArticle(data);
        await download(stories, archiver, paths);
        const htmlOut = buildHtml(item, stories);
        archiver.append(htmlOut, {
            name: "index.html",
            paths
        });
        return { entryfile: join(item.name, "index.html") };
    }
}

async function download(stories: { mange: string; members: string[]; }[], archiver: Archiver, paths: string[]) {
    const downloadMembers = new Set<string>();
    for (const s of stories) {
        const mangeReq = await axios({
            method: "GET",
            url: s.mange,
            responseType: "arraybuffer"
        });
        archiver.append(mangeReq.data, {
            name: join("img", basename(s.mange)),
            paths
        });
        for (const m of s.members) {
            if (!downloadMembers.has(m)) {
                const memberReq = await axios({
                    method: "GET",
                    url: m,
                    responseType: "arraybuffer"
                });
                archiver.append(memberReq.data, {
                    name: join("img", basename(m)),
                    paths
                });
                downloadMembers.add(m);
            }
        }
    }
}

async function resolveArticle(data: AuxData): Promise<{ mange: string; members: string[]; }[]> {
    const req = await axios.get(data.link);
    const html = await req.data as string;
    const articleR = html.match(/<article class="comic-Article">(.*?)<\/article>/gms);
    if (articleR === null || articleR.length < 1) {
        throw new Error("Not found article");
    }
    const article = articleR[0];
    const storiesR = article.match(/<div class="comic-Article-body comic-Body">\s+<img class="comic-Article-body-image" src="(.*?)" alt="">\s+<\/div>\s+<div class="comic-Article-Member">\s+(<div class="comic-Article-Member-Item">(.*?)<\/div>)+\s+<\/div>/gms)
    if (storiesR === null) {
        throw new Error("Not found mange");
    }
    const stories: { mange: string, members: string[] }[] = [];
    storiesR.forEach(s => {
        const imageR = s.match(/<img class="comic-Article-body-image" src="(.*?)" alt="">/);
        if (imageR === null || imageR.length < 2) {
            return;
        }
        const imgs: string[] = [];
        const membersR = s.match(/<img class="comic-Article-Member-Item-image" src="(.*?)" alt="">/g);
        membersR?.forEach(m => {
            const imgR = m.match(/<img class="comic-Article-Member-Item-image" src="(.*?)" alt="">/);
            if (imgR === null || imgR.length < 2) {
                return;
            }
            const img = join("https://lovelive-as.bushimo.jp", imgR[1].replace("-narrow", "@2x"));
            imgs.push(img);
        })
        stories.push({
            mange: imageR[1],
            members: imgs
        });
    });
    return stories;
}

function buildHtml(item: ArchiveItem, stories: { mange: string; members: string[]; }[]) {
    const data = item.auxData as AuxData;
    const stroiesHtml = stories.map(s => {
        const members = s.members.map(m => `<img src="img/${basename(m)}"></img>`).join("")
        return `<img src="img/${basename(s.mange)}"></img><div class="members">${members}</div>`;
    }).join("");
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.name}</title>
    <style>
        h1 {
            text-align: center;
        }
        img {
            display: block;
            margin: 0 auto;
        }
        .members {
            display: flex;
            flex-wrap: wrap;
        }
    </style>
</head>
<body><h1>${item.title}</h1><img src="cover${basename(data.cover)}"></img>${stroiesHtml}</body></html>`;
}

export { NijiyonFirst };
export default NijiyonFirst;
