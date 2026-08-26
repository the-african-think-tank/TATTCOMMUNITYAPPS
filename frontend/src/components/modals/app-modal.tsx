"use client";

import React from "react";
import {
    Modal,
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalContainerProps
} from "@heroui/react";
import { X } from "lucide-react";


export interface AppModalProps extends Partial<ModalContainerProps> {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    headerExtra?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    placement?: "auto" | "top" | "center" | "bottom";
    showCloseButton?: boolean;
    maxWidth?: string;
    headerClass?: string;
    bodyClass?: string;
    footerClass?: string;
    dialogClass?: string;
    dialogStyle?: React.CSSProperties;
    bodyStyle?: React.CSSProperties;
}

export function AppModal({
    isOpen,
    onClose,
    title,
    subtitle,
    headerExtra,
    children,
    footer,
    placement = "center",
    showCloseButton = true,
    size = "lg",
    maxWidth,
    headerClass = "",
    bodyClass = "",
    footerClass = "",
    dialogClass = "",
    dialogStyle,
    bodyStyle
}: AppModalProps) {
    if (!isOpen) return null;

    const dialogProps = dialogStyle ? { style: dialogStyle } : {};

    return (
        <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <ModalBackdrop onClick={onClose}>
                <ModalContainer placement={placement} size={size}>
                    <ModalDialog
                        {...dialogProps}
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-white border border-border p-0 rounded-3xl overflow-hidden shadow-2xl w-full ${maxWidth || ""} flex flex-col ${dialogClass}`}
                    >
                        {(title || headerExtra || showCloseButton) && (
                            <ModalHeader className={`border-b border-border p-6 ${headerClass}`}>
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        {headerExtra}
                                        {title && (
                                            <div>
                                                {typeof title === "string" ? (
                                                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                                                ) : (
                                                    title
                                                )}
                                                {subtitle && (
                                                    typeof subtitle === "string" ? (
                                                        <p className="text-xs text-tatt-gray font-medium mt-0.5">{subtitle}</p>
                                                    ) : (
                                                        subtitle
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {showCloseButton && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="p-2 rounded-full text-tatt-gray hover:text-foreground hover:bg-black/5 transition-all cursor-pointer outline-none shrink-0"
                                            aria-label="Close modal"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </ModalHeader>
                        )}
                        <ModalBody
                            className={`p-6 space-y-6 overflow-y-auto custom-scrollbar ${bodyClass}`}
                        >
                            {children}
                        </ModalBody>
                        {footer && (
                            <ModalFooter className={`p-6 border-t border-border flex items-center justify-between ${footerClass}`}>
                                {footer}
                            </ModalFooter>
                        )}
                    </ModalDialog>
                </ModalContainer>
            </ModalBackdrop>
        </Modal>
    );
}
