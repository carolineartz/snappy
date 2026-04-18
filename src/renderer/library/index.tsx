import { createRoot } from 'react-dom/client';
import '../index.css';
import { LibraryApp } from '../components/library/LibraryApp';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<LibraryApp />);
