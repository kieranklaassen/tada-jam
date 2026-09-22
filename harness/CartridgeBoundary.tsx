import { Component, type ReactNode } from 'react'

// Crash containment in the shape Tada's shell promises: a Mount that throws
// during render is silently remounted (its state comes back from the last
// save), and three crashes inside thirty seconds park it instead of looping.

export const MAX_CRASHES = 3
export const CRASH_WINDOW_MS = 30_000

type Props = {
  children: ReactNode
  onPark: () => void
  onCrash?: (error: unknown) => void
}

type State = { generation: number; crashed: boolean }

export class CartridgeBoundary extends Component<Props, State> {
  state: State = { generation: 0, crashed: false }
  private crashes: number[] = []

  static getDerivedStateFromError(): Partial<State> {
    return { crashed: true }
  }

  componentDidCatch(error: unknown): void {
    this.props.onCrash?.(error)
    const now = Date.now()
    this.crashes = this.crashes.filter((at) => now - at < CRASH_WINDOW_MS)
    this.crashes.push(now)
    if (this.crashes.length > MAX_CRASHES) {
      this.crashes = []
      this.props.onPark()
    }
    this.setState((state) => ({ generation: state.generation + 1, crashed: false }))
  }

  render(): ReactNode {
    if (this.state.crashed) return null
    return <div key={this.state.generation} style={{ position: 'absolute', inset: 0 }}>{this.props.children}</div>
  }
}
