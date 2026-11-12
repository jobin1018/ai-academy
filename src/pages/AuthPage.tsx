import { LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/layout/AppShell';
import { Button, Card } from '@/components/ui/primitives';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/context';

export default function AuthPage() {
  const { chooseLocal } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const res = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error.message });
    else if (mode === 'up' && !res.data.session) setMsg({ ok: true, text: 'Check your inbox to confirm your email, then sign in.' });
  };
  const magic = async () => {
    if (!supabase || !email) return setMsg({ ok: false, text: 'Enter your email first.' });
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Magic link sent. Open it on this device.' });
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">{mode === 'in' ? 'Sign in to continue' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-muted">Your progress, notes and achievements sync across every device you sign in on.</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-muted">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-3.5 text-[15px] text-ink focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20" /></label>
            <label className="block text-xs font-medium text-muted">Password<input type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-3.5 text-[15px] text-ink focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20" /></label>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}><LogIn size={16} /> {mode === 'in' ? 'Sign in' : 'Sign up'}</Button>
          </form>
          <Button variant="secondary" className="mt-2.5 w-full" onClick={magic} disabled={busy}><Mail size={15} /> Email me a magic link</Button>
          {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? 'text-accent' : 'text-danger'}`}>{msg.text}</p>}
          <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="mt-4 text-sm text-muted hover:text-ink">{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
        </Card>
        <div className="mt-5 text-center">
          <button onClick={chooseLocal} className="text-sm text-muted underline decoration-line2 underline-offset-4 hover:text-ink">Use on this device only (no sync)</button>
          <p className="mt-1 text-xs text-faint">Progress stays in this browser and will not appear on your other devices.</p>
        </div>
      </div>
    </div>
  );
}
