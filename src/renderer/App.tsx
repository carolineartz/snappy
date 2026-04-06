import { useCallback, useEffect, useState } from 'react';
import { SnapGrid } from './components/SnapGrid';
import type { SnapItem } from './types';

export function App() {
  const [snaps, setSnaps] = useState<SnapItem[]>([]);

  const loadSnaps = useCallback(async () => {
    const data = (await window.snappy.library.getSnaps()) as SnapItem[];
    setSnaps(data);
  }, []);

  useEffect(() => {
    loadSnaps();
    window.snappy.library.onSnapsUpdated(loadSnaps);
  }, [loadSnaps]);

  const handleOpen = async (snapId: string) => {
    await window.snappy.library.openSnap(snapId);
    loadSnaps();
  };

  const handleDelete = async (snapId: string) => {
    await window.snappy.library.deleteSnap(snapId);
    loadSnaps();
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-900 text-white">
      <header className="flex items-center justify-between border-b border-neutral-700 px-4 py-2">
        <h1 className="text-sm font-semibold">Snappy</h1>
        <span className="text-xs text-neutral-500">
          {snaps.length} snap{snaps.length !== 1 ? 's' : ''}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto">
        {snaps.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <p className="text-neutral-400">No snaps yet</p>
              <p className="mt-2 text-sm text-neutral-500">
                Press ⌘⇧2 to take a screenshot
              </p>
            </div>
          </div>
        ) : (
          <SnapGrid snaps={snaps} onOpen={handleOpen} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
