import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
const css=readFileSync(resolve(process.cwd(),'app/guestbook/guestbook.css'),'utf8')
function shell(){document.head.innerHTML='<style>'+css+'</style>';document.body.innerHTML='<main class="wrap guestbook-page"><article class="guestbook-sheet"><div class="guestbook-list"><article class="comment letter crafted-letter"><time class="letter-date">中文落款</time></article></div></article></main><section class="guestbook-immersive-sheet"><div class="guestbook-sheet-write"><textarea class="guestbook-immersive-textarea"></textarea></div></section>'}
afterEach(()=>{document.head.innerHTML='';document.body.innerHTML='';document.documentElement.removeAttribute('data-theme')})
it('ends the paper with content without a fixed empty lower band',()=>{shell();expect(getComputedStyle(document.querySelector('.guestbook-page')!).paddingBottom).toBe('0px');expect(getComputedStyle(document.querySelector('.crafted-letter')!).minHeight).toBe('0')})
it('displays the Chinese date as plain text without a frame',()=>{shell();const style=getComputedStyle(document.querySelector('.letter-date')!);expect(style.borderTopWidth).toBe('');expect(style.boxShadow).toBe('')})
it('gives long writing one scroll container and bounds the dialog to the viewport',()=>{shell();expect(getComputedStyle(document.querySelector('.guestbook-sheet-write')!).overflowY).toBe('auto');expect(getComputedStyle(document.querySelector('.guestbook-immersive-textarea')!).overflowY).toBe('hidden');expect(getComputedStyle(document.querySelector('.guestbook-immersive-sheet')!).maxHeight).toBe('calc(100dvh - 32px)')})
it('keeps the script font self hosted and split into unicode subsets',()=>{expect(css).toContain('/fonts/hongleixingshu/font.css');const font=readFileSync(resolve(process.cwd(),'public/fonts/hongleixingshu/font.css'),'utf8');expect(font.match(/unicode-range:/g)?.length??0).toBeGreaterThan(50)})
