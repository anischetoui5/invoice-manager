import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './routes';
import { WorkspaceConfigProvider, useWorkspaceConfig } from './context/WorkspaceConfigContext';
import { ModeSelect } from './pages/ModeSelect';

// Inner component — can read the workspace config context
function AppInner() {
  const { config, setMode } = useWorkspaceConfig();

  // Show mode-selection splash if the user has never chosen
  if (!config.mode) {
    return <ModeSelect onSelect={setMode} />;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <WorkspaceConfigProvider>
      <AppInner />
      <Toaster position="bottom-right" />
    </WorkspaceConfigProvider>
  );
}
