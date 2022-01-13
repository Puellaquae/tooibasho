import axios from "axios";
import { Archiver, ArchiveItem, Plugin } from "..";

const FROM_SPACE = /https?:\/\/space\.bilibili\.com\/(\d+)\/article/;
const FROM_READLIST = /https?:\/\/www\.bilibili\.com\/read\/readlist\/rl(\d+)/;
const FROM_READ = /https?:\/\/www\.bilibili\.com\/read\/cv(\d+)/;

class BilibiliZhuanlan implements Plugin {
    urlFilter: RegExp[];

    constructor() {
        this.urlFilter = [
            FROM_SPACE,
            FROM_READLIST,
            FROM_READ
        ];
    }

    async detect(url: string): Promise<ArchiveItem[]> {
        const uid = url.match(FROM_SPACE)?.at(1);
        const rlid = url.match(FROM_READLIST)?.at(1);
        const cvid = url.match(FROM_READ)?.at(1);
        if (uid) {
            return this.getArticleListFromUid(parseInt(uid));
        } else if (rlid) {
            return this.getArticleListFromRlid(parseInt(rlid));
        } else if (cvid) {
            return [await this.getArticleFromCvid(parseInt(cvid))];
        }
        return []
    }

    async archive(item: ArchiveItem, archiver: Archiver): Promise<{ entryfile: string }> {
        const MAX_TRY = 5;
        let articleData = item.auxData! as ArticleData;
        const paths = [...item.catalogPath.map(c => c.id.toString()), item.name];
        archiver.append(JSON.stringify(articleData), { name: "rawData.json", paths });
        archiver.append(article2html(articleData), { name: "article.html", paths });
        const bannerImageUrl = articleData.readInfo.banner_url;
        const originImageUrls = articleData.readInfo.origin_image_urls;
        const contentImageUrls = articleData.readInfo.content.match(/\/\/i.\.hdslb\.com\/bfs\/article\/[0-9a-f]{40}\..../g);
        let imageUrls = [];
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
            entryfile: 'article.html'
        }
    }

    private async getArticleListFromUid(uid: number): Promise<ArchiveItem[]> {
        const list = await getUpActicleList(uid);
        let items: ArchiveItem[] = [];
        for (const a of list) {
            let data = await getArticleData(a.id);
            items.push({
                type: "dir",
                title: a.title,
                name: `cv${a.id}`,
                catalogPath: buildCatalogPath(data!),
                from: this,
                auxData: data
            });
        }
        return items;
    }

    private async getArticleListFromRlid(rlid: number): Promise<ArchiveItem[]> {
        return [];
    }

    private async getArticleFromCvid(cvid: number): Promise<ArchiveItem> {
        let data = await getArticleData(cvid);
        return {
            type: "dir",
            title: data!.readInfo.title,
            name: `cv${data!.cvid}`,
            catalogPath: buildCatalogPath(data!),
            from: this,
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

interface ArticleData {
    cvid: number,
    readInfo: {
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
        content: string,
        keywords: string
    },
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
    let cata = [];
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
    let articles = [];
    let firstGet = await axios.get(`https://api.bilibili.com/x/space/article?mid=${uid}`);
    articles.push(...firstGet.data.data.articles);
    let pageSize = firstGet.data.data.ps;
    let articleTotal = firstGet.data.data.count;
    for (let i = 2; (i - 1) * pageSize <= articleTotal; i++) {
        let nextGet = await axios.get(`https://api.bilibili.com/x/space/article?mid=${uid}&pn=${i}`);
        articles.push(...nextGet.data.data.articles);
    }
    return [... new Set(articles)];
}

async function getArticleData(cvid: number): Promise<ArticleData | null> {
    let data = await (await axios.get(`https://www.bilibili.com/read/cv${cvid}`)).data;
    let articleData = data.match(/__INITIAL_STATE__=(.*);\(f/g)
    if (articleData.length >= 1) {
        const tempstr = articleData[0].substr(18);
        return JSON.parse(tempstr.substr(0, tempstr.length - 3));
    }
    return null
}

function article2html(articleData: ArticleData): string {
    let body = articleData.readInfo.content
        .replaceAll(/<figure.*?([0-9a-f]{40}\....).*?figure>/g, "<img src=\"images/$1\"></img>")
        .replaceAll(/<img.*?formula=(.*?)".*?>/g, (match, p1, offset, string) => {
            let f = decodeURIComponent(p1);
            return `<code>$$${f}$$</code>`
        })
        .replaceAll(/<figure.*?codecontent="(.*?)".*?figure>/gs, (match, p1, offset, string) => {
            return `<pre>${p1.replaceAll("&amp;", "&")}</pre>`
        })
    let html = `
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
<body><h1>${articleData.readInfo.title}</h1>${articleData.readInfo.banner_url ? '<img src="cover.jpg">' : ''}</img><div class="split"></div>${body}</body></html>
`
    return html;
}

export { BilibiliZhuanlan };