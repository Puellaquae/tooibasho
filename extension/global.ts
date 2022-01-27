import { Plugin, TooiBasho } from "../src/index";
import BilibiliZhuanlan from "../src/bilibili/zhuanlan";

const REGISTED_PLUGINS = {
    "BilibiliZhuanlan": BilibiliZhuanlan,
} as const

const plugins: Plugin[] = [
    new BilibiliZhuanlan(),
]

const buildTooiBasho = () => {
    const tooibasho = new TooiBasho();
    plugins.forEach(p => tooibasho.addPlugin(p));
    return tooibasho;
}

const tooibasho = buildTooiBasho();

const CONTEXT_MENU_ID_PAGE = "tooibasho_page";
const CONTEXT_MENU_ID_LINK = "tooibasho_link";


export { tooibasho, plugins, CONTEXT_MENU_ID_PAGE, CONTEXT_MENU_ID_LINK, REGISTED_PLUGINS };