import { Plugin, TooiBasho } from "../src/index";
import BilibiliZhuanlan from "../src/bilibili/zhuanlan";

const plugins: Plugin[] = [
    new BilibiliZhuanlan(),
]

const buildTooiBasho = () => {
    const tooibasho = new TooiBasho();
    plugins.forEach(p => tooibasho.addPlugin(p));
    return tooibasho;
}

const tooibasho = buildTooiBasho();

const ExtensionContextMenuForPageID = "tooibasho_page";
const ExtensionContextMenuForLinkID = "tooibasho_link";

export { tooibasho, plugins, ExtensionContextMenuForPageID, ExtensionContextMenuForLinkID };