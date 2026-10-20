
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  deleteClanResourceSubmission,
  getClanResourceSubmissions,
  submitClanResources,
  verifyClanResourceAdmin,
  type ClanResourceSubmission,
} from '../../services/clanResourceSubmissions';

const FIELDS = [
  { key: 'food', label: 'Yemek' },
  { key: 'wood', label: 'Odun' },
  { key: 'stone', label: 'Taş' },
  { key: 'iron', label: 'Demir' },
  { key: 'gold', label: 'Altın' },
] as const;

type Props = { adminMode?: boolean };

export function ClanResourcePanel({ adminMode = false }: Props) {
  const [showAdmin, setShowAdmin] = useState(adminMode);
  const [name, setName] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({
    food: '', wood: '', stone: '', iron: '', gold: '',
  });
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [rows, setRows] = useState<ClanResourceSubmission[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async (secret: string) => {
    const result = await getClanResourceSubmissions(secret);
    setRows(result);
  }, []);

  useEffect(() => {
    if (!showAdmin || !loggedIn) return;
    let active = true;
    getClanResourceSubmissions(password)
      .then(result => { if (active) setRows(result); })
      .catch(error => {
        if (active) setMessage(error instanceof Error ? error.message : 'Kayıtlar yüklenemedi.');
      });
    return () => { active = false; };
  }, [showAdmin, loggedIn, password]);

  async function sendResources(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const resources: Record<string, number> = {};
    for (const field of FIELDS) {
      const raw = amounts[field.key].trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setMessage(`${field.label}: sıfır veya daha büyük bir sayı gir.`);
        return;
      }
      resources[field.key] = value;
    }

    if (!Object.keys(resources).length) {
      setMessage('En az bir kaynak miktarı gir.');
      return;
    }

    setBusy(true);
    try {
      await submitClanResources(name, resources);
      setMessage('Kaynakların gönderildi.');
      setName('');
      setAmounts({ food: '', wood: '', stone: '', iron: '', gold: '' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gönderim başarısız.');
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const valid = await verifyClanResourceAdmin(password);
      if (!valid) {
        setLoggedIn(false);
        setMessage('Şifre yanlış.');
        return;
      }
      setLoggedIn(true);
      await refresh(password);
      setMessage('Yönetici girişi başarılı.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Giriş başarısız.');
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(id: string) {
    if (!window.confirm('Bu kaynak kaydını silmek istiyor musun?')) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteClanResourceSubmission(password, id);
      await refresh(password);
      setMessage('Kayıt silindi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kayıt silinemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (showAdmin) {
    return (
      <section className="space-y-4 rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
  <div className="flex flex-wrap items-center justify-between gap-2">
  <h2 className="text-xl font-semibold">Klan Kaynak Yönetimi</h2>
  <button
    type="button"
    onClick={() => {
      setShowAdmin(false);
      setLoggedIn(false);
      setPassword('');
      setRows([]);
      setMessage('');
    }}
    className="rounded-lg border border-white/20 px-3 py-2 text-sm"
  >
    Üye ekranına dön
  </button>
</div>
        {!loggedIn ? (
          <form onSubmit={login} className="flex flex-wrap gap-2">
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Yönetici şifresi"
              autoComplete="current-password"
              required
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
            <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
              {busy ? 'Kontrol ediliyor…' : 'Giriş'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => refresh(password).catch(error => setMessage(String(error)))}
              className="rounded-lg border border-white/20 px-3 py-2"
            >
              Yenile
            </button>
            {rows.length === 0 ? <p>Henüz kaynak kaydı yok.</p> : rows.map(row => (
              <article key={row.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{row.member_name}</strong>
                  <time className="text-sm opacity-70">
                    {new Date(row.submitted_at).toLocaleString('tr-TR')}
                  </time>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(row.resources).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm opacity-70">{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeRow(row.id)}
                  className="mt-3 rounded-lg border border-red-500/40 px-3 py-1 text-sm text-red-300"
                >
                  Kaydı sil
                </button>
              </article>
            ))}
          </div>
        )}
        {message && <p role="status" className="text-sm">{message}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
  <h2 className="text-xl font-semibold">Klan Kaynaklarını Gönder</h2>
  <button
    type="button"
    onClick={() => {
      setShowAdmin(true);
      setMessage('');
    }}
    className="rounded-lg border border-white/20 px-3 py-2 text-sm"
  >
    Yönetici girişi
  </button>
</div>
      <p className="text-sm opacity-75">
        Gönderdiğin kayıt diğer üyeler tarafından görüntülenmez; yönetici panelinde listelenir.
      </p>
      <form onSubmit={sendResources} className="space-y-3">
        <label className="block text-sm">
          Oyun içi adın
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={60}
            required
            className="mt-1 block w-full rounded-lg border border-white/20 bg-transparent px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FIELDS.map(field => (
            <label key={field.key} className="block text-sm">
              {field.label}
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={amounts[field.key]}
                onChange={event => setAmounts(old => ({
                  ...old, [field.key]: event.target.value,
                }))}
                className="mt-1 block w-full rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Gönderiliyor…' : 'Kaynakları gönder'}
        </button>
      </form>
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  );
}
