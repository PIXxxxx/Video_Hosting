// src/components/VideoPlayer.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import './VideoPlayer.css';

interface VideoPlayerProps {
  hlsSrc?: string;
  mp4Src?: string;
  poster?: string;
  videoId?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  hlsSrc,
  mp4Src,
  poster,
  videoId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState<{ label: string; level: number; height?: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Авто');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Отслеживание полноэкранного режима
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    if (video) {
      video.volume = newVolume;
      video.muted = false;
      setVolume(newVolume);
      setIsMuted(false);
    }
  };

  // Автоматическое скрытие контролов
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowVolumeSlider(false);
        setShowQualityMenu(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Инициализация HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsSrc) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setErrorMsg('');
    setQualities([]);
    setCurrentQuality('Авто');

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      enableWorker: true,
    });

    hls.loadSource(hlsSrc);
    hls.attachMedia(video);
    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      const qualityList: { label: string; level: number; height?: number }[] = [];
      
      data.levels.forEach((level, index) => {
        let label = 'Auto';
        
        if (level.height) {
          label = `${level.height}p`;
        } else if (level.attrs?.RESOLUTION) {
          const height = level.attrs.RESOLUTION.split('x')[1];
          label = `${height}p`;
        } else if (level.bitrate) {
          label = `${Math.round(level.bitrate / 1000)}k`;
        }
        
        qualityList.push({ 
          label, 
          level: index,
          height: level.height || (level.attrs?.RESOLUTION ? parseInt(level.attrs.RESOLUTION.split('x')[1]) : 0)
        });
      });
      
      qualityList.sort((a, b) => (b.height || 0) - (a.height || 0));
      setQualities(qualityList);
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        setErrorMsg('Ошибка загрузки HLS. Используем запасной источник.');
        if (mp4Src) video.src = mp4Src;
      }
    });

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [hlsSrc, mp4Src]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    } catch (err: any) {
      console.warn('Play failed:', err.message);
    }
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Number(e.target.value);
    }
  };

  const changeQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      const selected = qualities.find(q => q.level === level);
      if (selected) setCurrentQuality(selected.label);
    }
    setShowQualityMenu(false);
  };

  const setAutoQuality = () => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = -1;
    }
    setCurrentQuality('Авто');
    setShowQualityMenu(false);
  };

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          setIsMuted(false);
          video.muted = false;
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          setIsMuted(false);
          video.muted = false;
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute]);

  return (
    <div 
      ref={playerContainerRef}
      className={`custom-player ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setShowVolumeSlider(false);
          setShowQualityMenu(false);
        }
      }}
    >
      {errorMsg && <div className="player-error">{errorMsg}</div>}

      <div className="video-container" onClick={(e) => togglePlay(e)}>
        <video
          ref={videoRef}
          poster={poster}
          playsInline
          onClick={(e) => {
            e.stopPropagation();
            togglePlay(e);
          }}
        />
        
        {/* Центральная кнопка Play */}
        {!isPlaying && (
          <div className="center-play-overlay" onClick={(e) => togglePlay(e)}>
            <button className="center-play-btn" onClick={(e) => togglePlay(e)}>
              ▶
            </button>
          </div>
        )}
      </div>

      {/* Прогресс-бар */}
      <div className="progress-container">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="progress-bar"
          style={{
            background: duration > 0 
              ? `linear-gradient(to right, #ff0000 0%, #ff0000 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
              : 'rgba(255,255,255,0.2)'
          }}
        />
      </div>

      {/* Контролы */}
      <div className={`controls-bar ${showControls ? 'visible' : ''}`}>
        <button 
          className="control-btn play-btn" 
          onClick={(e) => togglePlay(e)}
          title={isPlaying ? 'Пауза (Пробел)' : 'Воспроизвести (Пробел)'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Громкость */}
        <div 
          className="volume-container"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button className="control-btn volume-btn" onClick={toggleMute} title="Вкл/выкл звук (M)">
            {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <div className={`volume-slider-wrapper ${showVolumeSlider ? 'visible' : ''}`}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
        </div>

        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>

        <div className="right-controls">
          {/* Качество */}
          {qualities.length > 0 && (
            <div className="quality-wrapper">
              <button
                className="control-btn settings-btn"
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                title="Качество"
              >
                ⚙
              </button>

              {showQualityMenu && (
                <div className="quality-menu">
                  <div className="quality-menu-header">Качество</div>
                  <div 
                    className={`quality-option ${currentQuality === 'Авто' ? 'active' : ''}`}
                    onClick={setAutoQuality}
                  >
                    Авто ✓
                  </div>
                  {qualities.map((q) => (
                    <div
                      key={q.level}
                      className={`quality-option ${currentQuality === q.label ? 'active' : ''}`}
                      onClick={() => changeQuality(q.level)}
                    >
                      {q.label} {currentQuality === q.label ? '✓' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Полный экран */}
          <button
            className="control-btn fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'Полный экран (F)'}
          >
            {isFullscreen ? '⤓' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;