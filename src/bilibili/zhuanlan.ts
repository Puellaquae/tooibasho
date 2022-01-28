import axios from "axios";
import { Archiver, ArchiveItem, Plugin } from "..";
import { pathJoin } from "../utils";

const FROM_SPACE = /https?:\/\/space\.bilibili\.com\/(\d+)\/article/;
const SPACE_URL_PATTERN = "*://space.bilibili.com/*/article";
const FROM_READLIST = /https?:\/\/www\.bilibili\.com\/read\/readlist\/rl(\d+)/;
const READLIST_URL_PATTERN = "*://www.bilibili.com/read/readlist/*";
const FROM_READ = /https?:\/\/www\.bilibili\.com\/read\/cv(\d+)/;
const READ_URL_PATTERN = "*://www.bilibili.com/read/*";

const urlFilter = [
    FROM_SPACE,
    FROM_READLIST,
    FROM_READ
];

const BilibiliZhuanlan: Plugin = {
    urlPattern: [
        SPACE_URL_PATTERN,
        READLIST_URL_PATTERN,
        READ_URL_PATTERN
    ],
    label: "B站专栏",
    description: "B站专栏保存工具",
    test(url: string): boolean {
        return urlFilter.map(f => f.test(url)).some(v => v);
    },
    async *detect(url: string): AsyncGenerator<ArchiveItem, void, void> {
        const uid = url.match(FROM_SPACE)?.at(1);
        const rlid = url.match(FROM_READLIST)?.at(1);
        const cvid = url.match(FROM_READ)?.at(1);
        if (uid) {
            yield* getArticleListFromUid(parseInt(uid));
        } else if (rlid) {
            yield* getArticleListFromRlid(parseInt(rlid));
        } else if (cvid) {
            yield* getArticleFromCvid(parseInt(cvid));
        }
    },
    async archive(item: ArchiveItem, archiver: Archiver): Promise<{ entryfile: string }> {
        const MAX_TRY = 5;
        if (!item.auxData) {
            throw new Error("No AuxData found in ArchiveItem");
        }
        const articleData = item.auxData as ArticleData;
        const paths = [...item.catalogPath.map(c => c.id.toString()), item.name];
        archiver.append(JSON.stringify(articleData), { name: "rawData.json", paths });
        archiver.append(article2html(articleData), { name: "article.html", paths });
        const bannerImageUrl = articleData.readInfo.banner_url;
        const originImageUrls = articleData.readInfo.origin_image_urls;
        const contentImageUrls = articleData.readInfo.content.match(/\/\/i.\.hdslb\.com\/bfs\/article\/[0-9a-f]{40}\..../g);
        const imageUrls = [];
        if (bannerImageUrl) {
            imageUrls.push(bannerImageUrl);
        }
        imageUrls.push(...(originImageUrls ?? []));
        imageUrls.push(...(contentImageUrls ?? []));
        const uniqueImageUrls = [...new Set(imageUrls.map(u => u.startsWith("https") ? u : "https:" + u))]
        console.log(`find ${uniqueImageUrls.length} images in cv${articleData.cvid}`)
        const downloadImages = uniqueImageUrls.map(async url => {
            for (let i = 1; i <= MAX_TRY; i++) {
                try {
                    const res = await axios({
                        method: "GET",
                        url: url,
                        responseType: "arraybuffer"
                    });
                    archiver.append(res.data, {
                        name: 'images/' + url.substring(url.length - 44),
                        paths
                    });
                    if (url === bannerImageUrl) {
                        archiver.append(res.data, {
                            name: "cover." + url.substring(url.length - 3),
                            paths
                        })
                    }
                    console.log(`${url} finish`);
                    break;
                } catch (err) {
                    console.log(`${url} fail ${i}th times for ${err}`);
                    if (i === MAX_TRY) {
                        throw err;
                    }
                }
            }
        });
        await Promise.all(downloadImages);
        return {
            entryfile: pathJoin(item.name, 'article.html')
        }
    }
}

