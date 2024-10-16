import { WebSocket } from 'ws'

export const url = 'http://localhost:3000'

export type TestWebSocket = {
    path(path: string): void,
    send(data: any): void,
    receive(delay?: number): Promise<any>
    pull_t(t: string, delay?: number): Promise<any>
    close(): Promise<void>
}

export async function wsp(): Promise<TestWebSocket> {
    let { sid } = await get('/')
    let ws = new WebSocket(`${url}/_ws`)

    let close_resolve = () => {}
    let msg_resolve

    let msg_buffer: any[] = []
    let tws = {
        path(path: string) {
            this.send({ sid, path })
        },
        send(data) {
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
            return r.find(_ => _.t === t)?.d
        },
        async close() {
            ws.close()
            return new Promise<void>(resolve => {
                close_resolve = resolve
            })
        }
    }

    return new Promise((resolve, reject) => {
        ws.onmessage = (e) => {
            msg_buffer.push(JSON.parse(e.data))
        }
        ws.onopen = () => {
            resolve(tws)
        }
        ws.onclose = () => {
            setTimeout(close_resolve, 0)
        }
    })

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

