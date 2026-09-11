"use client";

import React from "react";
import {
    Dropdown,
    DropdownTrigger,
    DropdownPopover,
    DropdownMenu,
    DropdownItem,
    Separator
} from "@heroui/react";
import { MoreVertical } from "lucide-react";

export interface DropdownMenuItemOption {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    isDanger?: boolean;
    isDisabled?: boolean;
    onPress?: () => void;
    className?: string;
}

export type DropdownMenuItem = DropdownMenuItemOption | "divider";

export interface ActionDropdownProps {
    /** Custom trigger element. Defaults to 3 vertical dots icon button. */
    trigger?: React.ReactNode;
    /** Array of menu item options or 'divider' */
    items: DropdownMenuItem[];
    /** Accessibility label for dropdown menu */
    ariaLabel?: string;
    /** Placement of popover relative to trigger */
    placement?: "bottom start" | "bottom end" | "top start" | "top end" | "bottom" | "top";
    /** Custom trigger wrapper class */
    triggerClassName?: string;
    /** Custom popover card class */
    popoverClassName?: string;
}

export function ActionDropdown({
    trigger,
    items,
    ariaLabel = "Actions Menu",
    placement = "bottom end",
    triggerClassName = "p-2 text-tatt-gray hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer outline-none",
    popoverClassName = "bg-surface border border-border rounded-xl shadow-xl p-1 z-50 min-w-48 max-h-80 overflow-y-auto"
}: ActionDropdownProps) {
    // If a button element is passed as trigger, unwrap its children to prevent nested <button><button> DOM hydration errors
    let finalTrigger = trigger;
    let finalClassName = triggerClassName;

    if (React.isValidElement(trigger) && (trigger.type === "button" || (trigger.type as any) === "button")) {
        finalTrigger = (trigger.props as any).children;
        if ((trigger.props as any).className) {
            finalClassName = (trigger.props as any).className;
        }
    }

    return (
        <Dropdown>
            <DropdownTrigger className={finalClassName}>
                {finalTrigger || <MoreVertical size={18} />}
            </DropdownTrigger>
            <DropdownPopover placement={placement} className={popoverClassName}>
                <DropdownMenu aria-label={ariaLabel}>
                    {items.map((item, index) => {
                        if (item === "divider") {
                            return <Separator key={`divider-${index}`} className="my-1 border-t border-border" />;
                        }

                        const itemProps: Record<string, any> = {
                            className: `flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                                item.isDanger
                                    ? "text-red-500 hover:bg-red-500/10 focus:bg-red-500/10"
                                    : "text-foreground hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5"
                            } ${item.className || ""}`
                        };

                        if (item.onPress) itemProps.onPress = item.onPress;
                        if (item.isDisabled) itemProps.isDisabled = item.isDisabled;

                        return (
                            <DropdownItem key={item.key} {...itemProps}>
                                {item.icon && <span className="shrink-0">{item.icon}</span>}
                                <span>{item.label}</span>
                            </DropdownItem>
                        );
                    })}
                </DropdownMenu>
            </DropdownPopover>
        </Dropdown>
    );
}
