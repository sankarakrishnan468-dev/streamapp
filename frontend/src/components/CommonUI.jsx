import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
      <Loader2 size={32} className="animate-spin text-purple-500" style={{ marginBottom: '0.75rem' }} />
      <span style={{ fontSize: '0.875rem' }}>{message}</span>
    </div>
  );
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.85rem 1.25rem', borderRadius: '0.625rem', margin: '1rem 0', fontSize: '0.875rem' }}>
      <AlertCircle size={18} style={{ shrink: 0, color: '#ef4444' }} />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description = '', action = null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', backgroundColor: '#141722', borderRadius: '0.875rem', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', margin: '1.5rem 0' }}>
      <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '1rem' }}>
        <Inbox size={24} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.35rem' }}>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '380px', margin: '0 0 1.25rem' }}>{description}</p>}
      {action}
    </div>
  );
}

