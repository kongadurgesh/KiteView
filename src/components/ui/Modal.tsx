import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

export function Modal({ title, onClose, children, className, wide }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          'card w-full max-h-[85vh] flex flex-col shadow-xl',
          wide ? 'max-w-2xl' : 'max-w-md',
          className,
        )}
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-border dark:border-border-dark px-5 py-4 shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-ink-primary dark:text-ink-dark-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost p-2 -mr-2"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
