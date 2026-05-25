import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button, Modal } from '../../../components/ui';

interface RenameWatchlistModalProps {
  currentName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function RenameWatchlistModal({ currentName, onSave, onClose }: RenameWatchlistModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <Modal title="Rename list" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-ink-muted dark:text-ink-dark-muted">List name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mt-1 w-full"
            placeholder="My watchlist"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
