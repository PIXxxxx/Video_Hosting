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
}

const VidicVideoPlayer: React.FC<VidicPlayerProps> = ({ 
  src, 
  isActive, 
  onView,
  onLike,
  likesCount = 0,
  isLiked = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const viewRecordedRef = useRef(false);

  // Управление воспроизведением при активации
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

  // Автоскрытие контролов
  const hideControls = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  }, [isPlaying]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControls();
  }, [hideControls]);

  useEffect(() => {
    if (isActive && isPlaying) {
      hideControls();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isActive, isPlaying, hideControls]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
    showControlsTemporarily();
  }, [isPlaying, showControlsTemporarily]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = parseFloat(e.target.value);
      setCurrentTime(video.currentTime);
      showControlsTemporarily();
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
      showControlsTemporarily();
    }
  }, [isMuted, showControlsTemporarily]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    if (video) {
      video.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
      showControlsTemporarily();
    }
  };

  const handleWaiting = () => setIsBuffering(true);
  const handleCanPlay = () => setIsBuffering(false);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="vidic-player-wrapper">
      <div 
        className="vidic-player-container"
        onClick={showControlsTemporarily}
        onMouseMove={showControlsTemporarily}
      >
        <video
          ref={videoRef}
          src={src}
          loop={false}
          playsInline
          className="vidic-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onClick={togglePlay}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
        />

        {/* Буферизация */}
        {isBuffering && (
          <div className="vidic-buffering">
            <div className="vidic-spinner"></div>
          </div>
        )}

        {/* Контролы поверх видео */}
        <div className={`vidic-controls ${showControls ? 'visible' : ''}`}>
          <div className="vidic-progress-container">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="vidic-progress-bar"
            />
          </div>

          <div className="vidic-button-bar">
            <button onClick={togglePlay} className="vidic-control-btn">
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div className="vidic-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="vidic-volume-container">
              <button onClick={toggleMute} className="vidic-control-btn">
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="vidic-volume-slider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VidicVideoPlayer;