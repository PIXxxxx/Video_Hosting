// src/components/VidicVideoPlayer.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import './VidicVideoPlayer.css';

interface VidicPlayerProps {
  src: string;
  isActive: boolean;
  onView?: () => void;
  onLike?: () => void;
  likesCount?: number;
  isLiked?: boolean;
  onComment?: () => void;
  onShare?: () => void;
}

const LikeIcon = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? '#fff' : 'none'} stroke="#fff" strokeWidth="2">
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3m7-2V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
  </svg>
);

const CommentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

const VolumeHighIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
);

const VolumeMutedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>
);

const FullscreenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

// Ключ для localStorage
const VOLUME_KEY = 'vidic_player_volume';
const MUTED_KEY = 'vidic_player_muted';

const VidicVideoPlayer: React.FC<VidicPlayerProps> = ({ 
  src, isActive, onView, onLike, likesCount = 0, isLiked = false,
  onComment, onShare
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  // Загружаем громкость из localStorage
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved ? parseFloat(saved) : 1;
  });
  
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem(MUTED_KEY);
    return saved === 'true';
  });
  
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewRecordedRef = useRef(false);

  // Применяем сохранённую громкость к видео при монтировании
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(e => console.log('Play error:', e));
      setIsPlaying(true);
      setShowControls(true);
      if (!viewRecordedRef.current && onView) {
        viewRecordedRef.current = true;
        onView();
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, onView]);

  const hideControls = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControls();
  }, [hideControls]);

  useEffect(() => {
    if (isActive && isPlaying) hideControls();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isActive, isPlaying, hideControls]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); setIsPlaying(false); }
    else { video.play(); setIsPlaying(true); }
    showControlsTemporarily();
  }, [isPlaying, showControlsTemporarily]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) { setCurrentTime(video.currentTime); setDuration(video.duration || 0); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) { video.currentTime = parseFloat(e.target.value); setCurrentTime(video.currentTime); showControlsTemporarily(); }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const newMuted = !video.muted;
      video.muted = newMuted;
      setIsMuted(newMuted);
      localStorage.setItem(MUTED_KEY, String(newMuted));
      showControlsTemporarily();
    }
  }, [showControlsTemporarily]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    if (video) {
      video.volume = newVolume;
      video.muted = false;
      setVolume(newVolume);
      setIsMuted(false);
      localStorage.setItem(VOLUME_KEY, String(newVolume));
      localStorage.setItem(MUTED_KEY, 'false');
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="vidic-player-wrapper" ref={containerRef}>
      <div 
        className="vidic-player-container"
        onMouseMove={showControlsTemporarily}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      >
        <video
          ref={videoRef}
          src={src}
          loop
          playsInline
          className="vidic-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onClick={(e) => togglePlay(e)}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
        />

        <div className={`vidic-center-play ${!isPlaying ? 'visible' : ''}`} onClick={togglePlay}>
          <div className="vidic-center-play-btn">{isPlaying ? <PauseIcon /> : <PlayIcon />}</div>
        </div>

        {isBuffering && (
          <div className="vidic-buffering"><div className="vidic-spinner"></div></div>
        )}

        <div className={`vidic-progress-top ${showControls ? 'visible' : ''}`}>
          <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={handleSeek} className="vidic-progress-bar-top" />
        </div>

        <div className={`vidic-bottom-bar ${showControls ? 'visible' : ''}`}>
          <div className="vidic-volume-group">
            <button className="vidic-bottom-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeMutedIcon /> : <VolumeHighIcon />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="vidic-volume-slider-always"
            />
          </div>

          <span className="vidic-time-bottom">{formatTime(currentTime)} / {formatTime(duration)}</span>

          <div className="vidic-bottom-right">
            <button className="vidic-bottom-btn" onClick={toggleFullscreen}><FullscreenIcon /></button>
          </div>
        </div>

        <div className={`vidic-actions-right ${showControls ? 'visible' : ''}`}>
          <button className="vidic-action-btn" onClick={onLike}>
            <div className="vidic-action-icon"><LikeIcon filled={isLiked} /></div>
            <span className="vidic-action-text">{likesCount > 0 ? likesCount : ''}</span>
          </button>
          <button className="vidic-action-btn" onClick={onComment}>
            <div className="vidic-action-icon"><CommentIcon /></div>
          </button>
          <button className="vidic-action-btn" onClick={onShare}>
            <div className="vidic-action-icon"><ShareIcon /></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VidicVideoPlayer;