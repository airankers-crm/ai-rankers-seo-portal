"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const dateRangePresets = ["Custom", "Today", "Yesterday", "Last 3 days", "Last 1 week", "Last 3 weeks", "Last 1 month", "Last 6 months", "Last 1 year"] as const;
export const comparisonOptions = ["None", "Previous period", "Previous year"] as const;
export type DateRangePreset = (typeof dateRangePresets)[number];
export type ComparisonOption = (typeof comparisonOptions)[number];

export type DateRangeSelection = {
  label: string;
  start: Date;
  end: Date;
  compare: ComparisonOption;
};

type DateRangePickerProps = {
  value: DateRangeSelection;
  onApply: (selection: DateRangeSelection) => void;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return startOfDay(result);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date: Date, amount: number) {
  return new Date(date.getFullYear() + amount, date.getMonth(), 1);
}

function toInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRange(start: Date, end: Date) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isBefore(left: Date, right: Date) {
  return startOfDay(left).getTime() < startOfDay(right).getTime();
}

function isBetween(date: Date, start: Date, end: Date) {
  const current = startOfDay(date).getTime();
  return current > startOfDay(start).getTime() && current < startOfDay(end).getTime();
}

export function getPresetRange(preset: Exclude<DateRangePreset, "Custom">, anchor: Date) {
  const end = startOfDay(anchor);
  if (preset === "Today") return { start: end, end };
  if (preset === "Yesterday") { const yesterday = addDays(end, -1); return { start: yesterday, end: yesterday }; }
  if (preset === "Last 3 days") return { start: addDays(end, -2), end };
  if (preset === "Last 1 week") return { start: addDays(end, -6), end };
  if (preset === "Last 3 weeks") return { start: addDays(end, -20), end };
  if (preset === "Last 1 month") return { start: addDays(end, -29), end };
  if (preset === "Last 6 months") return { start: new Date(end.getFullYear(), end.getMonth() - 5, 1), end };
  return { start: addDays(end, -364), end };
}

function calendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - startOffset + 1;
    return day < 1 || day > daysInMonth ? null : new Date(month.getFullYear(), month.getMonth(), day);
  });
}

export function getDefaultDateRange(): DateRangeSelection {
  const preset: Exclude<DateRangePreset, "Custom"> = "Last 1 month";
  const { start, end } = getPresetRange(preset, new Date());
  return { label: preset, start, end, compare: "None" };
}

