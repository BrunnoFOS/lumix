"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Remove acentos e normaliza para lowercase
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxBaseProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
}

interface ComboboxStringProps extends ComboboxBaseProps {
  options: string[];
}

interface ComboboxObjectProps extends ComboboxBaseProps {
  options: ComboboxOption[];
}

type ComboboxProps = ComboboxStringProps | ComboboxObjectProps;

function isObjectOptions(
  options: string[] | ComboboxOption[]
): options is ComboboxOption[] {
  return options.length > 0 && typeof options[0] === "object";
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  name,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalizar opções para { value, label }
  const normalizedOptions = useMemo(
    () =>
      isObjectOptions(options)
        ? options
        : options.map((o) => ({ value: o, label: o })),
    [options]
  );

  const selectedLabel = useMemo(
    () => normalizedOptions.find((o) => o.value === value)?.label ?? "",
    [normalizedOptions, value]
  );

  // O texto exibido no input: quando aberto mostra o que o usuário digitou,
  // quando fechado mostra o label do item selecionado
  const displayValue = open ? search : selectedLabel;

  const filtered = useMemo(() => {
    if (!open || !search) return normalizedOptions;
    const termo = normalizeString(search);
    return normalizedOptions.filter((o) =>
      normalizeString(o.label).includes(termo)
    );
  }, [normalizedOptions, open, search]);

  const handleSelect = useCallback(
    (opt: ComboboxOption) => {
      onChange(opt.value);
      setSearch("");
      setOpen(false);
      // Tirar foco para deixar o campo "em repouso" com o valor selecionado
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onChange("");
      setSearch("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearch("");
  }, [disabled]);

  const handleBlur = useCallback(() => {
    // Delay para permitir que o click no item da lista seja processado antes de fechar
    setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        setOpen(false);
        setSearch("");
      }
    }, 150);
  }, []);

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
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ zIndex: open ? 50 : "auto" }}
    >
      {name && <input type="hidden" name={name} value={value} />}

      {/* Campo sempre visível */}
      <div
        className={cn(
          "flex h-8 w-full items-center rounded-lg border bg-transparent text-sm transition-colors",
          open
            ? "border-ring ring-3 ring-ring/50"
            : "border-input hover:border-ring",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          className="h-full w-full bg-transparent px-2.5 outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setSearch("");
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && filtered.length === 1) {
              e.preventDefault();
              handleSelect(filtered[0]);
            }
          }}
        />
        <div className="flex shrink-0 items-center gap-0.5 pr-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Lista de opções */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum resultado.
            </p>
          ) : (
            filtered.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-accent/50 font-medium text-primary"
                  )}
                  onMouseDown={(e) => {
                    // Prevenir blur do input antes de processar o click
                    e.preventDefault();
                  }}
                  onClick={() => handleSelect(opt)}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
