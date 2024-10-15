import { it, expect, describe } from 'vitest'
import { WebSocket } from 'ws'
import { TestWebSocket, wsp, wsp2, url } from './wsp'

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



it('pings at first', async () => {
    await new Promise<void>(resolve => {
        let ws = new WebSocket(`${url}/_ws`)

        ws.onmessage = (e) => {
            expect(e.data).toBe("0")
            ws.close()
        }
        ws.onopen = () => {
            //ws.send('ping')
        }
        ws.onclose = () => {
            resolve()
        }

    })
    expect(3).toBe(3)
})

it('pings on ping', async () => {
    await wsp(async (tws: TestWebSocket) => {
        tws.send('ping')
        let response = await tws.receive(100)

        expect(response).toStrictEqual([0, 0])
    })
})

it('joins lobby', async () => {
    await wsp(async (tws: TestWebSocket) => {
        tws.path('lobby')
        let response = await tws.receive()

        expect(response).toStrictEqual([0, { t: 'n', d: 1, r: 0 }, { t: 'hlist', d: [] }])
    })
})


it('joins lobby 2', async () => {
    await wsp2(async (a, b) => {
        a.path('lobby')

        let response = await a.receive()
        expect(response).toStrictEqual([0, { t: 'n', d: 2, r: 0 }, { t: 'hlist', d: [] }])

    })
})


it('creates hooks', async () => {
    await wsp(async (a) => {
        a.path('lobby')

        a.send({ t: 'hadd', d: 'tenzero' })
        let response = await a.receive(1000)
        let hadd = response.find(_ => typeof _ === 'object' && _.t === 'hadd')
        expect(hadd).toBeTruthy()
        expect(hadd.d.clock).toBe("tenzero")
        expect(hadd.d.u).toBeTruthy()
        expect(hadd.d.rating).toBe(1500)


        await wsp(async (b) => {
            b.path('lobby')

            expect(await b.pull_t('hlist')).toStrictEqual([hadd.d])


        })
    })
})


it('removes hooks', async () => {
    await wsp(async (a) => {
        a.path('lobby')

        a.send({ t: 'hadd', d: 'tenzero' })

        let hadd = await a.pull_t('hadd')

        a.send({ t: 'hadd', d: 'tenzero' })


        let hrem = await a.pull_t('hrem')
        expect(hrem).toBeTruthy()
        expect(hrem).toStrictEqual([hadd.id])

    })

})


it('joins hooks', async () => {
    await wsp(async (a) => {
        a.path('lobby')
        await wsp(async (b) => {
            b.path('lobby')

            a.send({ t: 'hadd', d: 'tenzero' })

            let hadd = await b.pull_t('hadd')

            expect(hadd).toBeTruthy()

            b.send({ t: 'hjoin', d: hadd.id })


            let br = await b.pull_t('game_redirect')
            let ar = await a.pull_t('game_redirect')

            expect(ar).toBeTruthy()
            expect(ar).toStrictEqual(br)
        })
    })
})