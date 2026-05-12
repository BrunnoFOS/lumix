"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  name,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback(
    (opt: string) => {
      onChange(opt);
      setSearch("");
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setSearch("");
    },
    [onChange]
  );

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearch("");
    // Delay para garantir que o input está visível
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ zIndex: open ? 50 : "auto" }}>
      {name && <input type="hidden" name={name} value={value} />}

      {/* Estado fechado: mostra valor ou placeholder */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors",
            "hover:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <div className="flex items-center gap-0.5">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={handleClear}
                onMouseDown={(e) => e.preventDefault()}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </button>
      )}

      {/* Estado aberto: input de busca */}
      {open && (
        <input
          ref={inputRef}
          type="text"
          className="flex h-8 w-full items-center rounded-lg border border-ring bg-transparent px-2.5 text-sm outline-none ring-3 ring-ring/50 placeholder:text-muted-foreground"
          placeholder="Digite para buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setSearch("");
            }
            if (e.key === "Enter" && filtered.length === 1) {
              e.preventDefault();
              handleSelect(filtered[0]);
            }
          }}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum resultado.
            </p>
          ) : (
            filtered.map((opt) => {
              const selected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-accent/50 font-medium text-primary"
                  )}
                  onClick={() => handleSelect(opt)}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
