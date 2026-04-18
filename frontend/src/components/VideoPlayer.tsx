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
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState<{ label: string; level: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    setCurrentQuality('Auto');

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      enableWorker: true,
    });

    hls.loadSource(hlsSrc);
    hls.attachMedia(video);
    hlsRef.current = hls;

    // Правильное получение списка качеств
    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
    const qualityList: { label: string; level: number; height?: number }[] = [];
    
    data.levels.forEach((level, index) => {
      let label = 'Auto';
      
      if (level.height) {
        label = `${level.height}p`;
      } else if (level.attrs?.RESOLUTION) {
        // Извлекаем высоту из RESOLUTION (например "1920x1080")
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
    
    // Сортируем по качеству (от высокого к низкому)
    qualityList.sort((a, b) => (b.height || 0) - (a.height || 0));
    
    setQualities(qualityList);
    console.log('✅ Доступные качества:', qualityList);
  });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        setErrorMsg('HLS не загрузился. Используем оригинальное видео.');
        if (mp4Src) video.src = mp4Src;
      }
    });

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [hlsSrc, mp4Src]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        await video.play();
      }
    } catch (err: any) {
      console.warn('Play failed:', err.message);
    }
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) video.currentTime = Number(e.target.value);
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
    setCurrentQuality('Auto');
    setShowQualityMenu(false);
  };

  return (
    <div className="custom-player">
      {errorMsg && <div className="player-error">{errorMsg}</div>}

      <div className="video-container" onClick={togglePlay}>
        <video
          ref={videoRef}
          poster={poster}
          className="video"
          playsInline
        />
      </div>

      <div className="progress-container">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="progress-bar"
        />
      </div>

      <div className="controls-bar" onClick={e => e.stopPropagation()}>
        <button className="btn play-btn" onClick={togglePlay}>
          {isPlaying ? '❚❚' : '▶'}
        </button>

        <span className="time">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>

        {qualities.length > 0 && (
          <div className="quality-wrapper">
            <button
              className="quality-btn"
              onClick={() => setShowQualityMenu(!showQualityMenu)}
            >
              {currentQuality} ▼
            </button>

            {showQualityMenu && (
              <div className="quality-menu">
                <div className="quality-option" onClick={setAutoQuality}>Auto</div>
                {qualities.map((q) => (
                  <div
                    key={q.level}
                    className="quality-option"
                    onClick={() => changeQuality(q.level)}
                  >
                    {q.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          className="btn fullscreen-btn"
          onClick={() => videoRef.current?.requestFullscreen()}
        >
          ⛶
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;