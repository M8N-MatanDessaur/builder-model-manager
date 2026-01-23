import { useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check } from 'lucide-react';

interface MonacoJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  error?: string | null;
}

export function MonacoJsonEditor({
  value,
  onChange,
  height = '500px',
  readOnly = false,
  error,
}: MonacoJsonEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="monaco-editor-container">
      <div className="monaco-editor-header">
        <span className="monaco-editor-title">JSON Editor</span>
        <button
          className="monaco-copy-btn"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="monaco-editor-error">
          {error}
        </div>
      )}
      <div className="monaco-editor-wrapper">
        <Editor
          height={height}
          language="json"
          value={value}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            automaticLayout: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
            padding: {
              top: 12,
              bottom: 12,
            },
          }}
        />
      </div>
    </div>
  );
}
