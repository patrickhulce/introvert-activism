import * as React from 'react'
import {render, unmountComponentAtNode} from 'react-dom'

function getOrCreateDiv(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (el) return el

  const div = document.createElement('div')
  div.id = id
  document.body.appendChild(div)
  return div
}

async function renderApp(): Promise<void> {
  const AppComponent = require('./app').App // eslint-disable-line @typescript-eslint/no-var-requires
  const root = getOrCreateDiv('react-root')
  unmountComponentAtNode(root)

  render(<AppComponent />, root)
}

function listenForHotModuleUpdates(): void {
  const moduleAsAny = module as any
  if (moduleAsAny.hot) {
    moduleAsAny.hot.accept(() => renderApp())
  }
}

function initialze(): void {
  renderApp()
  listenForHotModuleUpdates()
}

initialze()
