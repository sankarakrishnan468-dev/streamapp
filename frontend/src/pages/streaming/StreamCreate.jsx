import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Video, VideoOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../../services/api.js';

export default function StreamCreate() {
  const navigate = useNavigate();
  const preview = useRef(null);
  const media = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    thumbnailUrl: '',
    playbackUrl: '',
    visibility: 'public',
  });
  const [previewing, setPreviewing] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      media.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function startPreview() {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Media devices are not supported in this browser.');
        return;
      }

      // Check available devices first
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const hasVideo = devices.some((d) => d.kind === 'videoinput');
      const hasAudio = devices.some((d) => d.kind === 'audioinput');

      if (!hasVideo && !hasAudio) {
        setError('No camera or microphone found on your device.');
        return;
      }

      let stream = null;
      try {
        // Try getting both video and audio
        stream = await navigator.mediaDevices.getUserMedia({
          video: hasVideo,
          audio: hasAudio,
        });
      } catch (err) {
        // Fallback: try video-only if audio failed, or audio-only if video failed
        if (hasVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch {
            // Video-only failed
          }
        }
        if (!stream && hasAudio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          } catch {
            // Audio-only failed
          }
        }
        if (!stream) throw err;
      }

      media.current = stream;
      if (preview.current) {
        preview.current.srcObject = stream;
      }
      setPreviewing(true);
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Camera or microphone permission was denied. Please allow access in your browser settings.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError('No camera or microphone found on your system.');
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        setError('Camera or microphone is already in use by another application.');
      } else {
        setError(e.message || 'Camera and microphone are unavailable.');
      }
    }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/streams', form);
      media.current?.getTracks().forEach((track) => track.stop());
      navigate(`/live/${data.stream._id}/studio`);
    } catch (e) {
      setError(getApiError(e, 'Unable to create stream'));
    }
  }

  return (
    <div className="meeting-create">
      <div className="feature-icon">
        <Radio />
      </div>
      <h1>Start a live broadcast</h1>
      <p>Configure your title and visibility, preview your devices, then open the studio.</p>

      <div className="stream-preview">
        <video ref={preview} autoPlay muted playsInline />
        <button type="button" className="button ghost" onClick={startPreview}>
          {previewing ? 'Preview active' : 'Preview camera and microphone'}
        </button>
      </div>

      <form className="meeting-form" onSubmit={submit}>
        <label>
          Title
          <input name="title" value={form.title} onChange={update} required />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={update} />
        </label>
        <label>
          Category
          <input name="category" value={form.category} onChange={update} />
        </label>
        <label>
          Thumbnail URL
          <input
            name="thumbnailUrl"
            value={form.thumbnailUrl}
            onChange={update}
            placeholder="https://..."
          />
        </label>
        <label>
          HLS playback URL
          <input
            name="playbackUrl"
            value={form.playbackUrl}
            onChange={update}
            placeholder="Provider playback URL"
          />
        </label>
        <label>
          Visibility
          <select name="visibility" value={form.visibility} onChange={update}>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="button primary">
          <Radio size={17} /> Create broadcast
        </button>
      </form>

      {previewing && (
        <div className="call-controls">
          <button
            type="button"
            className="control"
            onClick={() => {
              const next = !muted;
              media.current?.getAudioTracks().forEach((track) => {
                track.enabled = !next;
              });
              setMuted(next);
            }}
          >
            {muted ? <MicOff /> : <Mic />}
          </button>
          <button
            type="button"
            className="control"
            onClick={() => {
              const next = !cameraOff;
              media.current?.getVideoTracks().forEach((track) => {
                track.enabled = !next;
              });
              setCameraOff(next);
            }}
          >
            {cameraOff ? <VideoOff /> : <Video />}
          </button>
        </div>
      )}
    </div>
  );
}
