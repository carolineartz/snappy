import { createRoot } from 'react-dom/client';
import { SnapViewer } from '../components/snap-viewer/SnapViewer';
import '../index.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<SnapViewer />);
