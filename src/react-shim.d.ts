import { JSX as PreactJSX, VNode, ComponentChild, ComponentChildren } from 'preact'

declare global {
  namespace React {
    type ReactNode = ComponentChild
    type ReactElement = VNode<any>
    type JSXElementConstructor<P> = (props: P) => VNode<any> | null
    interface ReactPortal { children: ComponentChild }
  }
  namespace JSX {
    interface IntrinsicElements extends PreactJSX.IntrinsicElements {}
    interface ElementAttributesProperty { props: {} }
    interface ElementChildrenAttribute { children: {} }
  }
}

export {}
