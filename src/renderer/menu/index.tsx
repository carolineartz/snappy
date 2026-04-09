import { createRoot } from 'react-dom/client';
import '../index.css';
import { MenuApp } from './MenuApp';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<MenuApp />);
