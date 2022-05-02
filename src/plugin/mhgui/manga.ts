import axios from "axios";
import { ArchiveItem, Archiver, Plugin } from "../..";
import LZString from "lz-string";
import { join } from "path-browserify";
import { codeRunner } from "../../utils";

const MANGE_EPISODE = /^https?:\/\/www\.mhgui\.com\/comic\/(\d+)\/((\d+).html)?$/

type AuxData = {
    bid: number,
    bname: string,
    bpic: string,
    cid: number,
    cname: string,
    files: string[],
    finished: boolean,
    len: number,
    path: string,
    status: number,
    block_cc: string,
    nextId: number,
    prevId: number,
    sl: {
        e: number,
        m: string
    }
};

const MHGuiManga: Plugin = {
    urlPattern: ["*://www.mhgui.com/comic/*"],
    label: "漫画柜",
    description: "漫画柜",
    test(url: string): boolean {
        return MANGE_EPISODE.test(url);
    },
    async *detect(url: string): AsyncGenerator<ArchiveItem, void, void> {
        const res = url.match(MANGE_EPISODE);
        const mangaId = res?.at(1);
        const episodeId = res?.at(3);
        if (mangaId && episodeId) {
            yield* resolveEpisode(parseInt(mangaId), parseInt(episodeId));
        } else if (mangaId) {
            yield* resolveManga(parseInt(mangaId));
        }
        return;
    },
    async archive(item: ArchiveItem, archiver: Archiver): Promise<{ entryfile: string; }> {
        const data = item.auxData as AuxData;
        const paths = [...item.catalogPath.map(c => c.id.toString()), item.name];
        for (const file of data.files) {
            const fileReq = await axios({
                method: "GET",
                url: `https://i.hamreus.com${data.path}${file}?e=${data.sl.e}&m=${data.sl.m}`,
                responseType: "arraybuffer"
            });
            archiver.append(fileReq.data, {
                name: join("img", file),
                paths
            });
        }
        const html = buildHtml(data)
        archiver.append(html, {
            name: "index.html",
            paths
        });
        return { entryfile: "" };
    }
}

async function* resolveEpisode(mangaId: number, episodeId: number): AsyncGenerator<ArchiveItem, void, void> {
    const htmlReq = await axios.get(`https://www.mhgui.com/comic/${mangaId}/${episodeId}.html`);
    const html = await htmlReq.data;
    const imgR = html.match(/window\["\\x65\\x76\\x61\\x6c"\](.*?)<\/script>/ms)
    const code = imgR[1].replaceAll(/'([-A-Za-z0-9+/=]*)'\['\\x73\\x70\\x6c\\x69\\x63'\]\('\\x7c'\)/g, (_match: string, p1: string) => {
        return JSON.stringify(LZString.decompressFromBase64(p1)?.split("|"));
    });
    if (!codeRunner) {
        return;
    }
    const codeRes = await codeRunner(`return ${code}`) as string;
    const data = JSON.parse(codeRes.slice(12, -12)) as AuxData;
    yield {
        type: "dir",
        title: data.cname,
        name: `${data.cid}`,
        catalogPath: [{ id: `mhgui${data.bid}`, name: data.bname }],
        from: MHGuiManga,
        auxData: data
    };
    return;
}

async function* resolveManga(mangaId: number): AsyncGenerator<ArchiveItem, void, void> {
    const htmlReq = await axios.get(`https://www.mhgui.com/comic/${mangaId}/`);
    const html = await htmlReq.data as string
    const episodeReg = new RegExp(`<a href="/comic/${mangaId}/(.*?).html" title="(.*?)"`, "g");
    const episodesR = html.match(episodeReg);
    function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
        if (value === null || value === undefined) return false;
        return true;
    }
    if (episodesR) {
        const episodes = episodesR.map(e => e.match(/\/(.*?).html/)?.at(1)).filter<string>(notEmpty).map(e => parseInt(e)).sort();
        for (const e of episodes) {
            yield* resolveEpisode(mangaId, e);
        }
    }
    return;
}

function buildHtml(data: AuxData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.bname}/${data.cname}</title>
    <style>
        h1 {
            text-align: center;
        }
        img {
            display: block;
            margin: 0 auto;
        }
    </style>
</head>
<body><h1>${data.bname}/${data.cname}</h1>${data.files.map(f => `<img src="img/${f}"></img>`)}</body></html>`;
}

export { MHGuiManga };
export default MHGuiManga;
