import { it, expect, describe } from 'vitest'
import { TestWebSocket, wsp } from './wsp'

export type LobbyActions = {
    hadd(time_control: string): Promise<void>,
    hjoin(id: string): Promise<void>,
    pull_hlist(): Promise<any>,
    pull_hadd(): Promise<any>,
    pull_hrem(): Promise<any>,
    pull_redirect(delay?: number): Promise<string>,
}

export type SiteActions = {}

export type RoundActions = {}

export type WebsiteActions = {
    page_lobby(op: (_: LobbyActions) => Promise<void>): Promise<void>,
    page_site(op: (_: SiteActions) => Promise<void>): Promise<void>,
    page_round(id: string, op: (_: RoundActions) => Promise<void>): Promise<void>
}

export function mwac(op: (_: WebsiteActions) => Promise<void>) {
        return wsp(async tws =>
            op({
                async page_lobby(op) {
                    return op(await lobby_actions(tws))
                },
                async page_site(op) {
                    return op(await site_actions(tws))
                },
                async page_round(id, op) {
                    return op(await round_actions(id, tws))
                }
            })
        )
}

export async function round_actions(id: string, tws: TestWebSocket) {
    tws.path(`round$${id}`)
    return {}
}

export async function site_actions(tws: TestWebSocket) {
    tws.path('site')
    return {}
}

export async function lobby_actions(tws: TestWebSocket) {
    tws.path('lobby')
    return {
        async hadd(time_control: string) {
            tws.send({t: 'hadd', d: time_control})
        },
        async hjoin(id: string): Promise<void> {
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

it.only('works', async () => {

    await mwac(async wac => {

        let game_redirect

        await wac.page_lobby(async lobby => {

            await lobby.hadd('threetwo')

            let hadd = await lobby.pull_hadd()

            expect(hadd).toBeTruthy()

            await mwac(async wac2 => {
                await wac2.page_lobby(async l2 => {
                    await l2.hjoin(hadd.id)
                })
            })

            game_redirect = await lobby.pull_redirect(1000)

            expect(game_redirect).toBeTruthy()
        })

        await wac.page_round(game_redirect, async round => {

        })


    })

})