async function* getArticleListFromUid(uid: number): AsyncGenerator<ArchiveItem, void, void> {
    const list = await getUpActicleList(uid);
    for (const a of list) {
        const data = await getArticleData(a.id);
        if (data) {
            yield {
                type: "dir",
                title: a.title,
                name: `cv${a.id}`,
                catalogPath: buildCatalogPath(data),
                from: BilibiliZhuanlan,
                auxData: data
            };
        }
    }
}

async function* getArticleListFromRlid(rlid: number): AsyncGenerator<ArchiveItem, void, void> {
    const list = await getReadlistArticlesList(rlid);
    for (const a of list) {
        const data = await getArticleData(a);
        if (data) {
            yield {
                type: "dir",
                title: data.readInfo.title,
                name: `cv${data.cvid}`,
                catalogPath: buildCatalogPath(data),
                from: BilibiliZhuanlan,
                auxData: data
            };
        }
    }
}

async function* getArticleFromCvid(cvid: number): AsyncGenerator<ArchiveItem, void, void> {
    const data = await getArticleData(cvid);
    if (data) {
        yield {
            type: "dir",
            title: data.readInfo.title,
            name: `cv${data.cvid}`,
            catalogPath: buildCatalogPath(data),
            from: BilibiliZhuanlan,
            auxData: data
        }
    }
}

interface Article {
    id: number,
    category: {
        id: number,
        parent_id: number,
        name: string
    },
    categories: {
        id: number,
        parent_id: number,
        name: string
    }[],
    title: string,
    summary: string,
    banner_url: string,
    template_id: number,
    state: number,
    author: {
        mid: number,
        name: string,
        face: string,
        pendant: {
            pid: number,
            name: string,
            image: string,
            expire: number
        },
        official_verify: {
            type: number,
            desc: string
        },
        nameplate: {
            nid: 0,
            name: string,
            image: string,
            image_small: string,
            level: string,
            condition: string
        },
        vip: {
            type: number,
            status: number,
            due_date: number,
            vip_pay_type: number,
            theme_type: number,
            label: {
                path: string,
                text: string,
                label_theme: string
            },
            avatar_subscript: number,
            nickname_color: string
        }
    },
    reprint: number,
    image_urls: string[]
    publish_time: number,
    ctime: number,
    stats: {
        view: number,
        favorite: number,
        like: number,
        dislike: number,
        reply: number,
        share: number,
        coin: number,
        dynamic: number
    },
    tags: { tid: number, name: string }[],
    words: number,
    dynamic: string,
    origin_image_urls: string[],
    list: {
        id: number,
        mid: number,
        name: string,
        image_url: string,
        update_time: number,
        ctime: number,
        publish_time: number,
        summary: string,
        words: number,
        read: number,
        articles_count: number
    } | null
}

interface ReadInfo extends Article {
    content: string,
    keywords: string
}

interface ArticleData {
    cvid: number,
    readInfo: ReadInfo,
    readViewInfo: {
        total: number
    },
    upInfo: {
        fans: number,
        readCount: number
    },
    recommendInfoList: object[]
}

function buildCatalogPath(data: ArticleData) {
    const cata = [];
    cata.push({
        id: 'u' + data.readInfo.author.mid,
        name: data.readInfo.author.name
    });
    if (data.readInfo.list) {
        cata.push({
            id: 'rl' + data.readInfo.list.id,
            name: data.readInfo.list.name
        });
    }
    return cata;
}

async function getUpActicleList(uid: number): Promise<Article[]> {
    const articles = [];
    const firstGet = await axios.get(`https://api.bilibili.com/x/space/article?mid=${uid}`);
    articles.push(...firstGet.data.data.articles);
    const pageSize = firstGet.data.data.ps;
    const articleTotal = firstGet.data.data.count;
    for (let i = 2; (i - 1) * pageSize <= articleTotal; i++) {
        const nextGet = await axios.get(`https://api.bilibili.com/x/space/article?mid=${uid}&pn=${i}`);
        articles.push(...nextGet.data.data.articles);
    }
    return [... new Set(articles)];
}

