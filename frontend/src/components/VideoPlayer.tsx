// src/components/VideoPlayer.tsx
import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import './VideoPlayer.css';

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState<{ label: string; level: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    // Инициализация HLS
    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      // Получаем список качеств
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const list = data.levels.map((level, index) => ({
          label: level.height ? `${level.height}p` : 'Auto',
          level: index,
        }));
        setQualities(list);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }

    // Обновление времени
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleTimeUpdate);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      if (hls) hls.destroy();
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.pause() : video.play();
  };

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
    setShowMenu(false);
  };

  const setAuto = () => {
    if (hlsRef.current) hlsRef.current.currentLevel = -1;
    setCurrentQuality('Auto');
    setShowMenu(false);
  };

  return (
    <div className="custom-player">
      <video
        ref={videoRef}
        poster={poster}
        className="video"
        onClick={togglePlay}
      />

      {/* Прогресс-бар */}
      <div className="progress-container">
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="progress-bar"
        />
      </div>

      {/* Нижняя панель управления */}
      <div className="controls-bar">
        <button className="btn play-btn" onClick={togglePlay}>
          {isPlaying ? '❚❚' : '▶'}
        </button>

        <span className="time">
          {Math.floor(currentTime)} / {Math.floor(duration)}
        </span>

        {/* Меню качества */}
        <div className="quality-wrapper">
          <button className="quality-btn" onClick={() => setShowMenu(!showMenu)}>
            {currentQuality} ▼
          </button>

          {showMenu && (
            <div className="quality-menu">
              <div className="quality-option" onClick={setAuto}>Auto</div>
              {qualities.map((q, i) => (
                <div
                  key={i}
                  className="quality-option"
                  onClick={() => changeQuality(q.level)}
                >
                  {q.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn" onClick={() => videoRef.current?.requestFullscreen()}>
          ⛶
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;