import axios from "axios";
import archiver from "archiver";
import fs from "fs";

function prepareArchiver(filepath) {
    const output = fs.createWriteStream(filepath);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });
    output.on('end', function () {
        console.log('Data has been drained');
    });
    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            // throw error
            throw err;
        }
    });
    archive.on('error', function (err) {
        throw err;
    });
    archive.pipe(output);
    return archive;
}

async function getUpActicleList(id) {
    let articles = [];
    let firstGet = await axios.get(`https://api.bilibili.com/x/space/article?mid=${id}`);
    articles.push(...firstGet.data.data.articles);
    let pageSize = firstGet.data.data.ps;
    let articleTotal = firstGet.data.data.count;
    for (let i = 2; (i - 1) * pageSize <= articleTotal; i++) {
        let nextGet = await axios.get(`https://api.bilibili.com/x/space/article?mid=${id}&pn=${i}`);
        articles.push(...nextGet.data.data.articles);
    }
    return [... new Set(articles)];
}

async function getArticleData(id) {
    let data = await (await axios.get(`https://www.bilibili.com/read/cv${id}`)).data;
    let articleData = data.match(/__INITIAL_STATE__=(.*);\(f/g)
    if (articleData.length >= 1) {
        const tempstr = articleData[0].substr(18);
        return JSON.parse(tempstr.substr(0, tempstr.length - 3));
    }
    return null
}

function article2html(articleData) {
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

async function writeArticleToArchive(articleData, archiver, prefix) {
    archiver.append(JSON.stringify(articleData), { name: "rawData.json", prefix: prefix });
    archiver.append(article2html(articleData), { name: "article.html", prefix: prefix });
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
        for (let i = 1; i <= 5; i++) {
            try {
                const res = await axios({
                    method: "GET",
                    url: url,
                    responseType: "arraybuffer"
                });
                archiver.append(Buffer.alloc(res.data.length, res.data, "binary"), {
                    name: 'images/' + url.substr(url.length - 44),
                    prefix: prefix
                });
                if (url === bannerImageUrl) {
                    archiver.append(Buffer.alloc(res.data.length, res.data, "binary"), {
                        name: "cover." + url.substr(url.length - 3),
                        prefix: prefix
                    })
                }
                console.log(`${url} finish`);
                break;
            } catch (err) {
                console.log(`${url} fail ${i}th times for ${err}`);
            }
        }
    });
    await Promise.all(downloadImages);
}

async function packageArticle(articleData, outdir, outname) {
    const archive = prepareArchiver(`${outdir}/${outname}.zip`)
    await writeArticleToArchive(articleData, archive, "/");
    await archive.finalize();
}

function genBookMenu(bookid, bookInfo) {
    let html = `<details><summary>${bookInfo.name}</summary><ul>`
    for (const cvid in bookInfo.articles) {
        if (bookInfo.articles.hasOwnProperty(cvid)) {
            const article = bookInfo.articles[cvid];
            html += `<li><a href='${article.dir}/article.html'>${article.title}</a></li>`
        }
    }
    html += "</ul></details>"
    return html;
}

function genUpMenu(upid, upInfo) {
    let html = `<details><summary>${upInfo.name}#${upid}</summary><ul>`
    for (const bookid in upInfo.books) {
        if (upInfo.books.hasOwnProperty(bookid)) {
            html += `<li>${genBookMenu(bookid, upInfo.books[bookid])}</li>`;
        }
    }
    html += "</ul></details>"
    return html;
}

function buildMenu(articleTables) {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>专栏备份目录</title>
    <style> ul li { list-style: none; } </style>
</head>
<body>
`
    for (const upid in articleTables) {
        if (articleTables.hasOwnProperty(upid)) {
            html += genUpMenu(upid, articleTables[upid]);
        }
    }
    html += "</body></html>";
    return html;
}

async function packageArticles(ids, outdir, outname) {
    const archive = prepareArchiver(`${outdir}/${outname}.zip`)
    let articleTables = {};
    for (const id of ids) {
        for (let i = 1; i <= 5; i++) {
            try {
                const articleData = await getArticleData(id);
                const bookid = articleData.readInfo.list?.id ?? -1;
                const bookname = articleData.readInfo.list?.name ?? "未归入文集";
                const upid = articleData.readInfo.author.mid;
                const upname = articleData.readInfo.author.name;
                articleTables[upid] = articleTables[upid] ?? { name: upname, books: {} }
                articleTables[upid].books[bookid] = articleTables[upid].books[bookid] ?? { name: bookname, articles: [] };
                articleTables[upid].books[bookid].articles.push({
                    title: articleData.readInfo.title,
                    dir: `cv${id}`
                });
                await writeArticleToArchive(articleData, archive, `cv${id}`);
                console.log(`cv${id} finish`);
                break;
            }
            catch (err) {
                console.log(`cv${id} fail ${i}th times for ${err}`);
            }
        }
    };
    archive.append(buildMenu(articleTables), { name: "index.html" });
    await archive.finalize();
}

export { getUpActicleList, getArticleData, packageArticle, packageArticles };