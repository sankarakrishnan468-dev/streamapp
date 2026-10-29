import { useEffect, useState } from 'react';
import { AlertCircle, Check, Sparkles, User, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, getApiError } from '../services/api.js';
import { Shell } from '../App.jsx';

export default function ProfileSettings() {
  const [form, setForm] = useState({ name: '', username: '', bio: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) =>
        setForm({
          name: data.user.name || '',
          username: data.user.username || '',
          bio: data.user.bio || '',
        })
      )
      .catch((err) => setError(getApiError(err, 'Sign in to edit your profile')))
      .finally(() => setLoading(false));
  }, []);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setStatus('');
    setError('');
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', form);
      setForm({
        name: data.user.name,
        username: data.user.username,
        bio: data.user.bio || '',
      });
      setStatus('Profile updated successfully!');
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setError(getApiError(err, 'Unable to update profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '1.5rem auto', padding: '0 1rem' }}>
        {/* Header Breadcrumb */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#818cf8',
              marginBottom: '0.35rem',
            }}
          >
            <User size={13} /> Account Settings
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Edit Profile
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Update your public display name, handle, and channel bio across live streams, meetings, and chat.
          </p>
        </div>

        {/* Profile Card Container */}
        <div
          style={{
            backgroundColor: '#141722',
            borderRadius: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '2rem',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              Loading profile details...
            </div>
          ) : error && !form.name && !form.username ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: '#ef4444',
                }}
              >
                <UserRound size={26} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.5rem' }}>
                Sign in to edit your profile
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Your personal preferences and settings become available once you sign in.
              </p>
              <Link to="/login" className="button primary" style={{ display: 'inline-block', padding: '0.65rem 1.75rem' }}>
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Avatar Preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    width: '4.25rem',
                    height: '4.25rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                    border: '2px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {form.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                    {form.name || 'Your Name'}
                  </div>
                  <div style={{ color: '#818cf8', fontSize: '0.85rem' }}>
                    @{form.username || 'username'}
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '0.35rem',
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    Active Account
                  </span>
                </div>
              </div>

              {/* Display Name Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '0.45rem',
                  }}
                >
                  Display Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g. Sankarakrishnan"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.625rem',
                    backgroundColor: '#090a0f',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  The name displayed to participants during meetings and live chat.
                </span>
              </div>

              {/* Username Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '0.45rem',
                  }}
                >
                  Username Handle
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      color: '#64748b',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    @
                  </span>
                  <input
                    name="username"
                    value={form.username}
                    onChange={update}
                    required
                    pattern="[a-z0-9_]{3,30}"
                    placeholder="sankarakrishnan"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.2rem',
                      borderRadius: '0.625rem',
                      backgroundColor: '#090a0f',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Unique 3–30 characters, lowercase letters, numbers, and underscores only.
                </span>
              </div>

              {/* Bio Textarea */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '0.45rem',
                  }}
                >
                  Channel Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={update}
                  maxLength={500}
                  rows={4}
                  placeholder="Tell viewers and collaborators a bit about yourself..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.625rem',
                    backgroundColor: '#090a0f',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {form.bio.length} / 500
                  </span>
                </div>
              </div>

              {/* Alerts */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.625rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertCircle size={16} color="#ef4444" />
                  <span>{error}</span>
                </div>
              )}

              {status && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#6ee7b7',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.625rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <Check size={16} color="#10b981" />
                  <span>{status}</span>
                </div>
              )}

              {/* Submit Button */}
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="button primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    borderRadius: '0.625rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}