export function DateRangePicker({ value, onApply }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"presets" | "custom">("presets");
  const [draft, setDraft] = useState<DateRangeSelection>(value);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(value.start));
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const nextMonth = addMonths(visibleMonth, 1);
  const firstCalendarDays = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const secondCalendarDays = useMemo(() => calendarDays(nextMonth), [nextMonth]);
  const invalidRange = isBefore(draft.end, draft.start);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setDraft(value);
      setPanel("presets");
      setSelectingEnd(false);
      setVisibleMonth(startOfMonth(value.start));
    }
    setOpen((current) => !current);
  }

  function selectPreset(preset: DateRangePreset) {
    if (preset === "Custom") {
      setDraft((current) => ({ ...current, label: preset }));
      setPanel("custom");
      setSelectingEnd(false);
      setVisibleMonth(startOfMonth(draft.start));
      return;
    }
    const next = getPresetRange(preset, new Date());
    setDraft((current) => ({ ...current, label: preset, ...next }));
    setSelectingEnd(false);
    setVisibleMonth(startOfMonth(next.start));
  }

  function selectDay(day: Date) {
    if (!selectingEnd) {
      setDraft((current) => ({ ...current, label: "Custom", start: day, end: day }));
      setSelectingEnd(true);
      return;
    }
    if (isBefore(day, draft.start)) {
      setDraft((current) => ({ ...current, label: "Custom", start: day, end: current.start }));
      return;
    }
    setDraft((current) => ({ ...current, label: "Custom", end: day }));
    setSelectingEnd(false);
  }

  function updateStart(valueFromInput: string) {
    setDraft((current) => ({ ...current, label: "Custom", start: fromInputValue(valueFromInput) }));
    setSelectingEnd(false);
  }

  function updateEnd(valueFromInput: string) {
    setDraft((current) => ({ ...current, label: "Custom", end: fromInputValue(valueFromInput) }));
    setSelectingEnd(false);
  }

  function apply() {
    if (invalidRange) return;
    const label = draft.label === "Custom" ? formatRange(draft.start, draft.end) : draft.label;
    onApply({ ...draft, label });
    setPanel("presets");
    setSelectingEnd(false);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function cancel() {
    setDraft(value);
    setPanel("presets");
    setSelectingEnd(false);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const selectedPreset = dateRangePresets.includes(draft.label as DateRangePreset) ? draft.label : "Custom";

  return <div className="date-range-picker" ref={panelRef}>
    <button ref={triggerRef} className={`date-range-trigger${open ? " open" : ""}`} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}><CalendarDays size={14} /><span>{value.label}</span><ChevronDown size={13} /></button>
    {open && panel === "presets" ? <div className="date-range-popover date-range-popover-presets" role="dialog" aria-label="Choose date range">
      <div className="date-range-preset-panel">
        <div className="date-range-popover-heading"><strong>Reporting period</strong><span>Select a preset or choose Custom.</span></div>
        <div className="date-range-preset-list" role="listbox" aria-label="Date range presets">{dateRangePresets.map((preset) => <button type="button" role="option" aria-selected={selectedPreset === preset} className={selectedPreset === preset ? "active" : ""} key={preset} onClick={() => selectPreset(preset)}><span>{preset}</span>{selectedPreset === preset ? <Check size={13} /> : null}</button>)}</div>
        <label className="date-range-field"><span>Compare to</span><span className="select-wrap"><select value={draft.compare} onChange={(event) => setDraft((current) => ({ ...current, compare: event.target.value as ComparisonOption }))}>{comparisonOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></span></label>
        <div className="date-range-actions"><button className="button primary" type="button" onClick={apply}><Check size={13} /> Apply</button><button className="button" type="button" onClick={cancel}>Cancel</button></div>
      </div>
    </div> : null}
    {open && panel === "custom" ? <div className="date-range-popover date-range-popover-custom" role="dialog" aria-label="Choose custom date range">
      <div className="date-range-custom-header"><button type="button" className="date-range-back" onClick={() => setPanel("presets")}><ChevronLeft size={14} /> Presets</button><div><strong>Custom date range</strong><span>Select a start and end date.</span></div></div>
      <div className="date-range-custom-layout">
        <div className="date-range-calendar-panel">
          <div className="date-range-calendar-nav"><button type="button" className="calendar-nav-button" aria-label="Previous year" onClick={() => setVisibleMonth((current) => addYears(current, -1))}><ChevronsLeft size={15} /></button><button type="button" className="calendar-nav-button" aria-label="Previous month" onClick={() => setVisibleMonth((current) => addMonths(current, -1))}><ChevronLeft size={15} /></button><span className="calendar-nav-spacer" /><button type="button" className="calendar-nav-button" aria-label="Next month" onClick={() => setVisibleMonth((current) => addMonths(current, 1))}><ChevronRight size={15} /></button><button type="button" className="calendar-nav-button" aria-label="Next year" onClick={() => setVisibleMonth((current) => addYears(current, 1))}><ChevronsRight size={15} /></button></div>
          <div className="date-range-calendars"><CalendarMonth month={visibleMonth} days={firstCalendarDays} start={draft.start} end={draft.end} onSelect={selectDay} /><CalendarMonth month={nextMonth} days={secondCalendarDays} start={draft.start} end={draft.end} onSelect={selectDay} /></div>
        </div>
        <div className="date-range-options">
          <div className="date-range-inputs"><label className="date-range-field"><span>Start date</span><input type="date" value={toInputValue(draft.start)} onChange={(event) => updateStart(event.target.value)} /></label><label className="date-range-field"><span>End date</span><input type="date" value={toInputValue(draft.end)} onChange={(event) => updateEnd(event.target.value)} /></label></div>
          <label className="date-range-field"><span>Compare to</span><span className="select-wrap"><select value={draft.compare} onChange={(event) => setDraft((current) => ({ ...current, compare: event.target.value as ComparisonOption }))}>{comparisonOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></span></label>
          {invalidRange && <p className="date-range-error" role="alert">End date must be on or after the start date.</p>}
          <div className="date-range-actions"><button className="button primary" type="button" disabled={invalidRange} onClick={apply}><Check size={13} /> Apply</button><button className="button" type="button" onClick={cancel}>Cancel</button></div>
        </div>
      </div>
    </div> : null}
  </div>;
}

function CalendarMonth({ month, days, start, end, onSelect }: { month: Date; days: Array<Date | null>; start: Date; end: Date; onSelect: (date: Date) => void }) {
  return <div className="calendar-month"><h3>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3><div className="calendar-weekdays">{weekdayLabels.map((label) => <span key={label}>{label}</span>)}</div><div className="calendar-grid">{days.map((day, index) => day ? <button type="button" key={day.toISOString()} className={`calendar-day${sameDay(day, start) ? " is-start" : ""}${sameDay(day, end) ? " is-end" : ""}${isBetween(day, start, end) ? " is-in-range" : ""}`} aria-label={formatDate(day)} aria-pressed={sameDay(day, start) || sameDay(day, end) || isBetween(day, start, end)} onClick={() => onSelect(day)}>{day.getDate()}</button> : <span className="calendar-day empty" key={`empty-${index}`} aria-hidden="true" />)}</div></div>;
}
