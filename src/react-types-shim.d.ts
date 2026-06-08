import * as preact from 'preact'

declare global {
  namespace React {
    interface ReactPortal extends preact.VNode<any> {}
  }
}

export {}
