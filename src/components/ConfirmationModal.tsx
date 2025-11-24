import { useState } from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText: string;
  itemName: string;
  actionType: 'delete' | 'create' | 'update';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  title,
  message,
  confirmText,
  itemName,
  actionType,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');

  const isValid = inputValue === itemName;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.key === 'Enter' && isValid) {
      onConfirm();
    }
  };

  const getActionColor = () => {
    switch (actionType) {
      case 'delete':
        return 'var(--error-color)';
      case 'create':
        return 'var(--success-color)';
      case 'update':
        return 'var(--text-primary)';
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1500 }} onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="mb-md">{message}</p>

        <div className="bordered-box mb-md" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-secondary mb-sm">
            Type <strong style={{ color: getActionColor() }}>{itemName}</strong> to confirm:
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type "${itemName}" here`}
            autoFocus
            spellCheck={false}
          />
        </div>

        {actionType === 'delete' && (
          <p className="error mb-md">
            ⚠ This action cannot be undone. This will permanently {actionType} this item from production.
          </p>
        )}

        {actionType === 'create' && (
          <p className="success mb-md">
            ✓ This will create a new item in production.
          </p>
        )}

        {actionType === 'update' && (
          <p className="text-secondary mb-md">
            ℹ This will update the item in production.
          </p>
        )}

        <div className="modal-footer">
          <div className="flex-end">
            <button onClick={onCancel}>Cancel</button>
            <button
              className={actionType === 'delete' ? 'primary' : 'primary'}
              onClick={onConfirm}
              disabled={!isValid}
              style={{
                backgroundColor: !isValid ? 'var(--bg-tertiary)' : getActionColor(),
                color: !isValid ? 'var(--text-tertiary)' : 'var(--bg-primary)',
              }}
            >
              {confirmText}
            </button>
          </div>
          <p className="text-secondary text-small mt-md">
            Press Esc to cancel, Enter to confirm
          </p>
        </div>
      </div>
    </div>
  );
}
