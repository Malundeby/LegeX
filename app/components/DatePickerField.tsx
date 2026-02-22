"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

const parseIsoLocalDate = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const toIsoLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatNorwegianDateLocal = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function DatePickerField({
  value,
  onChange,
  placeholder = "Velg dato",
  ariaLabel = "Velg dato"
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseIsoLocalDate(value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="date-field" ref={containerRef}>
      <div className="date-field-row">
        <button
          type="button"
          className="date-field-button"
          aria-label={ariaLabel}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>{selectedDate ? formatNorwegianDateLocal(selectedDate) : placeholder}</span>
          <span className="date-field-icon">📅</span>
        </button>
        <button
          type="button"
          className="date-field-inline-today"
          onClick={() => {
            onChange(toIsoLocalDate(new Date()));
            setOpen(false);
          }}
        >
          I dag
        </button>
      </div>
      {open && (
        <div className="date-field-popover">
          <DayPicker
            mode="single"
            weekStartsOn={1}
            captionLayout="dropdown"
            startMonth={new Date(1950, 0)}
            endMonth={new Date(2100, 11)}
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoLocalDate(date));
              setOpen(false);
            }}
          />
          <div className="date-field-quick">
            <button
              type="button"
              className="date-field-today"
              onClick={() => {
                onChange(toIsoLocalDate(new Date()));
                setOpen(false);
              }}
            >
              I dag
            </button>
            {[1, 2, 4, 6, 8].map((weeks) => (
              <button
                key={weeks}
                type="button"
                className="date-field-quick-button"
                onClick={() => {
                  const base = new Date();
                  base.setDate(base.getDate() + weeks * 7);
                  onChange(toIsoLocalDate(base));
                  setOpen(false);
                }}
              >
                {weeks}u
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
