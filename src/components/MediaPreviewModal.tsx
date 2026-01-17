import React from 'react';
import '../styles/MediaPreviewModal.css';

interface MediaPreviewModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  url,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const getMediaType = (url: string): 'image' | 'video' | 'audio' | 'unknown' => {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
    const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv)$/i;
    const audioExtensions = /\.(mp3|wav|ogg|m4a|aac)$/i;

    if (imageExtensions.test(url)) return 'image';
    if (videoExtensions.test(url)) return 'video';
    if (audioExtensions.test(url)) return 'audio';
    return 'unknown';
  };

  const mediaType = getMediaType(url);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="media-preview-modal" onClick={handleBackdropClick}>
      <div className="media-preview-content">
        <button className="media-preview-close" onClick={onClose}>
          &times;
        </button>

        {mediaType === 'image' && (
          <img src={url} alt="Preview" className="media-preview-image" />
        )}

        {mediaType === 'video' && (
          <video controls className="media-preview-video">
            <source src={url} />
            Your browser does not support the video tag.
          </video>
        )}

        {mediaType === 'audio' && (
          <div className="media-preview-audio-container">
            <audio controls className="media-preview-audio">
              <source src={url} />
              Your browser does not support the audio tag.
            </audio>
            <p className="media-preview-url">{url}</p>
          </div>
        )}

        {mediaType === 'unknown' && (
          <div className="media-preview-unknown">
            <p>Unable to preview this file type</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="media-preview-link">
              Open in new tab
            </a>
            <p className="media-preview-url">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
};
