import { Component, Suspense, lazy, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Button, Card, LinkButton } from '@/components/ui/primitives';
import { AppShell } from '@/layout/AppShell';
import { AppProviders, useProgress } from '@/store/context';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';

// Heavier / less frequent screens load on demand.
const DayPage = lazy(() => import('@/pages/DayPage'));
const FocusPage = lazy(() => import('@/pages/FocusPage'));
const CompletePage = lazy(() => import('@/pages/CompletePage'));
const BossPage = lazy(() => import('@/pages/BossPage'));
const JourneyPage = lazy(() => import('@/pages/JourneyPage'));
const LibraryPage = lazy(() => import('@/pages/LibraryPage'));
const JournalPage = lazy(() => import('@/pages/JournalPage'));
const SkillsPage = lazy(() => import('@/pages/SkillsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const GuidePage = lazy(() => import('@/pages/GuidePage'));

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-[60dvh] place-items-center px-4">
        <Card className="max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong on this screen</h1>
          <p className="mt-2 text-sm text-muted">Your progress is safe: it is saved before anything renders. {this.state.error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            {/* A plain anchor: this boundary sits outside the router, so router links are unavailable here. */}
            <a href="/" className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accentink">Mission Control</a>
          </div>
        </Card>
      </div>
    );
  }
}

export function Loading() {
  return (
    <div className="grid min-h-[40dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted"><span className="h-5 w-5 animate-spin rounded-full border-2 border-line2 border-t-accent" /> Loading…</div>
    </div>
  );
}

/** Applies the saved theme to <html> and remembers it for the next load (avoids a flash). */
function ThemeSync() {
  const { theme } = useProgress().settings;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('aeq:theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return null;
}

function NotFound() {
  return (
    <Card className="mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-semibold">Page not found</h1><LinkButton to="/" variant="primary" className="mt-4">Mission Control</LinkButton></Card>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProviders fallback={(s) => (s.kind === 'loading' ? <Loading /> : <AuthPage />)}>
          <ThemeSync />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="journey" element={<JourneyPage />} />
                <Route path="day/:n" element={<DayPage />} />
                <Route path="day/:n/complete" element={<CompletePage />} />
                <Route path="day/:n/focus" element={<FocusPage />} />
                <Route path="day/:n/:step" element={<DayPage />} />
                <Route path="boss/:id" element={<BossPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="journal" element={<JournalPage />} />
                <Route path="skills" element={<SkillsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="guide" element={<GuidePage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
