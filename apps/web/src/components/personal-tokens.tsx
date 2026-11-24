'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatDay, formatFull } from '@/lib/format';
import { send } from '@/lib/mutate';
import { TOKEN_NAME_MAX, type TokenView } from '@/lib/token-view';
import { Dialog } from './dialog';
import { Icon } from './icons';

interface Created {
  token: string;
  name: string;
}

function usage(token: TokenView, now: Date): string {
  const created = `Créé le ${formatDay(token.createdAt, now)}`;
  return token.lastUsedAt
    ? `${created} · Utilisé le ${formatDay(token.lastUsedAt, now)}`
    : `${created} · Jamais utilisé`;
}

// Tokens that let another app of the owner read the notes and send raw text. A new token is
// shown once, with a copy button; afterwards only its name and dates remain.
export function PersonalTokens({ initial, now }: { initial: TokenView[]; now: string }) {
  const [tokens, setTokens] = useState(initial);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [revoking, setRevoking] = useState<TokenView | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const valueRef = useRef<HTMLElement>(null);
  const warningId = useId();
  const errorId = useId();
  const refocusName = useRef(false);
  const today = new Date(now);

  // After a revocation the dialog closes and gives focus back to its trigger, which is gone
  // with its row. This parent effect runs after the dialog's own, so the form gets it.
  useEffect(() => {
    if (refocusName.current) {
      refocusName.current = false;
      nameRef.current?.focus();
    }
  });

  // The copy button only exists once the new token is rendered: focus it from an effect, not
  // from a frame callback that can run before React commits.
  useEffect(() => {
    if (created) {
      copyRef.current?.focus();
    }
  }, [created]);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError('Donne un nom au jeton, par exemple celui de l’app qui l’utilisera.');
      nameRef.current?.focus();
      return;
    }
    setCreating(true);
    setCreateError(null);
    const result = await send<{ token: string; record: TokenView }>(
      '/api/tokens',
      'POST',
      { name: trimmed },
      'Jeton pas créé. Réessaie.',
    );
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.message);
      return;
    }
    setTokens((current) => [result.data.record, ...current]);
    setCreated({ token: result.data.token, name: result.data.record.name });
    setCopied('idle');
    setStatus('');
    setName('');
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied('done');
    } catch {
      const value = valueRef.current;
      if (value) window.getSelection()?.selectAllChildren(value);
      setCopied('failed');
    }
  }

  function closeRevoke() {
    setRevoking(null);
    setRevokeError(null);
  }

  async function revoke() {
    if (!revoking) return;
    const target = revoking;
    const result = await send(
      `/api/tokens/${target.id}`,
      'DELETE',
      undefined,
      'Jeton pas révoqué. Réessaie.',
    );
    if (!result.ok) {
      setRevokeError(result.message);
      return;
    }
    closeRevoke();
    setTokens((current) => current.filter((token) => token.id !== target.id));
    setStatus(`Jeton « ${target.name} » révoqué.`);
    refocusName.current = true;
  }

  return (
    <div className="tokens">
      <form
        className="token-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <label className="field-label" htmlFor="token-name">
          Nom du jeton
        </label>
        <div className="token-form-row">
          <input
            ref={nameRef}
            id="token-name"
            className="field"
            name="name"
            value={name}
            maxLength={TOKEN_NAME_MAX}
            autoComplete="off"
            placeholder="Ex. : Tableau de bord"
            aria-invalid={createError ? true : undefined}
            aria-describedby={createError ? errorId : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="button" disabled={creating}>
            {creating ? 'Création…' : 'Créer un jeton'}
          </button>
        </div>
        {createError ? (
          <p className="form-error" id={errorId} role="alert">
            {createError}
          </p>
        ) : null}
      </form>

      {created ? (
        <div className="token-reveal" role="group" aria-label={`Nouveau jeton « ${created.name} »`}>
          <p className="token-warning" id={warningId}>
            Copie ce jeton maintenant : il ne sera plus affiché.
          </p>
          <code className="token-value" ref={valueRef}>
            {created.token}
          </code>
          <div className="token-reveal-actions">
            <button
              ref={copyRef}
              type="button"
              className="button button-small"
              aria-describedby={warningId}
              onClick={() => void copy()}
            >
              <Icon name={copied === 'done' ? 'check' : 'copy'} size={14} />
              {copied === 'done' ? 'Copié' : 'Copier'}
            </button>
            <button
              type="button"
              className="button button-quiet button-small"
              onClick={() => {
                setCreated(null);
                nameRef.current?.focus();
              }}
            >
              Masquer
            </button>
            <p className="token-copy-status" aria-live="polite">
              {copied === 'done' ? <span className="sr-only">Jeton copié.</span> : null}
              {copied === 'failed'
                ? 'Copie impossible : le jeton est sélectionné, copie-le à la main.'
                : null}
            </p>
          </div>
        </div>
      ) : null}

      {tokens.length === 0 ? (
        <p className="settings-help token-empty">Aucun jeton pour l’instant.</p>
      ) : (
        <ul className="token-list" aria-label="Jetons">
          {tokens.map((token) => (
            <li key={token.id} className="token-row">
              <div className="token-text">
                <p className="token-name">{token.name}</p>
                <p
                  className="token-meta"
                  title={
                    token.lastUsedAt
                      ? `Dernière utilisation : ${formatFull(token.lastUsedAt)}`
                      : undefined
                  }
                >
                  {usage(token, today)}
                </p>
              </div>
              <button
                type="button"
                className="button button-quiet button-small"
                aria-label={`Révoquer « ${token.name} »`}
                onClick={() => setRevoking(token)}
              >
                Révoquer
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <Dialog
        open={revoking !== null}
        onClose={closeRevoke}
        title="Révoquer ce jeton"
        description={
          revoking
            ? `L’app qui utilise « ${revoking.name} » n’aura plus accès à tes notes. Un jeton révoqué ne revient pas : il faudra en créer un autre.`
            : undefined
        }
      >
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            void revoke();
          }}
        >
          {revokeError ? (
            <p className="form-error" role="alert">
              {revokeError}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={closeRevoke}>
              Annuler
            </button>
            <button type="submit" className="button button-danger">
              Révoquer
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
