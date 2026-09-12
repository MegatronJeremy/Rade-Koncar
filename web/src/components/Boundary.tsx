import { Component, type ReactNode } from "react";

/**
 * Renders nothing instead of taking the page down.
 *
 * A useQuery for a function the deployment does not have yet throws during
 * render, and an unguarded throw blanks everything. That happened once already:
 * a new query shipped ahead of its Convex deploy and the whole site went dark.
 * Anything optional goes behind one of these, so the grid, the prompt and the
 * pinned run survive a partial deploy.
 */
export class Boundary extends Component<{ readonly children: ReactNode; readonly what: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.warn(`[${this.props.what}] unavailable:`, error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
