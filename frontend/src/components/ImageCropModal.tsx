import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './cropImage'; // утилита ниже

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  aspect: number;           // 1 для аватарки, 16/9 для баннера
  onCropComplete: (croppedFile: File) => Promise<void>;
  title: string;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen, onClose, imageSrc, aspect, onCropComplete, title
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImage], 'cropped.jpg', { type: 'image/jpeg' });
      await onCropComplete(file);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="modal-overlay">
      <div className="modal crop-modal">
        <h3>{title}</h3>
        <div className="crop-container" style={{ position: 'relative', height: '400px', width: '100%' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        <div className="crop-controls">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
          />
          <button onClick={handleSave}>Сохранить</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;