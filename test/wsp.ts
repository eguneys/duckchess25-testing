import { WebSocket } from 'ws'

export const url = 'http://localhost:3000'

export type TestWebSocket = {
    path(path: string): void,
    send(data: any): void,
    receive(delay?: number): Promise<any>
    pull_t(t: string, delay?: number): Promise<any>
}

export function wsp3(op: (tws: TestWebSocket, tws2: TestWebSocket, tws3: TestWebSocket) => Promise<void>) {
    let wss: TestWebSocket[] = []
    return Promise.all([
        wsp(async tws => {
            wss.push(tws)
            if (wss.length === 3) {
                await op(wss[0], wss[1], wss[2])
            }
        }),
        wsp(async tws => {
            wss.push(tws)
            if (wss.length === 3) {
                await op(wss[0], wss[1], wss[2])
            }
        }),
        wsp(async tws2 => {
            wss.push(tws2)
            if (wss.length === 3) {
                await op(wss[0], wss[1], wss[2])
            }
        })
    ])
}

export function wsp2(op: (tws: TestWebSocket, tws2: TestWebSocket) => Promise<void>) {
    let wss: TestWebSocket[] = []
    return new Promise((resolve_out, reject_out) => {

        let resolve_in, reject_in

        let wait_all = new Promise((resolve, reject) => {
            resolve_in = resolve
            reject_in = reject
        })
            .then(resolve_out)
            .catch(reject_out)
        wsp(async tws => {
            wss.push(tws)
            if (wss.length === 2) {
                await op(wss[0], wss[1])
                    .then(resolve_in)
                    .catch(reject_in)
            } else {
                await wait_all
            }
        }),
            wsp(async tws2 => {
                wss.push(tws2)
                if (wss.length === 2) {
                    await op(wss[0], wss[1])
                        .then(resolve_in)
                        .catch(reject_in)
                } else {
                    await wait_all
                }
            })
    })
}

export function wsp(op: (tws: TestWebSocket) => Promise<void>) {
    return new Promise((resolve, reject) =>
        get('/').then(({ sid }) => {
            let ws = new WebSocket(`${url}/_ws`)

            let msg_resolve

            let msg_buffer: any[] = []
            let tws = {
                path(path: string) {
                    this.send({ sid, path })
                },
                send(data) {
                    console.log('send', data, sid)
                    if (typeof data === 'object') {
                        ws.send(JSON.stringify(data))
                    } else {
                        ws.send(data)
                    }
                },
                async receive(delay = 500) {
                    await new Promise(resolve => setTimeout(resolve, delay))

                    let res = msg_buffer
                    msg_buffer = []
                    return res
                },
                async pull_t(t: string, delay?: number) {
                    let r = await this.receive(delay)
                    console.log(r)
                    return r.find(_ => _.t === t)?.d
                }
            }

            ws.onmessage = (e) => {
                msg_buffer.push(JSON.parse(e.data))
            }
            ws.onopen = () => {
                op(tws)
                    .catch(reject)
                    .finally(() => {
                        ws.close()
                    })
            }
            ws.onclose = () => {
                console.log('closing', sid)
                setTimeout(resolve, 0)
            }
        })
    )
}

export async function get(path: string) {
    let { headers } = await fetch(`${url}/${path}`).then(async value => {
        return {
            headers: value.headers,
            text: await value.text()
        }
    })
    let sid = headers.getSetCookie()[0].split(';').find(_ => _.startsWith('sid='))?.slice(4)
    return {
        sid
    }
}

