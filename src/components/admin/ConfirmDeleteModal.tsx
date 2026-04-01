'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDeleteModalProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    loading: boolean
    resource: string
}

export function ConfirmDeleteModal({ open, onClose, onConfirm, loading, resource }: ConfirmDeleteModalProps) {
    return (
        <Modal open={open} onClose={onClose} title="Confirmar eliminación" size="sm">
            <div className="flex flex-col items-center text-center gap-4">
                <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--error)' }}
                >
                    <AlertTriangle size={22} />
                </div>
                <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        ¿Estás seguro de que deseas eliminar{' '}
                        <span className="font-semibold">&ldquo;{resource}&rdquo;</span>?
                    </p>
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Esta acción no se puede deshacer.
                    </p>
                </div>
                <div className="flex w-full gap-3 mt-2">
                    <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={onConfirm} loading={loading} className="flex-1 justify-center">
                        Eliminar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
