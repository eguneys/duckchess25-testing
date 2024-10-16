import { it, expect, describe } from 'vitest'
import { wac, get } from './wsp'


describe('round', () => {
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


    it.only('gets white or black', async () => {

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

        let t = await get(game_redirect, w.sid)
        let t2 = await get(game_redirect, w2.sid)

        expect(t.text.includes('Your Turn') || t2.text.includes('Your Turn')).toBeTruthy()

        let is_white = t.text.includes('Your Turn')

        let [white, black] = [w, w2]
        if (!is_white) {
            [white, black] = [black, white]
        }

        white.move('e3@e2e4')

        let move = await black.pull_move()

        expect(move).toBeTruthy()
        expect(move).toStrictEqual(await white.pull_move())

        await Promise.all([w.close(), w2.close()])
    })

})