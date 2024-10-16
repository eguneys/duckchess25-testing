import { WebSocket } from 'ws'

export const url = 'http://localhost:3000'

export type TestWebSocket = {
    path(path: string): void,
    send(data: any): void,
    receive(delay?: number): Promise<any>
    pull_t(t: string, delay?: number): Promise<any>
    close(): Promise<void>,
    sid: string
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
        },
        sid
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

export async function get(path: string, sid: string = '') {

    let h: any = {}
    if (sid.length > 0) {
        h.Cookie = `sid=${sid}`

    }
    let { headers, text } = await fetch(`${url}/${path}`, { headers: h }).then(async value => {
        return {
            headers: value.headers,
            text: await value.text()
        }
    })

    if (sid === '') {
        sid = headers.getSetCookie()[0].split(';').find(_ => _.startsWith('sid='))?.slice(4)!
    }

    return {
        sid,
        text
    }
}




export type LobbyActions = {
    hadd(time_control: string): void,
    hjoin(id: string): void,
    pull_hlist(): Promise<any>,
    pull_hadd(): Promise<any>,
    pull_hrem(): Promise<any>,
    pull_redirect(delay?: number): Promise<string>,
}

export type SiteActions = {}

export type RoundActions = {
    move(uci: string): void,
    pull_move(): Promise<any>
}

export type WebsiteActions = {
    page_lobby(): void
    page_site(): void
    page_round(id: string): void
    pull_reload(): Promise<any>
}

export type Wac = TestWebSocket & LobbyActions & SiteActions & RoundActions & WebsiteActions

export async function wac(): Promise<Wac> {
    let tws = await wsp()

    return {
        ...website_actions(tws),
        ...site_actions(tws),
        ...lobby_actions(tws),
        ...round_actions(tws),
        ...tws
    }
}

function website_actions(tws: TestWebSocket): WebsiteActions {
    return {
        page_site() {
            tws.path('site')
        },
        page_lobby() {
            tws.path('lobby')
        },
        page_round(id: string) {
            tws.path(`round&${id}`)
        },
        async pull_reload() {
            return await tws.pull_t('reload')
        }
    }
}

function round_actions(tws: TestWebSocket): RoundActions {
    return {
        move(uci) {
            tws.send({ t: 'move', d: uci })
        },
        /* {"t":"move","d":{"step":{"uci":"h3@h2h4","san":"h3@h4","fen":""},"clock":{"wclock":0,"bclock":180000}}} */
        async pull_move() {
            return await tws.pull_t('move')
        }


    }
}

function site_actions(tws: TestWebSocket): SiteActions {
    return {}
}

function lobby_actions(tws: TestWebSocket): LobbyActions {
    return {
        hadd(time_control: string) {
            tws.send({t: 'hadd', d: time_control})
        },
        hjoin(id: string) {
            tws.send({t: 'hjoin', d: id})
        },
        async pull_hlist(): Promise<void> {
            return await tws.pull_t('hlist')
        },
        async pull_hadd(): Promise<void> {
            return await tws.pull_t('hadd')
        },
        async pull_hrem(): Promise<void> {
            return await tws.pull_t('hrem')
        },
        async pull_redirect(delay?: number): Promise<any> {
            return await tws.pull_t('game_redirect', delay)
        }
    }
}


export async function rp(): Promise<[Wac, Wac]> {
    let white = await wac()
    let black = await wac()

    white.page_lobby()
    black.page_lobby()

    white.hadd('tenzero')
    let h = await white.pull_hadd()
    black.hjoin(h.id)

    let r = await white.pull_redirect()

    white.page_round(r)
    black.page_round(r)


    let { text } = await get(r, white.sid)

    if (!text.includes('Your Turn')) {
        [white, black] = [black, white]
    }

    return [white, black]
}