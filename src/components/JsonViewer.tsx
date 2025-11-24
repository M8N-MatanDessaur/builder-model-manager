import React from 'react';

interface JsonViewerProps {
  data: any;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const syntaxHighlight = (json: string): React.JSX.Element[] => {
    const lines = json.split('\n');
    return lines.map((line, index) => {
      // Replace JSON parts with colored spans
      let coloredLine = line
        // Keys (property names in quotes followed by colon)
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        // String values (in quotes)
        .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
        // Numbers
        .replace(/: (-?\d+\.?\d*)(,?)$/g, ': <span class="json-number">$1</span>$2')
        .replace(/: (-?\d+\.?\d*)(,?)\n/g, ': <span class="json-number">$1</span>$2\n')
        // Booleans
        .replace(/: (true|false)(,?)$/g, ': <span class="json-boolean">$1</span>$2')
        // Null
        .replace(/: (null)(,?)$/g, ': <span class="json-null">$1</span>$2');

      return (
        <div key={index} dangerouslySetInnerHTML={{ __html: coloredLine }} />
      );
    });
  };

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="json-container">
      <pre className="monospace">{syntaxHighlight(jsonString)}</pre>
    </div>
  );
}
