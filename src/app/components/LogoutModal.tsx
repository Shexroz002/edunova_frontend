import { useTheme } from './ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
    const { theme: t } = useTheme();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="p-0 gap-0 max-w-[calc(100%-2rem)] sm:max-w-md"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                }}
            >
                <DialogHeader className="p-6 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                                background: t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                            }}
                        >
                            <AlertTriangle
                                className="w-6 h-6"
                                style={{ color: t.isDark ? '#F87171' : '#EF4444' }}
                            />
                        </div>
                    </div>
                    <DialogTitle
                        className="text-left text-lg"
                        style={{ color: t.textPrimary }}
                    >
                        Siz saytni tark etmoqchimisiz?
                    </DialogTitle>
                </DialogHeader>

                <DialogFooter className="flex flex-col sm:flex-row gap-3 p-6 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl transition-all hover:opacity-90 active:scale-98"
                        style={{
                            background: t.bgInner,
                            color: t.textPrimary,
                            border: `1px solid ${t.border}`,
                        }}
                    >
                        Saytda qolish
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl transition-all hover:opacity-90 active:scale-98"
                        style={{
                            background: t.isDark
                                ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
                                : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                            color: '#fff',
                            boxShadow: t.isDark
                                ? '0 4px 12px rgba(239,68,68,0.25)'
                                : '0 4px 12px rgba(239,68,68,0.2)',
                        }}
                    >
                        Chiqish
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
