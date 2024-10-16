import { it, expect, describe } from 'vitest'
import { TestWebSocket, wsp } from './wsp'

export type LobbyActions = {
    hadd(time_control: string): void,
    hjoin(id: string): void,
    pull_hlist(): Promise<any>,
    pull_hadd(): Promise<any>,
    pull_hrem(): Promise<any>,
    pull_redirect(delay?: number): Promise<string>,
}

export type SiteActions = {}

export type RoundActions = {}

export type WebsiteActions = {
    page_lobby(): void
    page_site(): void
    page_round(id: string): void
}

async function wac(): Promise<TestWebSocket & LobbyActions & SiteActions & RoundActions & WebsiteActions> {
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
            tws.path(`round$${id}`)
        }
    }
}

function round_actions(tws: TestWebSocket): RoundActions {
    return {}
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

describe('round', { retry: 8}, () => {
    it('works', async () => {

        let w = await wac()

        w.page_lobby()
        w.hadd('threetwo')

        let hadd = await w.pull_hadd()

        expect(hadd).toBeTruthy()

        let w2 = await wac()
        w2.page_lobby()
        w2.hjoin(hadd.id)

        let game_redirect = await w.pull_redirect()

        expect(game_redirect).toBeTruthy()

        await w.page_round(game_redirect)


        await Promise.all([w.close(), w2.close()])
    })


    it('works', async () => {

        let w = await wac()
        let w2 = await wac()

        w.page_lobby()
        w2.page_lobby()

        w.hadd('threetwo')
        let hadd = await w.pull_hadd()
        w2.hjoin(hadd.id)

        let game_redirect = await w.pull_redirect()

        expect(game_redirect).toBeTruthy()

        await w.page_round(game_redirect)
        await w2.page_round(game_redirect)


        await Promise.all([w.close(), w2.close()])
    })

})