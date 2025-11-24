import { modelTemplates } from '../templates/modelTemplates';

interface TemplatesProps {
  onUseTemplate: (templateJson: string) => void;
}

export function Templates({ onUseTemplate }: TemplatesProps) {
  const handleUseTemplate = (templateId: string) => {
    const template = modelTemplates.find((t) => t.id === templateId);
    if (template) {
      const json = JSON.stringify(template.model, null, 2);
      onUseTemplate(json);
    }
  };

  return (
    <div className="container">
      <h1>Model Templates</h1>
      <p className="text-secondary mb-lg">
        Start with a pre-built template and customize it to your needs
      </p>

      <div className="grid grid-3">
        {modelTemplates.map((template) => (
          <div key={template.id} className="template-card">
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <button onClick={() => handleUseTemplate(template.id)}>
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
