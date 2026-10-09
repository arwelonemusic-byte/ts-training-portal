"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/context/UserContext";
import { mockPresets } from "@/data/mock-presets";

export default function Navigation() {
  const { user, isMockMode, mockPresetIndex, setMockPreset } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const avatarUrl = user?.avatar
    ? user.avatar.startsWith("http")
      ? user.avatar
      : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/">
          <Image
            src="/logo-icon.svg"
            alt="Tactical Shift"
            width={370}
            height={56}
            className="hidden shrink-0 sm:block"
          />
          <Image
            src="/logo-icon-only.svg"
            alt="Tactical Shift"
            width={37}
            height={29}
            className="block shrink-0 sm:hidden"
          />
        </Link>

        {user ? (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2.5 px-3 py-1.5 transition-opacity hover:opacity-80"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.username}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white">
                  {user.username[0]}
                </div>
              )}
              <span className="text-sm font-medium text-text-primary">
                {user.displayName}
              </span>
              <svg
                className={`h-3.5 w-3.5 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-lg border border-border-military bg-bg-card shadow-xl shadow-black/30">
                {isMockMode ? (
                  <>
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Симуляция роли
                    </div>
                    {mockPresets.map((p, i) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setMockPreset?.(i);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          i === mockPresetIndex
                            ? "bg-accent-red/10 text-accent-red"
                            : "text-text-primary hover:bg-bg-card-hover"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            i === mockPresetIndex ? "bg-accent-red" : "bg-border-military"
                          }`}
                        />
                        {p.label}
                        {i === mockPresetIndex && (
                          <svg className="ml-auto h-3.5 w-3.5 text-accent-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </>
                ) : (
                  <a
                    href="/api/auth/logout"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-card-hover"
                  >
                    Выйти
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/api/auth/login"
            className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Войти
          </Link>
        )}
      </div>
    </nav>
  );
}
