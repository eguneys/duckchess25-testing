import { it, expect, describe } from 'vitest'
import { rp } from './wsp'



it('bad move', async () => {

    let [white, black] = await rp()

    white.move('e2@e2e5')
     
    expect(await white.pull_reload()).toBeTruthy()

})