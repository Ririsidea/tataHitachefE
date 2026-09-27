// Small inline SVG icon set (stroke icons that inherit `currentColor`), shared across the UI.
import type { ReactNode } from 'react';

export interface IconProps {
  size?: number;
  strokeWidth?: number;
}

function Icon({ size = 16, strokeWidth = 1.8, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const CartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 8H6.2" />
    <circle cx="9.5" cy="20.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="20.5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={2.2}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const CheckCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.8 2.8L16.2 9.5" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16v.01" />
  </Icon>
);

export const InboxIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 13l2.6-7.2A2 2 0 0 1 7.5 4.5h9a2 2 0 0 1 1.9 1.3L21 13" />
    <path d="M3 13v4.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V13h-5.2a2.8 2.8 0 0 1-5.6 0H3Z" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const PackageIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const ImageIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 17l4.6-4.4a1.6 1.6 0 0 1 2.2 0L14 15.6l1.8-1.7a1.6 1.6 0 0 1 2.2 0L20.5 16" />
  </Icon>
);
