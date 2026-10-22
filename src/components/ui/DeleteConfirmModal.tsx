'use client'

import React, { useEffect } from 'react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title?: string
  message?: string
  itemName?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item? This action is permanent and cannot be undone.',
  itemName,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  return (
    <div className="delete-modal-backdrop" onClick={() => !isLoading && onCancel()}>
      <div
        className="delete-modal-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon Badge */}
        <div className="delete-icon-wrapper">
          <div className="delete-icon-circle">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
        </div>

        {/* Title & Message */}
        <div className="delete-modal-body">
          <h3 className="delete-modal-title">{title}</h3>
          <p className="delete-modal-message">{message}</p>

          {itemName && (
            <div className="delete-target-pill">
              <span className="pill-dot" />
              <span className="pill-text">{itemName}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="delete-modal-actions">
          <button
            type="button"
            className="delete-cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="delete-confirm-btn"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-spinner-content">
                <span className="btn-spinner" />
                Deleting...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .delete-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: modalFadeIn 0.2s ease-out;
        }

        .delete-modal-dialog {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 440px;
          padding: 28px 24px 24px 24px;
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: modalScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .delete-icon-wrapper {
          margin-bottom: 16px;
        }

        .delete-icon-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #fee2e2;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.2);
          border: 3px solid #ffffff;
        }

        .delete-modal-body {
          width: 100%;
          margin-bottom: 24px;
        }

        .delete-modal-title {
          font-family: var(--font-outfit, inherit);
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
          letter-spacing: -0.3px;
        }

        .delete-modal-message {
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        .delete-target-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 20px;
          margin-top: 14px;
          max-width: 100%;
        }

        .pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
        }

        .pill-text {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .delete-modal-actions {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        .delete-cancel-btn {
          flex: 1;
          padding: 12px 18px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s, border-color 0.15s;
        }

        .delete-cancel-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .delete-confirm-btn {
          flex: 1.2;
          padding: 12px 18px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .delete-confirm-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
        }

        .delete-confirm-btn:disabled,
        .delete-cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-spinner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalScaleUp {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 480px) {
          .delete-modal-dialog {
            padding: 22px 18px 18px 18px;
            border-radius: 16px;
          }

          .delete-modal-actions {
            flex-direction: column-reverse;
          }

          .delete-cancel-btn,
          .delete-confirm-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
