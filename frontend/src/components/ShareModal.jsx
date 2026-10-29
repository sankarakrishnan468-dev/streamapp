import { useState } from 'react';
import { Check, Copy, MessageCircle, Send, Share2, Twitter, X } from 'lucide-react';

/* ── Brand SVG icons ─────────────────────────────────────────────────── */
function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 2C8.28 2 2 8.28 2 16c0 2.48.65 4.8 1.78 6.82L2 30l7.38-1.73A13.93 13.93 0 0 0 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.42 11.42 0 0 1-5.82-1.6l-.42-.25-4.38 1.02 1.05-4.25-.28-.44A11.47 11.47 0 0 1 4.5 16C4.5 9.65 9.65 4.5 16 4.5S27.5 9.65 27.5 16 22.35 27.5 16 27.5zm6.3-8.57c-.35-.17-2.05-1.01-2.37-1.13-.32-.11-.55-.17-.78.18-.23.34-.9 1.13-1.1 1.36-.2.23-.4.26-.75.09-.35-.18-1.47-.54-2.8-1.73-1.04-.92-1.74-2.06-1.94-2.41-.2-.34-.02-.53.15-.7.15-.15.35-.4.52-.6.18-.2.23-.34.35-.57.12-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.68-.57-.58-.78-.59l-.67-.01c-.23 0-.6.09-.91.43-.32.34-1.2 1.17-1.2 2.86 0 1.68 1.23 3.31 1.4 3.54.17.23 2.42 3.7 5.86 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.05-.84 2.34-1.65.29-.81.29-1.5.2-1.65-.08-.14-.3-.23-.65-.4z"/>
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

/* ── Modern Premium Share Modal ───────────────────────────────────────── */
export default function ShareModal({ url, title, onClose }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — Join my private meeting: ${url}`);

  const platforms = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      bg: 'rgba(37, 211, 102, 0.12)',
      border: 'rgba(37, 211, 102, 0.3)',
      icon: <WhatsAppIcon />,
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      id: 'twitter',
      label: 'X (Twitter)',
      color: '#ffffff',
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.15)',
      icon: <TwitterIcon />,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      color: '#E1306C',
      bg: 'rgba(225, 48, 108, 0.12)',
      border: 'rgba(225, 48, 108, 0.3)',
      icon: <InstagramIcon />,
      action: 'copy',
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  function handlePlatform(platform) {
    if (platform.action === 'copy') {
      copyLink();
    } else {
      window.open(platform.href, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#141722',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.2)',
          padding: '1.75rem',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', backgroundColor: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Share2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>Invite Participants</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Anyone with this private link can ask to join</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.35rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Meeting Link Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#090a0f',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            padding: '0.4rem 0.5rem 0.4rem 0.85rem',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: '0.82rem',
              color: '#cbd5e1',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {url}
          </span>
          <button
            onClick={copyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
              backgroundColor: copied ? '#10b981' : '#4f46e5',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Direct Social Share Buttons */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
            Share directly to
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePlatform(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 0.5rem',
                backgroundColor: p.bg,
                border: `1px solid ${p.border}`,
                borderRadius: '0.75rem',
                color: p.color,
                cursor: 'pointer',
                transition: 'transform 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {p.icon}
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#f8fafc' }}>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Tip Banner */}
        <div
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '0.625rem',
            padding: '0.75rem 1rem',
            fontSize: '0.78rem',
            color: '#a5b4fc',
            lineHeight: 1.45,
          }}
        >
          💡 <strong>Tip:</strong> Guests can join from any modern web browser without installing additional plugins.
        </div>
      </div>
    </div>
  );
}
