import { archive, ArchiveItem, detect } from "../src/index";
import BilibiliZhuanlan from "../src/bilibili/zhuanlan";
import { Setting, SettingInf } from "./types";
import Browser from "webextension-polyfill";

const REGISTED_PLUGINS = {
    "BilibiliZhuanlan": BilibiliZhuanlan,
} as const

type RegistedPlugins = keyof (typeof REGISTED_PLUGINS);

const CONTEXT_MENU_ID_PAGE = "tooibasho_page";
const CONTEXT_MENU_ID_LINK = "tooibasho_link";
const STORAGE_KEY_SETTING = "setting";

const DEFAULT_SETTING = {
    afterPackaged: "remove" as ("remove" | "reready"),
    allowPackageEmpty: false as boolean,
    enabledPlugins: ["BilibiliZhuanlan"] as RegistedPlugins[],
    packageName: "Archive" as string
};

const SETTING_FORM: SettingInf<Setting> = {
    afterPackaged: {
        label: "导出后将已导出项",
        type: "radio",
        selections: {
            remove: {
                label: "移除"
            },
            reready: {
                label: "重置为待存档状态"
            }
        }
    },
    allowPackageEmpty: {
        label: "是否允许导出空内容",
        type: "switch"
    },
    enabledPlugins: {
        label: "选择启用的插件",
        type: "select",
        selections: {
            BilibiliZhuanlan: {
                label: BilibiliZhuanlan.label
            }
        }
    },
    packageName: {
        label: "导出文件文件名",
        type: "text"
    }
}

let setting: Setting | null = null;

async function getSetting(): Promise<Setting> {
    if (setting === null) {
        setting = (await Browser.storage.local.get(STORAGE_KEY_SETTING))[STORAGE_KEY_SETTING];
        if (!setting) {
            setSetting(DEFAULT_SETTING);
        }
        return getSetting();
    } else {
        return setting;
    }
}

async function setSetting(newSetting: Setting): Promise<void> {
    await Browser.storage.local.set({ [STORAGE_KEY_SETTING]: newSetting });
    setting = newSetting;
    return;
}

async function initSetting() {
    try {
        const setting = await getSetting()
        if (!setting) {
            await setSetting(DEFAULT_SETTING);
        }
    } catch (e) {
        await setSetting(DEFAULT_SETTING);
    }
}

const TooiBasho = {
    async * detect(url: string): AsyncGenerator<ArchiveItem, void, void> {
        const setting = await getSetting();
        yield* detect(url, setting.enabledPlugins.map(p => REGISTED_PLUGINS[p]))
    },
    archive
}

export {
    CONTEXT_MENU_ID_PAGE,
    CONTEXT_MENU_ID_LINK,
    REGISTED_PLUGINS,
    DEFAULT_SETTING,
    SETTING_FORM,
    TooiBasho,
    initSetting,
    getSetting,
    setSetting,
};