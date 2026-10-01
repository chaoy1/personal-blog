import { describe, expect, it } from 'vitest'
import { getAboutSections } from '@/lib/about-content'

describe('getAboutSections', () => {
  it('distributes the saved plain prose without losing or duplicating paragraphs', () => {
    const paragraphs = ['你好。', '写 **代码**。', '也写生活。', '留下痕迹。', '欢迎来信。']
    const result = getAboutSections(paragraphs.join('\r\n'))
    expect(result).toEqual({
      preface: paragraphs.slice(0, 3).join('\n\n'),
      traces: paragraphs[3],
      encounter: paragraphs[4],
      preserveParagraphs: true,
    })
  })

  it('keeps short or empty biographies together without supplying invented copy', () => {
    expect(getAboutSections('  自己写的简介。  ')).toEqual({
      preface: '自己写的简介。', traces: '', encounter: '', preserveParagraphs: true,
    })
    expect(getAboutSections(' \n ')).toEqual({
      preface: '', traces: '', encounter: '', preserveParagraphs: true,
    })
  })

  it.each([
    '# 我的自序\n\n第一段\n\n第二段\n\n第三段\n\n第四段\n\n第五段',
    '开场\n\n- 第一项\n- 第二项\n\n结尾',
    '代码\n\n```js\nconst text = "\n\n"\n```\n\n末尾',
    '引用\n\n> 不要拆开\n> 这段引用',
    '| 标题 | 内容 |\n| --- | --- |\n| 一 | 二 |',
    '标题\n===\n\n正文',
    '开场\n\n    const indented = true\n\n末尾',
    '    const indented = true',
  ])('preserves authored Markdown blocks intact: %s', source => {
    expect(getAboutSections(source)).toEqual({
      preface: source, traces: '', encounter: '', preserveParagraphs: false,
    })
  })
})
