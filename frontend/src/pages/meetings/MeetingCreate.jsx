import { useState } from 'react';
import { Copy, Link as LinkIcon, Plus, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../../services/api.js';

export default function MeetingCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [callType, setCallType] = useState('group');
  const [inviteeUsername, setInviteeUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [meetingId, setMeetingId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function create(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/meetings', {
        title,
        callType,
        inviteeUsername: inviteeUsername.trim() || undefined,
        accessCode: accessCode.trim() || undefined,
        waitingRoom,
      });
      navigate(`/meetings/${data.meeting.roomId}`);
    } catch (requestError) {
      setError(getApiError(requestError, 'Please sign in before creating a meeting'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="meeting-create">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="brand-mark" style={{ margin: '0 auto 1rem', width: '3rem', height: '3rem' }}>
          <Video size={24} />
        </div>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>Start a Private Meeting</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Google Meet-style end-to-end calling with host approval and media controls.
        </p>
      </div>

      <form className="meeting-form" onSubmit={create}>
        <label>
          Call Type
          <select value={callType} onChange={(e) => setCallType(e.target.value)}>
            <option value="group">Group Meeting (Up to 5 participants)</option>
            <option value="one-to-one">One-to-One Call (2 people)</option>
          </select>
        </label>

        <label>
          Meeting Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Weekly Product Sync"
          />
        </label>

        <label>
          Invite Specific User (Optional)
          <input
            value={inviteeUsername}
            onChange={(e) => setInviteeUsername(e.target.value.toLowerCase())}
            pattern="[a-z0-9_]{3,30}"
            placeholder="username"
          />
          <small>Leave blank to allow any authenticated user with the link to request entry.</small>
        </label>

        <label>
          Meeting Password / Access Code (Optional)
          <input
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            minLength={4}
            maxLength={32}
            placeholder="At least 4 characters"
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={waitingRoom}
            onChange={(e) => setWaitingRoom(e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--accent-primary)' }}
          />
          <span>Enable Host Approval Waiting Room (Recommended)</span>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="button primary large" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
          <Plus size={18} /> {loading ? 'Creating Meeting…' : 'Start Instant Meeting'}
        </button>
      </form>

      {/* Join By Link or ID Box */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '2.5rem',
          paddingTop: '1.75rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Have a Meeting ID or Link?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
          Enter the room code shared with you to ask for entry into the call.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (meetingId.trim()) navigate(`/meetings/${meetingId.trim().replace(/^.*\/meetings\//, '')}`);
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="e.g. Qq86dxgs3zQNKZAR"
            required
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              padding: '0.65rem 0.85rem',
              outline: 'none',
              fontSize: '0.85rem',
            }}
          />
          <button className="button secondary">
            <LinkIcon size={15} /> Join
          </button>
        </form>
      </div>
    </div>
  );
}
