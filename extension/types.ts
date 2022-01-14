type Message = {
    message: 'awake'
} | {
    message: 'url',
    url: string
}

export { Message }