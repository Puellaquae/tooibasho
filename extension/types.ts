import { DEFAULT_SETTING } from "./global";

type Message = {
    message: 'awake'
} | {
    message: 'url',
    url: string
}

type Setting = typeof DEFAULT_SETTING;

type IsUnion<T, U extends T = T> =
    (T extends unknown
        ? (U extends T ? false : true)
        : never) extends false ? false : true

type ElementType<T> = T extends (infer U)[] ? U : never;

type BasicFormItem = {
    label: string,
};

type SwitchFormItem = BasicFormItem & {
    type: "switch"
};

type RadioFormItem<T extends string | number> = BasicFormItem & {
    type: "radio",
    selections: { [K in T]: { label: string, description?: string } }
};

type SelectionFormItem<T extends string | number> = BasicFormItem & {
    type: "select",
    selections: { [K in T]: { label: string, description?: string } }
}

type TextInputFormItem = BasicFormItem & {
    type: "text"
};

type SettingInf<S> = {
    [K in keyof S]: (S[K] extends boolean
        ? SwitchFormItem
        : (IsUnion<S[K]> extends true
            ? (S[K] extends string | number ? RadioFormItem<S[K]> : never)
            : (S[K] extends string
                ? TextInputFormItem
                : (ElementType<S[K]> extends never
                    ? never
                    : (ElementType<S[K]> extends string | number ? SelectionFormItem<ElementType<S[K]>> : never)
                ))))
};

export { Message, Setting, SettingInf };