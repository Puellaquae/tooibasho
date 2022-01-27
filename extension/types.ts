import { REGISTED_PLUGINS } from "./global";

type Message = {
    message: 'awake'
} | {
    message: 'url',
    url: string
}

type RegistedPlugins = keyof (typeof REGISTED_PLUGINS)

type Setting = {
    afterPackaged: "remove" | "reready",
    allowPackageEmpty: boolean,
    enabledPlugins: RegistedPlugins[],
    packageName: string
}

type IsUnion<T, U extends T = T> =
    (T extends unknown
        ? (U extends T ? false : true)
        : never) extends false ? false : true

type ElementType<T> = T extends (infer U)[] ? U : never;

type BasicFormItem = {
    label?: string,
    description: string
};

type BooleanFormItem = BasicFormItem & {
    type: "boolean"
};

type RadioFormItem<T> = BasicFormItem & {
    type: "radio",
    selections: { [K in keyof T]: { label: string, description?: string } }
};

type SelectionFormItem<T> = BasicFormItem & {
    type: "select",
    selections: { [K in keyof T]: { label: string, description?: string } }
}

type TextInputFormItem = BasicFormItem & {
    type: "text"
};

type SettingInf = {
    [K in keyof Setting]: (Setting[K] extends boolean
        ? BooleanFormItem
        : (IsUnion<Setting[K]> extends true
            ? RadioFormItem<Setting[K]>
            : (Setting[K] extends string
                ? TextInputFormItem
                : (ElementType<Setting[K]> extends never
                    ? never
                    : SelectionFormItem<ElementType<Setting[K]>>
                ))))
};

export { Message, Setting, SettingInf };