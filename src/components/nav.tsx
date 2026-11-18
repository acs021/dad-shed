"use client";

import { usePathname } from "next/navigation";

export function SideNav({
  links,
  variant,
}: {
  links: { href: string; label: string }[];
  variant: "side" | "tab";
}) {
  const path = usePathname();
  return (
    <nav className={variant === "tab" ? "tabbar" : "sidenav"} aria-label={variant === "tab" ? "Primary" : "Shed"}>
      {links.map((link) => {
        const active = link.href === "/" ? path === "/" : path === link.href || path.startsWith(`${link.href}/`);
        return (
          <a key={link.href} href={link.href} aria-current={active ? "page" : undefined}>
            {variant === "tab" ? <Icon label={link.label} /> : null}
            <span>{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function Icon({ label }: { label: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    "aria-hidden": true as const,
  };
  if (label === "Wall") {
    return (
      <svg {...common}>
        <path d="M5 10h14M7 10v9h10V10M10 19v-5h4v5" />
      </svg>
    );
  }
  if (label === "Out") {
    return (
      <svg {...common}>
        <path d="M7 7h10v10M7 17 17 7" />
      </svg>
    );
  }
  if (label === "Asks") {
    return (
      <svg {...common}>
        <path d="M5 6h14v9H8l-3 3z" />
      </svg>
    );
  }
  if (label === "People") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="2.2" />
        <circle cx="16" cy="10" r="1.8" />
        <path d="M4.5 18c.6-2.4 2.4-3.5 4.5-3.5S13 15.6 13.6 18M14 14.6c1.4-.4 2.8.1 3.8 1.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="9" r="2.4" />
      <path d="M6.5 18.5c.8-2.6 2.8-4 5.5-4s4.7 1.4 5.5 4" />
    </svg>
  );
}
