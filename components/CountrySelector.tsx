"use client";

import React, { useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { COUNTRIES } from "@/lib/data/countries";

interface CountrySelectorProps {
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-surface-border text-xs text-text hover:bg-surface-muted hover:border-surface-border/80 transition-colors"
      >
        <span className="text-base">{current.flag}</span>
        <span className="font-semibold">{current.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-50 w-56 max-h-64 overflow-y-auto bg-surface border border-surface-border rounded-md shadow-2xl p-1 animate-fadeIn">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onSelectCountry(c.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  selectedCountry === c.code
                    ? "bg-accent-subtle text-accent font-bold"
                    : "text-text hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <span>{c.name}</span>
                </div>
                {selectedCountry === c.code && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
