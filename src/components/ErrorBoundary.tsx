import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorPage } from '../pages/ErrorPage';
import { isChunkLoadError, reloadForNewVersion } from '../utils/chunkReload';

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
  failed: boolean;
}

/**
 * Catches render errors so one broken page shows a recovery screen instead of
 * a blank app. Needed because errorElement only works with data routers, and
 * this app uses BrowserRouter.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, failed: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    if (isChunkLoadError(error)) reloadForNewVersion();
  }

  render() {
    if (this.state.failed) return <ErrorPage error={this.state.error} />;
    return this.props.children;
  }
}
