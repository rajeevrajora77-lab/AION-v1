import React from 'react';

export function MemoryPanel() { return null; }
export function ToolStatusBar() { return null; }
export function ModelBadge({ tier }: { tier: string }) { return <span className="ml-2 text-xs bg-gray-200 px-1 rounded">{tier}</span>; }

export class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div>Something went wrong. <button onClick={() => this.setState({ hasError: false })}>Retry</button></div>;
    return this.props.children;
  }
}

export function MockModeBanner() { return null; }
export function OfflineIndicator() { return null; }
export function SkeletonLoader() { return <div className="animate-pulse bg-gray-200 h-10 w-full rounded"></div>; }
