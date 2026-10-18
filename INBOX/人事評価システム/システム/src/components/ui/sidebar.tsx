import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Simplified shadcn Sidebar block: this app's desktop sidebar is always
// expanded (no collapse/rail toggle) and mobile uses a dedicated bottom tab
// bar instead of the standard Sheet-based off-canvas drawer, so the
// collapsible/cookie-persistence/keyboard-shortcut machinery of the
// official block is intentionally left out.

function SidebarProvider({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-wrapper" className={cn("flex min-h-screen w-full", className)} {...props}>
      {children}
    </div>
  );
}

function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn("hidden w-60 shrink-0 flex-col border-r border-app-border bg-app-surface md:flex", className)}
      {...props}
    >
      {children}
    </aside>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-4", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-3", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex flex-col gap-2 border-t border-app-border p-3", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("relative", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      isActive: {
        true: "bg-app-accent-soft text-app-accent",
        false: "text-app-text-muted hover:bg-app-card-hover hover:text-app-text",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  }
);

function SidebarMenuButton({
  className,
  isActive,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof sidebarMenuButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ isActive, className }))}
      {...props}
    />
  );
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
};
