import { it, expect } from 'vitest'
import { WebSocket } from 'ws'


const url = 'http://localhost:3000'

it('pings at first', async () => {
    await new Promise<void>(resolve => {
        let ws = new WebSocket(`${url}/_ws`)
        
        ws.onmessage = (e) => {
            expect(e.data).toBe("0")
            resolve()
        }
        ws.onopen = () => {
            //ws.send('ping')
        }

    })
    expect(3).toBe(3)
})

type TestWebSocket = {
    send(data: any): void,
    receive(delay?: number): Promise<any>
}

function wsp3(op: (tws: TestWebSocket, tws2: TestWebSocket, tws3: TestWebSocket) => Promise<void>) {
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

function wsp2(op: (tws: TestWebSocket, tws2: TestWebSocket) => Promise<void>) {
    let wss: TestWebSocket[] = []
    return Promise.all([
        wsp(async tws => {
            wss.push(tws)
            if (wss.length === 2) {
                await op(wss[0], wss[1])
            }
        }),
        wsp(async tws2 => {
            wss.push(tws2)
            if (wss.length === 2) {
                await op(wss[0], wss[1])
            }
        })
    ])
}

function wsp(op: (tws: TestWebSocket) => Promise<void>) {
    return new Promise((resolve, reject) =>
        get('/').then(({ sid }) => {
            let ws = new WebSocket(`${url}/_ws`)

            let msg_resolve

            let msg_buffer: any[] = []
            let tws = {
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
                }
            }

            ws.onmessage = (e) => {
                msg_buffer.push(JSON.parse(e.data))
            }
            ws.onopen = () => {
                ws.send(JSON.stringify({sid}))
                op(tws)
                .catch(reject)
                .finally(() => {
                    ws.close()
                })
            }
            ws.onclose = () => {
                setTimeout(resolve, 0)
            }
        })
    )
}

async function get(path: string) {
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

it('pings on ping', async () => {
    await wsp(async (tws: TestWebSocket) => {
        tws.send('ping')
        let response = await tws.receive(100)

        expect(response).toStrictEqual([0, 0])
    })
})

it('sets sid', async () => {
    let { headers } = await fetch(`${url}/`).then(async value => {
        return {
            headers: value.headers,
            text: await value.text()
        }
    })
    let sid = headers.getSetCookie()[0].split(';').find(_ => _.startsWith('sid='))
    expect(sid).toBeTruthy()
    expect(sid!.length).toBe(16 + 4)
})

it('requires sid', async () => {
    await wsp(async (tws: TestWebSocket) => {
        tws.send({path: 'lobby'})
        let response = await tws.receive()

        expect(response).toStrictEqual([0, { t: 'n', d: 1, r: 0}, { t: 'hlist', d: [] }])
    })
})