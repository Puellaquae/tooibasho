import { getUpActicleList, packageArticles } from "./bilibili/zhuanlan.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upid = process.argv[2];
const articleList = await getUpActicleList(upid);
console.log(`Find ${articleList.length} Articles in ${upid}`)
await packageArticles(articleList.map(r => r.id), __dirname, `article-${upid}`);