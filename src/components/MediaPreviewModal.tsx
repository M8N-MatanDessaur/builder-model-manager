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

  // Clean the URL by removing surrounding quotes (single or double)
  const cleanUrl = (rawUrl: string): string => {
    if (!rawUrl) return rawUrl;
    const trimmed = rawUrl.trim();
    // Remove surrounding quotes if present
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const cleanedUrl = cleanUrl(url);

  const getMediaType = (url: string): 'image' | 'video' | 'audio' | 'unknown' => {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
    const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv)$/i;
    const audioExtensions = /\.(mp3|wav|ogg|m4a|aac)$/i;

    if (imageExtensions.test(url)) return 'image';
    if (videoExtensions.test(url)) return 'video';
    if (audioExtensions.test(url)) return 'audio';
    return 'unknown';
  };

  const mediaType = getMediaType(cleanedUrl);

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
          <img src={cleanedUrl} alt="Preview" className="media-preview-image" />
        )}

        {mediaType === 'video' && (
          <video controls className="media-preview-video">
            <source src={cleanedUrl} />
            Your browser does not support the video tag.
          </video>
        )}

        {mediaType === 'audio' && (
          <div className="media-preview-audio-container">
            <audio controls className="media-preview-audio">
              <source src={cleanedUrl} />
              Your browser does not support the audio tag.
            </audio>
            <p className="media-preview-url">{cleanedUrl}</p>
          </div>
        )}

        {mediaType === 'unknown' && (
          <div className="media-preview-unknown">
            <p>Unable to preview this file type</p>
            <a href={cleanedUrl} target="_blank" rel="noopener noreferrer" className="media-preview-link">
              Open in new tab
            </a>
            <p className="media-preview-url">{cleanedUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
};
