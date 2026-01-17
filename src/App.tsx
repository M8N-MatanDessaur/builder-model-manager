import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { builderApi } from './services/builderApi';
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { ModelList } from './components/ModelList';
import { ModelDetail } from './components/ModelDetail';
import { JsonEditor } from './components/JsonEditor';
import { ContentList } from './components/ContentList';
import { ContentDetail } from './components/ContentDetail';
import { ContentJsonEditor } from './components/ContentJsonEditor';
import { LoadingSpinner } from './components/LoadingSpinner';
import { GlobalSearch } from './components/GlobalSearch';
import type { BuilderModel, BuilderContent } from './types/builder';

type Page = 'models' | 'content';
type View = 'list' | 'detail' | 'edit' | 'create';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spaceName, setSpaceName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('currentPage');
    return (saved === 'models' || saved === 'content') ? saved : 'models';
  });
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved === 'list' || saved === 'detail' || saved === 'edit' || saved === 'create') ? saved : 'list';
  });
  const [selectedModel, setSelectedModel] = useState<BuilderModel | null>(null);
  const [selectedContent, setSelectedContent] = useState<BuilderContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<BuilderModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contentListInitialModel, setContentListInitialModel] = useState<BuilderModel | null>(null);

  // Load models from API
  const loadModels = async () => {
    setModelsLoading(true);
    try {
      const data = await builderApi.getModels();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    // Check if already authenticated
    const credentials = builderApi.loadCredentials();
    if (credentials) {
      setIsAuthenticated(true);
      // Fetch organization/space name
      builderApi.getOrganization().then((org) => {
        setSpaceName(org.name);
      }).catch((error) => {
        console.error('Failed to fetch organization:', error);
      });
      // Load models on authentication
      loadModels();
    }
  }, []);

  // Restore selected model/content on page reload
  useEffect(() => {
    if (!isAuthenticated || currentView !== 'detail') return;

    const restoreState = async () => {
      setLoading(true);
      try {
        if (currentPage === 'models') {
          const modelId = localStorage.getItem('selectedModelId');
          if (modelId) {
            const model = await builderApi.getModel(modelId);
            setSelectedModel(model);
          } else {
            // No stored model, go back to list
            setCurrentView('list');
          }
        } else if (currentPage === 'content') {
          const contentId = localStorage.getItem('selectedContentId');
          const modelName = localStorage.getItem('selectedContentModelName');
          if (contentId && modelName) {
            const content = await builderApi.getContentById(modelName, contentId);
            const models = await builderApi.getModels();
            const model = models.find(m => m.name === modelName);
            if (content && model) {
              setSelectedContent(content);
              setSelectedModel(model);
            } else {
              setCurrentView('list');
            }
          } else {
            setCurrentView('list');
          }
        }
      } catch (error) {
        console.error('Failed to restore state:', error);
        setCurrentView('list');
      } finally {
        setLoading(false);
      }
    };

    restoreState();
  }, [isAuthenticated]);

  // Persist page state
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Global search keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAuthenticated = async () => {
    setIsAuthenticated(true);
    // Fetch organization/space name
    try {
      const org = await builderApi.getOrganization();
      setSpaceName(org.name);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
    // Load models on first authentication
    await loadModels();
  };

  const handleDisconnect = () => {
    builderApi.clearCredentials();
    localStorage.removeItem('currentPage');
    localStorage.removeItem('currentView');
    setIsAuthenticated(false);
    setSpaceName('');
    setCurrentPage('models');
    setCurrentView('list');
    setSelectedModel(null);
    setSelectedContent(null);
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setCurrentView('list');
    setSelectedModel(null);
    setSelectedContent(null);
    setContentListInitialModel(null);
    localStorage.removeItem('selectedModelId');
    localStorage.removeItem('selectedContentId');
    localStorage.removeItem('selectedContentModelName');
  };

  // Model handlers
  const handleViewModel = (model: BuilderModel) => {
    setSelectedModel(model);
    setCurrentView('detail');
    if (model.id) {
      localStorage.setItem('selectedModelId', model.id);
    }
  };

  const handleEditModel = (model: BuilderModel) => {
    setSelectedModel(model);
    setCurrentView('edit');
  };

  const handleCreateNewModel = () => {
    setSelectedModel(null);
    setCurrentView('create');
  };

  // Content handlers
  const handleViewContent = (content: BuilderContent, model: BuilderModel) => {
    setSelectedContent(content);
    setSelectedModel(model);
    setCurrentView('detail');
    if (content.id) {
      localStorage.setItem('selectedContentId', content.id);
      localStorage.setItem('selectedContentModelName', model.name);
    }
  };

  const handleEditContent = (content: BuilderContent, model: BuilderModel) => {
    setSelectedContent(content);
    setSelectedModel(model);
    setCurrentView('edit');
  };

  const handleCreateNewContent = (model: BuilderModel) => {
    setSelectedContent(null);
    setSelectedModel(model);
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedModel(null);
    setSelectedContent(null);
    setContentListInitialModel(null);
    localStorage.removeItem('selectedModelId');
    localStorage.removeItem('selectedContentId');
    localStorage.removeItem('selectedContentModelName');
  };

  // Navigate from ModelList/ModelDetail to ContentList with that model pre-selected
  const handleViewModelContentEntries = (model: BuilderModel) => {
    // Use flushSync to ensure state updates happen immediately and synchronously
    flushSync(() => {
      setSelectedModel(null);
      setSelectedContent(null);
      setCurrentView('list');
    });

    flushSync(() => {
      setCurrentPage('content');
      setContentListInitialModel(model);
    });

    localStorage.removeItem('selectedModelId');
    localStorage.removeItem('selectedContentId');
    localStorage.removeItem('selectedContentModelName');
  };

  // Navigate from ContentDetail to ModelList (split-panel view)
  const handleContentViewModel = async (model: BuilderModel) => {
    // Use flushSync to ensure state updates happen immediately and synchronously
    flushSync(() => {
      setSelectedModel(null);
      setSelectedContent(null);
      setContentListInitialModel(null);
      setCurrentView('list');
    });

    flushSync(() => {
      setCurrentPage('models');
    });

    localStorage.removeItem('selectedModelId');
    localStorage.removeItem('selectedContentId');
    localStorage.removeItem('selectedContentModelName');
  };

  const handleSaveSuccess = () => {
    setCurrentView('list');
    setSelectedModel(null);
    setSelectedContent(null);
    setContentListInitialModel(null);
    localStorage.removeItem('selectedModelId');
    localStorage.removeItem('selectedContentId');
    localStorage.removeItem('selectedContentModelName');
    // Refresh data after save
    if (currentPage === 'models') {
      loadModels();
    }
  };

  // Global search handlers
  const handleSearchSelectModel = (model: BuilderModel) => {
    setCurrentPage('models');
    setSelectedModel(model);
    setCurrentView('detail');
    if (model.id) {
      localStorage.setItem('selectedModelId', model.id);
    }
  };

  const handleSearchSelectContent = (content: BuilderContent, model: BuilderModel) => {
    setCurrentPage('content');
    setSelectedContent(content);
    setSelectedModel(model);
    setCurrentView('detail');
    if (content.id) {
      localStorage.setItem('selectedContentId', content.id);
      localStorage.setItem('selectedContentModelName', model.name);
    }
  };

  if (!isAuthenticated) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <>
      {loading && <LoadingSpinner message="Loading..." fullscreen />}

      <Header
        currentPage={currentPage}
        spaceName={spaceName}
        onNavigate={handleNavigate}
        onDisconnect={handleDisconnect}
        onSettingsUpdate={() => {
          // Trigger re-render to reload AI insights with new API key
          setCurrentView('list');
          setTimeout(() => {
            if (currentView !== 'list') {
              setCurrentView(currentView);
            }
          }, 0);
        }}
      />

      {currentPage === 'models' && (
        <>
          {currentView === 'list' && (
            <ModelList
              models={models}
              loading={modelsLoading}
              onViewModel={handleViewModel}
              onCreateNew={handleCreateNewModel}
              onRefresh={loadModels}
              onViewContentEntries={handleViewModelContentEntries}
            />
          )}

          {currentView === 'detail' && selectedModel && (
            <ModelDetail
              model={selectedModel}
              onEdit={() => handleEditModel(selectedModel)}
              onBack={handleBackToList}
              onUpdate={async () => {
                // Refresh models list and the current model
                await loadModels();
                if (selectedModel.id) {
                  const updated = await builderApi.getModel(selectedModel.id);
                  setSelectedModel(updated);
                }
              }}
              onViewContentEntries={() => handleViewModelContentEntries(selectedModel)}
            />
          )}

          {(currentView === 'edit' || currentView === 'create') && (
            <JsonEditor
              model={currentView === 'edit' ? selectedModel || undefined : undefined}
              onSave={handleSaveSuccess}
              onCancel={handleBackToList}
            />
          )}
        </>
      )}

      {currentPage === 'content' && (
        <>
          {currentView === 'list' && (
            <ContentList
              models={models}
              onViewContent={handleViewContent}
              onCreateNew={handleCreateNewContent}
              initialSelectedModel={contentListInitialModel || undefined}
            />
          )}

          {currentView === 'detail' && selectedContent && selectedModel && (
            <ContentDetail
              content={selectedContent}
              model={selectedModel}
              onEdit={() => handleEditContent(selectedContent, selectedModel)}
              onBack={handleBackToList}
              onUpdate={async () => {
                // Refresh the content data after field edit
                if (selectedContent.id && selectedModel) {
                  const updated = await builderApi.getContentById(selectedModel.name, selectedContent.id);
                  if (updated) {
                    setSelectedContent(updated);
                  }
                }
              }}
              onViewModel={() => handleContentViewModel(selectedModel)}
            />
          )}

          {(currentView === 'edit' || currentView === 'create') && selectedModel && (
            <ContentJsonEditor
              content={currentView === 'edit' ? selectedContent || undefined : undefined}
              model={selectedModel}
              onSave={handleSaveSuccess}
              onCancel={handleBackToList}
            />
          )}
        </>
      )}

      {/* Global Search (Ctrl/Cmd + K) */}
      <GlobalSearch
        models={models}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectModel={handleSearchSelectModel}
        onSelectContent={handleSearchSelectContent}
      />
    </>
  );
}

export default App;
