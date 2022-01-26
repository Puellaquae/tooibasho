type Message = {
    message: 'awake'
} | {
    message: 'url',
    url: string
}

type BasicSetting = {
    label: string,
    description: string
};

type BooleanSetting = {
    type: "boolean",
};

type TextSetting = {
    type: "string",
};

type SelectionSetting = {
    type: "select",
    selections: { label?: string, value: string }[]
}

type RadioSetting = {
    type: "radio",
    selections: { label?: string, value: string }[]
}

type Settings = BasicSetting & (BooleanSetting | TextSetting | SelectionSetting | RadioSetting);

export { Message, Settings };