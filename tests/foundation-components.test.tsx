import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import Container from '@/components/Container'
import Section from '@/components/Section'

describe('foundation layout components', () => {
  afterEach(cleanup)

  it('renders a polymorphic container with an explicit width intent', () => {
    render(
      <Container as="main" size="wide" className="feature-shell">
        content
      </Container>,
    )

    const container = screen.getByRole('main')
    expect(container).toHaveTextContent('content')
    expect(container).toHaveClass('container', 'container-wide', 'feature-shell')
    expect(container).toHaveAttribute('data-container-size', 'wide')
  })

  it('renders a semantic section with an explicit rhythm intent', () => {
    render(
      <Section as="section" space="loose" className="feature-section">
        section content
      </Section>,
    )

    const section = document.querySelector('[data-section-space="loose"]')!
    expect(section).toHaveTextContent('section content')
    expect(section).toHaveClass('section', 'section-loose', 'feature-section')
    expect(section).toHaveAttribute('data-section-space', 'loose')
  })

  it('does not own page backgrounds or shadows', () => {
    const source = [
      readFileSync(resolve(process.cwd(), 'components/Container.tsx'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'components/Section.tsx'), 'utf8'),
    ].join('\n')
    expect(source).not.toMatch(/background|box-shadow/)
  })
})