async function getArticleData(cvid: number): Promise<ArticleData | null> {
    const data = await (await axios.get(`https://www.bilibili.com/read/cv${cvid}`)).data;
    const articleData = data.match(/__INITIAL_STATE__=(.*);\(f/);
    if (articleData.length >= 2) {
        return JSON.parse(articleData[1]);
    }
    return null
}

async function getReadlistArticlesList(rlid: number): Promise<number[]> {
    const rldata = axios.get(` https://www.bilibili.com/read/readlist/rl${rlid}`);
    const data = (await rldata).data.match(/window\.articlelistIds = (\[(\d+)(,(\d+))*\])/);
    if (data.length >= 2) {
        return JSON.parse(data[1]);
    }
    return [];
}

function article2html(articleData: ArticleData): string {
    const body = articleData.readInfo.content
        .replaceAll(/<figure.*?([0-9a-f]{40}\....).*?figure>/g, "<img src=\"images/$1\"></img>")
        .replaceAll(/<img.*?formula=(.*?)".*?>/g, (_match, p1) => {
            const f = decodeURIComponent(p1);
            return `<code>$$${f}$$</code>`
        })
        .replaceAll(/<figure.*?codecontent="(.*?)".*?figure>/gs, (_match, p1) => {
            return `<pre>${p1.replaceAll("&amp;", "&")}</pre>`
        })
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleData.readInfo.title}</title>
    <style>
        html {
            background-color: #f6f7f9;
        }
        body {
            background-color: #fff;
            width: 660px;
            margin: 0 auto;
            padding: 30px 120px;
        }
        img {
            display: block;
            object-fit: scale-down;
            margin: 0 auto;
            max-width: 100%;
        }
        .font-size-20 {
            font-size: 20px;
        }
        .font-size-12 {
            font-size: 12px;
        }
        .font-size-16 {
            font-size: 16px;
        }
        .color-blue-01 {
            color: #56c1fe
        }
        .color-lblue-01 {
            color: #73fdea
        }
        .color-green-01 {
            color: #89fa4e
        }
        .color-yellow-01 {
            color: #fff359
        }
        .color-pink-01 {
            color: #ff968d;
        }
        .color-purple-01 {
            color: #ff8cc6
        }
        .color-blue-02 {
            color: #02a2ff
        }
        .color-lblue-02 {
            color: #18e7cf
        }
        .color-green-02 {
            color: #60d837
        }
        .color-yellow-02 {
            color: #fbe231
        }
        .color-pink-02 {
            color: #ff654e
        }
        .color-purple-02 {
            color: #ef5fa8
        }
        .color-blue-03 {
            color: #0176ba
        }
        .color-lblue-03 {
            color: #068f86
        }
        .color-green-03 {
            color: #1db100
        }
        .color-yellow-03 {
            color: #f8ba00
        }
        .color-pink-03 {
            color: #ee230d
        }
        .color-purple-03 {
            color: #cb297a
        }
        .color-blue-04 {
            color: #004e80
        }
        .color-lblue-04 {
            color: #017c76
        }
        .color-green-04 {
            color: #017001
        }
        .color-yellow-04 {
            color: #ff9201
        }
        .color-pink-04 {
            color: #b41700
        }
        .color-purple-04 {
            color: #99195e
        }
        .color-gray-01 {
            color: #d6d5d5
        }
        .color-gray-02 {
            color: #929292
        }
        .color-gray-03 {
            color: #5f5f5f
        }
        .color-default {
            color: #222
        }
        a {
            color: #fb7299
        }
        .split {
            width: 820px;
            margin: 20px 0;
            margin-left: -80px;
            height: 1px;
            background-color: hsla(0,0%,59.2%,.21);
        }
    </style>
</head>
<body><h1>${articleData.readInfo.title}</h1>${articleData.readInfo.banner_url ? '<img src="cover.jpg"/>' : ''}<div class="split"/>${body}</body></html>
`
    return html;
}

export default BilibiliZhuanlan;