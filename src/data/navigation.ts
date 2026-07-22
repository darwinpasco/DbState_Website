export type NavigationItem = {
  label: string;
  href: string;
};

export const navigationItems: NavigationItem[] = [
  { label: "Product", href: "/product" },
  { label: "Safety", href: "/safety" },
  { label: "Docs", href: "/docs" },
  { label: "Private Beta", href: "/private-beta" },
];

export const primaryCta = {
  label: "Request Private Beta Access",
  href: "/private-beta",
};
