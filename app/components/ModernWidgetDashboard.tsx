"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import "./ModernWidgetDashboard.css";
import type { BookmarkLink, DashboardWidget as Widget } from "@/app/utils/widgetStorage";

/**
 * ModernWidgetDashboard ("Lenker"), inspired by start.me:
 * - Bookmark boxes with favicons; add, edit, delete links directly in the box
 * - Drag links within a box and between boxes; drop a link from another tab to add it
 * - ⋯ menu on every box (works on touch), right-click still works on desktop
 * - Collapsed state is remembered
 * - Search across all links (Enter opens the first hit)
 * - Export/import as a backup
 *
 * LinkBoard only renders and edits; loading and saving is done by the caller
 * (see LinkMenu.tsx for the public tab and DefaultLinksEditor for /admin/lenker).
 * With editable=false visitors can open, search and collapse, nothing else.
 */

type TodoWidget = Extract<Widget, { type: "todo" }>;

interface ContextMenu {
  x: number;
  y: number;
  widgetId: string;
}

const GRID_COLUMNS = 4;

const COLOR_MAP: Record<string, { bg: string; border: string; hover: string; text: string }> = {
  default: { bg: "#ffffff", border: "#e5e7eb", hover: "#f9fafb", text: "#111827" },
  red: { bg: "#fef2f2", border: "#fecaca", hover: "#fee2e2", text: "#991b1b" },
  yellow: { bg: "#fefce8", border: "#fde047", hover: "#fef08a", text: "#854d0e" },
  green: { bg: "#f0fdf4", border: "#bbf7d0", hover: "#dcfce7", text: "#14532d" },
  blue: { bg: "#eff6ff", border: "#bfdbfe", hover: "#dbeafe", text: "#1e40af" },
};

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/** Accepts "felleskatalogen.no" and returns "https://felleskatalogen.no". */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  // Links to files on this site, e.g. /pdfs/KnuseDeleListen v16.pdf
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** "https://www.legemiddelhandboka.no/x" -> "Legemiddelhandboka" */
export function labelFromUrl(url: string): string {
  if (url.startsWith("/")) {
    const file = decodeURIComponent(url.split("/").pop() ?? url).replace(/\.[a-z0-9]+$/i, "");
    return file.replace(/[-_]+/g, " ");
  }
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const name = host.split(".").slice(0, -1).join(".") || host;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return null;
  }
}

function getFallbackIcon(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("avtalespesialist")) return "👨‍⚕️";
  if (urlLower.includes("knuse-dele-listen") || urlLower.includes(".pdf")) return "📄";
  return "🔗";
}

export interface LinkBoardProps {
  widgets: Widget[];
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>;
  editable: boolean;
  /** Extra content at the start of the footer row (status text, log out…). */
  footerStart?: React.ReactNode;
  /** Shown as «Tilbakestill» in the footer when given. */
  onReset?: () => void;
}

export function LinkBoard({ widgets, setWidgets, editable, footerStart, onReset }: LinkBoardProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [renameWidgetId, setRenameWidgetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [dropdownCellIndex, setDropdownCellIndex] = useState<number | null>(null);
  const [layoutMode, setLayoutMode] = useState<"grid" | "masonry">("masonry");
  const [search, setSearch] = useState("");
  const [addingLinkTo, setAddingLinkTo] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<{ widgetId: string; linkId: string } | null>(null);
  const [draggedLink, setDraggedLink] = useState<{ widgetId: string; linkId: string } | null>(null);
  const [linkDropAt, setLinkDropAt] = useState<{ widgetId: string; index: number } | null>(null);
  const [externalOverWidget, setExternalOverWidget] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dragOverTargetRef = useRef<number | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const updateWidget = (widgetId: string, update: (w: Widget) => Widget) =>
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? update(w) : w)));

  const updateLinks = (widgetId: string, update: (links: BookmarkLink[]) => BookmarkLink[]) =>
    updateWidget(widgetId, (w) => (w.type === "bookmark" ? { ...w, links: update(w.links) } : w));

  // ---------- widgets ----------

  const handleAddWidget = (type: "bookmark" | "note" | "todo", position: number) => {
    const base = {
      id: newId("widget"),
      color: "default" as const,
      pinned: false,
      position,
      createdAt: new Date().toISOString(),
    };
    const newWidget: Widget =
      type === "bookmark"
        ? { ...base, type: "bookmark", title: "Nye lenker", links: [] }
        : type === "note"
          ? { ...base, type: "note", title: "Nytt notat", content: "", width: 320, height: 280 }
          : { ...base, type: "todo", title: "Ny huskeliste", items: [] };
    setWidgets((prev) => [...prev, newWidget]);
    setDropdownPos(null);
    setRenameWidgetId(newWidget.id);
    setRenameValue(newWidget.title);
    if (type === "bookmark") setAddingLinkTo(newWidget.id);
  };

  const handleAddButtonClick = (e: React.MouseEvent<HTMLButtonElement>, cellIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      x: Math.max(10, Math.min(rect.left + rect.width / 2 - 100, window.innerWidth - 210)),
      y: rect.top + rect.height + 8,
    });
    setDropdownCellIndex(cellIndex);
  };

  const openMenuAt = (clientX: number, clientY: number, widgetId: string) => {
    const menuWidth = 230;
    const menuHeight = 420;
    let x = clientX;
    let y = clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    setContextMenu({ x: Math.max(10, x), y: Math.max(10, y), widgetId });
  };

  const handleContextMenu = (e: React.MouseEvent, widgetId: string) => {
    // Keep the browser's own menu on links and text fields (copy link, open in new window…).
    const target = e.target as HTMLElement;
    if (target.closest("a, input, textarea")) return;
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY, widgetId);
  };

  const handleRename = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget) {
      setRenameValue(widget.title);
      setRenameWidgetId(widgetId);
    }
    setContextMenu(null);
  };

  const handleSaveRename = () => {
    if (!renameWidgetId) return;
    if (renameValue.trim()) {
      updateWidget(renameWidgetId, (w) => ({ ...w, title: renameValue.trim() }));
    }
    setRenameWidgetId(null);
    setRenameValue("");
  };

  const handleChangeColor = (widgetId: string, color: Widget["color"]) => {
    updateWidget(widgetId, (w) => ({ ...w, color }));
    setContextMenu(null);
  };

  const handlePin = (widgetId: string) => {
    updateWidget(widgetId, (w) => ({ ...w, pinned: !w.pinned }));
    setContextMenu(null);
  };

  const handleDelete = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    const count = widget?.type === "bookmark" ? widget.links.length : 0;
    if (!confirm(count > 0 ? `Slette «${widget?.title}» med ${count} lenker?` : "Slette denne boksen?")) return;
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setContextMenu(null);
  };

  const handleMinimize = (widgetId: string) => {
    updateWidget(widgetId, (w) => ({ ...w, collapsed: !w.collapsed }));
    setContextMenu(null);
  };

  const handleSortLinks = (widgetId: string) => {
    updateLinks(widgetId, (links) => [...links].sort((a, b) => a.label.localeCompare(b.label, "nb")));
    setContextMenu(null);
  };

  const handleUpdateNote = (widgetId: string, content: string) => {
    updateWidget(widgetId, (w) => (w.type === "note" ? { ...w, content } : w));
  };

  const handleUpdateTodo = (widgetId: string, items: TodoWidget["items"]) => {
    updateWidget(widgetId, (w) => (w.type === "todo" ? { ...w, items } : w));
  };

  // ---------- links ----------

  const addLink = (widgetId: string, rawUrl: string, rawLabel: string, index?: number): boolean => {
    const url = normalizeUrl(rawUrl);
    if (!url) return false;
    const link: BookmarkLink = { id: newId("link"), url, label: rawLabel.trim() || labelFromUrl(url) };
    updateLinks(widgetId, (links) => {
      const next = [...links];
      next.splice(index ?? next.length, 0, link);
      return next;
    });
    updateWidget(widgetId, (w) => ({ ...w, collapsed: false }));
    return true;
  };

  const moveLink = (fromWidgetId: string, linkId: string, toWidgetId: string, toIndex: number) => {
    setWidgets((prev) => {
      const from = prev.find((w) => w.id === fromWidgetId);
      if (!from || from.type !== "bookmark") return prev;
      const link = from.links.find((l) => l.id === linkId);
      if (!link) return prev;
      const oldIndex = from.links.indexOf(link);
      let index = toIndex;
      if (fromWidgetId === toWidgetId && oldIndex < toIndex) index -= 1;
      return prev.map((w) => {
        if (w.type !== "bookmark") return w;
        let links = w.links;
        if (w.id === fromWidgetId) links = links.filter((l) => l.id !== linkId);
        if (w.id === toWidgetId) {
          links = [...links];
          links.splice(Math.max(0, Math.min(index, links.length)), 0, link);
        }
        return links === w.links ? w : { ...w, links };
      });
    });
  };

  const readExternalLink = (dt: DataTransfer): { url: string; label: string } | null => {
    const uriList = dt.getData("text/uri-list");
    const text = dt.getData("text/plain");
    const candidate = (uriList.split("\n").find((l) => l && !l.startsWith("#")) || text || "").trim();
    const url = normalizeUrl(candidate);
    if (!url) return null;
    // Chrome puts the page title in text/html as the link text when dragging a link.
    const html = dt.getData("text/html");
    const match = html.match(/<a[^>]*>([^<]+)<\/a>/i);
    return { url, label: match?.[1]?.trim() || "" };
  };

  const isExternalDrag = (e: React.DragEvent) =>
    !draggedLink && !draggedWidgetId && (e.dataTransfer.types.includes("text/uri-list") || e.dataTransfer.types.includes("text/plain"));

  const onLinkListDragOver = (e: React.DragEvent, widgetId: string, index: number | null, count: number) => {
    if (draggedLink) {
      e.preventDefault();
      e.stopPropagation();
      let target = count;
      if (index !== null) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        target = e.clientY > rect.top + rect.height / 2 ? index + 1 : index;
      }
      if (!linkDropAt || linkDropAt.widgetId !== widgetId || linkDropAt.index !== target) {
        setLinkDropAt({ widgetId, index: target });
      }
      return;
    }
    if (isExternalDrag(e)) {
      e.preventDefault();
      e.stopPropagation();
      if (externalOverWidget !== widgetId) setExternalOverWidget(widgetId);
    }
  };

  const onLinkListDrop = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedLink && linkDropAt) {
      moveLink(draggedLink.widgetId, draggedLink.linkId, linkDropAt.widgetId, linkDropAt.index);
    } else if (!draggedLink) {
      const ext = readExternalLink(e.dataTransfer);
      if (ext) addLink(widgetId, ext.url, ext.label);
    }
    setDraggedLink(null);
    setLinkDropAt(null);
    setExternalOverWidget(null);
  };

  // ---------- widget drag ----------

  const handleDragOver = (e: React.DragEvent, targetPosition: number) => {
    if (!draggedWidgetId) return;
    e.preventDefault();
    if (dragOverTargetRef.current === targetPosition) return;

    setWidgets((prev) => {
      const draggedWidget = prev.find((w) => w.id === draggedWidgetId);
      if (!draggedWidget) return prev;
      const ordered = [...prev].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position);
      const currentIndex = ordered.findIndex((w) => w.id === draggedWidgetId);
      if (currentIndex === -1 || currentIndex === targetPosition) return prev;
      ordered.splice(currentIndex, 1);
      ordered.splice(Math.min(targetPosition, ordered.length), 0, draggedWidget);
      dragOverTargetRef.current = targetPosition;
      return ordered.map((w, idx) => ({ ...w, position: idx }));
    });
  };

  const handleDragEnd = () => {
    dragOverTargetRef.current = null;
    setDraggedWidgetId(null);
  };

  // ---------- backup ----------

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ version: 2, widgets }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `legeassistent-lenker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const imported: Widget[] = Array.isArray(data) ? data : data.widgets;
      if (!Array.isArray(imported) || !imported.every((w) => w && typeof w.id === "string" && typeof w.type === "string")) {
        throw new Error("format");
      }
      if (!confirm(`Erstatte dagens oppsett med ${imported.length} bokser fra filen?`)) return;
      setWidgets(imported);
    } catch {
      alert("Filen kunne ikke leses. Bruk en fil laget med «Eksporter».");
    }
  };

  // ---------- render ----------

  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position),
    [widgets]
  );

  const q = search.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!q) return null;
    const hits = new Map<string, BookmarkLink[]>();
    for (const w of sortedWidgets) {
      if (w.type !== "bookmark") continue;
      const matches = w.links.filter(
        (l) => l.label.toLowerCase().includes(q) || l.url.toLowerCase().includes(q) || w.title.toLowerCase().includes(q)
      );
      if (matches.length) hits.set(w.id, matches);
    }
    return hits;
  }, [q, sortedWidgets]);

  const visibleWidgets = searchHits ? sortedWidgets.filter((w) => searchHits.has(w.id)) : sortedWidgets;
  const totalCells = searchHits || !editable
    ? visibleWidgets.length
    : Math.ceil((sortedWidgets.length + 1) / GRID_COLUMNS) * GRID_COLUMNS;
  const gridCells = Array.from({ length: totalCells }, (_, i) => i);
  const menuWidget = contextMenu ? widgets.find((w) => w.id === contextMenu.widgetId) : undefined;

  return (
    <div className="modern-widget-dashboard">
      <div className="dashboard-header">
        <input
          type="search"
          className="dashboard-search"
          placeholder="Søk i lenkene…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchHits) {
              const first = searchHits.values().next().value?.[0];
              if (first) window.open(first.url, "_blank", "noopener,noreferrer");
            }
            if (e.key === "Escape") setSearch("");
          }}
          aria-label="Søk i lenkene"
        />
        <button
          className="layout-toggle-btn"
          onClick={() => setLayoutMode(layoutMode === "grid" ? "masonry" : "grid")}
          title={layoutMode === "grid" ? "Bytt til flytende layout" : "Bytt til grid layout"}
        >
          {layoutMode === "grid" ? "📊 Grid" : "🧱 Flytende"}
        </button>
      </div>

      {searchHits && searchHits.size === 0 && <p className="dashboard-empty-search">Ingen lenker passer «{search}».</p>}

      <div className={`modern-widget-grid ${layoutMode === "masonry" ? "layout-masonry" : "layout-grid"}`}>
        {gridCells.map((cellIndex) => {
          const widget = visibleWidgets[cellIndex];

          if (!widget) {
            return (
              <div
                key={`empty-${cellIndex}`}
                className="widget-cell widget-cell-empty"
                onDragOver={(e) => handleDragOver(e, cellIndex)}
              >
                <div className="widget-add-menu">
                  <button
                    className="widget-add-trigger"
                    onClick={(e) => handleAddButtonClick(e, cellIndex)}
                    title="Legg til boks"
                  >
                    <span className="add-icon">+</span>
                  </button>
                </div>
              </div>
            );
          }

          const colorStyle = COLOR_MAP[widget.color] ?? COLOR_MAP.default;
          const isDragging = draggedWidgetId === widget.id;
          const collapsed = Boolean(widget.collapsed) && !searchHits;
          const todoProgress =
            widget.type === "todo" && widget.items.length > 0
              ? Math.round((widget.items.filter((item) => item.completed).length / widget.items.length) * 100)
              : 0;
          const shownLinks = widget.type === "bookmark" ? searchHits?.get(widget.id) ?? widget.links : [];

          return (
            <div
              key={widget.id}
              className={`widget-cell ${widget.pinned ? "is-pinned" : ""} ${isDragging ? "is-dragging" : ""} ${collapsed ? "is-minimized" : ""} ${externalOverWidget === widget.id ? "is-link-drop" : ""}`}
              onDragOver={(e) => handleDragOver(e, cellIndex)}
              onContextMenu={(e) => editable && handleContextMenu(e, widget.id)}
              style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
            >
              <div
                className="widget-header"
                style={{ color: colorStyle.text }}
                draggable={editable && !searchHits && renameWidgetId !== widget.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("application/x-legex-widget", widget.id);
                  setDraggedWidgetId(widget.id);
                }}
                onDragEnd={handleDragEnd}
                onClick={() => !searchHits && handleMinimize(widget.id)}
                title={collapsed ? "Vis innhold" : "Skjul innhold"}
              >
                <div className="widget-title-container">
                  {renameWidgetId === widget.id ? (
                    <input
                      type="text"
                      className="widget-title-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename();
                        if (e.key === "Escape") setRenameWidgetId(null);
                      }}
                      onBlur={handleSaveRename}
                      onFocus={(e) => e.currentTarget.select()}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3
                      className="widget-title"
                      onDoubleClick={(e) => {
                        if (!editable) return;
                        e.stopPropagation();
                        handleRename(widget.id);
                      }}
                    >
                      {widget.title}
                      {widget.type === "bookmark" && collapsed && widget.links.length > 0 && (
                        <span className="widget-count">{widget.links.length}</span>
                      )}
                    </h3>
                  )}
                </div>
                <div className="widget-header-actions">
                  {widget.pinned && <span className="pin-indicator">📌</span>}
                  <span className="widget-collapse-indicator" aria-hidden>
                    {collapsed ? "+" : "−"}
                  </span>
                  {editable && (
                  <button
                    type="button"
                    className="widget-menu-btn"
                    title="Meny"
                    aria-label={`Meny for ${widget.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      openMenuAt(rect.right - 230, rect.bottom + 4, widget.id);
                    }}
                  >
                    ⋯
                  </button>
                  )}
                </div>
              </div>

              <div className="widget-content">
                {widget.type === "bookmark" && (
                  <>
                    <ul
                      className="bookmark-list"
                      onDragOver={(e) => editable && onLinkListDragOver(e, widget.id, null, widget.links.length)}
                      onDragLeave={(e) => {
                        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                          setExternalOverWidget((cur) => (cur === widget.id ? null : cur));
                        }
                      }}
                      onDrop={(e) => onLinkListDrop(e, widget.id)}
                    >
                      {shownLinks.length === 0 && (
                        <li className="bookmark-empty">
                          {editable ? "Ingen lenker ennå. Trykk «+ Legg til lenke» eller dra en lenke hit." : "Ingen lenker."}
                        </li>
                      )}
                      {shownLinks.map((link, index) => {
                        const isEditing =
                          editingLink?.widgetId === widget.id && editingLink.linkId === link.id;
                        const showLine =
                          linkDropAt?.widgetId === widget.id &&
                          linkDropAt.index === index &&
                          draggedLink?.linkId !== link.id;
                        if (isEditing) {
                          return (
                            <li key={link.id} className="bookmark-item is-editing">
                              <LinkForm
                                initialUrl={link.url}
                                initialLabel={link.label}
                                submitLabel="Lagre"
                                onCancel={() => setEditingLink(null)}
                                onDelete={() => {
                                  updateLinks(widget.id, (links) => links.filter((l) => l.id !== link.id));
                                  setEditingLink(null);
                                }}
                                onSubmit={(url, label) => {
                                  const normalized = normalizeUrl(url);
                                  if (!normalized) return false;
                                  updateLinks(widget.id, (links) =>
                                    links.map((l) =>
                                      l.id === link.id
                                        ? { ...l, url: normalized, label: label.trim() || labelFromUrl(normalized) }
                                        : l
                                    )
                                  );
                                  setEditingLink(null);
                                  return true;
                                }}
                              />
                            </li>
                          );
                        }
                        const faviconUrl = getFaviconUrl(link.url);
                        return (
                          <React.Fragment key={link.id}>
                            {showLine && <li className="bookmark-drop-line" aria-hidden />}
                            <li
                              className={`bookmark-item${draggedLink?.linkId === link.id ? " is-dragging" : ""}`}
                              draggable={editable && !searchHits}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = "copyMove";
                                e.dataTransfer.setData("text/uri-list", link.url);
                                e.dataTransfer.setData("text/plain", link.url);
                                setDraggedLink({ widgetId: widget.id, linkId: link.id });
                              }}
                              onDragEnd={() => {
                                setDraggedLink(null);
                                setLinkDropAt(null);
                              }}
                              onDragOver={(e) => editable && onLinkListDragOver(e, widget.id, index, widget.links.length)}
                              onDrop={(e) => onLinkListDrop(e, widget.id)}
                            >
                              {faviconUrl && (
                                <img
                                  src={faviconUrl}
                                  alt=""
                                  className="bookmark-icon"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = "none";
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback?.classList.contains("bookmark-fallback-icon")) {
                                      fallback.style.display = "inline";
                                    }
                                  }}
                                />
                              )}
                              <span
                                className="bookmark-fallback-icon"
                                style={{ display: faviconUrl ? "none" : "inline" }}
                              >
                                {getFallbackIcon(link.url)}
                              </span>
                              <a href={link.url} target="_blank" rel="noreferrer" title={link.url} draggable={false}>
                                {link.label}
                              </a>
                              {searchHits && widget.title && <span className="bookmark-origin">{widget.title}</span>}
                              {editable && !searchHits && (
                                <span className="bookmark-actions">
                                  <button
                                    type="button"
                                    title="Rediger lenke"
                                    aria-label={`Rediger ${link.label}`}
                                    onClick={() => setEditingLink({ widgetId: widget.id, linkId: link.id })}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    title="Fjern lenke"
                                    aria-label={`Fjern ${link.label}`}
                                    onClick={() => updateLinks(widget.id, (links) => links.filter((l) => l.id !== link.id))}
                                  >
                                    ×
                                  </button>
                                </span>
                              )}
                            </li>
                          </React.Fragment>
                        );
                      })}
                      {linkDropAt?.widgetId === widget.id && linkDropAt.index === widget.links.length && widget.links.length > 0 && (
                        <li className="bookmark-drop-line" aria-hidden />
                      )}
                    </ul>

                    {editable &&
                      !searchHits &&
                      (addingLinkTo === widget.id ? (
                        <LinkForm
                          submitLabel="Legg til"
                          onCancel={() => setAddingLinkTo(null)}
                          onSubmit={(url, label) => addLink(widget.id, url, label)}
                          keepOpen
                        />
                      ) : (
                        <button type="button" className="bookmark-add-btn" onClick={() => setAddingLinkTo(widget.id)}>
                          + Legg til lenke
                        </button>
                      ))}
                  </>
                )}

                {widget.type === "note" && (
                  <div className="note-editor">
                    <textarea
                      value={widget.content}
                      onChange={(e) => handleUpdateNote(widget.id, e.target.value)}
                      readOnly={!editable}
                      placeholder="Skriv notater her..."
                      className="note-textarea"
                      style={{
                        width: "100%",
                        minHeight: "150px",
                        border: "none",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        padding: "0",
                      }}
                    />
                  </div>
                )}

                {widget.type === "todo" && (
                  <div className="todo-editor">
                    {widget.items.length > 0 && (
                      <div className="todo-progress-container">
                        <div className="todo-progress-bar">
                          <div className="todo-progress-fill" style={{ width: `${todoProgress}%` }} />
                        </div>
                        <span className="todo-progress-text">{todoProgress}%</span>
                      </div>
                    )}

                    <ul className="todo-list-editable">
                      {widget.items.map((item) => (
                        <li key={item.id} className={item.completed ? "completed" : ""}>
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) =>
                              handleUpdateTodo(
                                widget.id,
                                widget.items.map((i) => (i.id === item.id ? { ...i, completed: e.target.checked } : i))
                              )
                            }
                          />
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) =>
                              handleUpdateTodo(
                                widget.id,
                                widget.items.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i))
                              )
                            }
                            className="todo-text-input"
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              fontSize: "13px",
                              textDecoration: item.completed ? "line-through" : "none",
                            }}
                          />
                          <button
                            onClick={() => handleUpdateTodo(widget.id, widget.items.filter((i) => i.id !== item.id))}
                            className="todo-delete-btn"
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: "16px",
                              opacity: 0.5,
                              padding: "0 4px",
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() =>
                        handleUpdateTodo(widget.id, [...widget.items, { id: newId("todo"), text: "", completed: false }])
                      }
                      className="todo-add-btn"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px dashed rgba(0,0,0,0.2)",
                        background: "transparent",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}
                    >
                      + Legg til oppgave
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(editable || footerStart) && (
        <div className="dashboard-footer">
          {footerStart}
          {editable && (
            <>
              <button type="button" onClick={handleExport}>
                Eksporter
              </button>
              <button type="button" onClick={() => importRef.current?.click()}>
                Importer
              </button>
              {onReset && (
                <button type="button" onClick={onReset}>
                  Tilbakestill til standard
                </button>
              )}
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
      )}

      {contextMenu && menuWidget && (
        <div ref={contextMenuRef} className="widget-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {menuWidget.type === "bookmark" && (
            <>
              <button
                onClick={() => {
                  setAddingLinkTo(menuWidget.id);
                  updateWidget(menuWidget.id, (w) => ({ ...w, collapsed: false }));
                  setContextMenu(null);
                }}
              >
                ＋ Legg til lenke
              </button>
              {menuWidget.links.length > 1 && (
                <button onClick={() => handleSortLinks(menuWidget.id)}>↕ Sorter lenker A–Å</button>
              )}
              <div className="context-menu-divider"></div>
            </>
          )}
          <button onClick={() => handleRename(menuWidget.id)}>✏️ Gi nytt navn</button>
          <div className="context-menu-divider"></div>
          <div className="color-picker-menu">
            <span className="menu-label">Velg farge:</span>
            <div className="color-options">
              {Object.entries(COLOR_MAP).map(([colorKey, colorStyle]) => (
                <button
                  key={colorKey}
                  className="color-option"
                  style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
                  onClick={() => handleChangeColor(menuWidget.id, colorKey as Widget["color"])}
                  title={colorKey}
                />
              ))}
            </div>
          </div>
          <div className="context-menu-divider"></div>
          <button onClick={() => handleMinimize(menuWidget.id)}>
            {menuWidget.collapsed ? "+ Vis innhold" : "− Skjul innhold"}
          </button>
          <button onClick={() => handlePin(menuWidget.id)}>
            📌 {menuWidget.pinned ? "Løs fra toppen" : "Fest til toppen"}
          </button>
          <div className="context-menu-divider"></div>
          <button className="danger" onClick={() => handleDelete(menuWidget.id)}>
            🗑️ Slett boks
          </button>
        </div>
      )}

      {dropdownPos && dropdownCellIndex !== null && (
        <div
          ref={dropdownRef}
          className="widget-add-dropdown"
          style={{ top: dropdownPos.y, left: dropdownPos.x, opacity: 1, visibility: "visible" }}
        >
          <button onClick={() => handleAddWidget("bookmark", dropdownCellIndex)}>🔖 Lenkeboks</button>
          <button onClick={() => handleAddWidget("note", dropdownCellIndex)}>📝 Notat</button>
          <button onClick={() => handleAddWidget("todo", dropdownCellIndex)}>✓ Huskeliste</button>
        </div>
      )}
    </div>
  );
}

function LinkForm({
  initialUrl = "",
  initialLabel = "",
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  keepOpen,
}: {
  initialUrl?: string;
  initialLabel?: string;
  submitLabel: string;
  onSubmit: (url: string, label: string) => boolean;
  onCancel: () => void;
  onDelete?: () => void;
  keepOpen?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [label, setLabel] = useState(initialLabel);
  const [error, setError] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit(url, label)) {
      setError(true);
      return;
    }
    if (keepOpen) {
      setUrl("");
      setLabel("");
      setError(false);
      urlRef.current?.focus();
    }
  };

  return (
    <form className="bookmark-form" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <input
        ref={urlRef}
        className={error ? "has-error" : ""}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError(false);
        }}
        onPaste={(e) => {
          // Pasting a full URL into an empty name: suggest a name right away.
          const pasted = e.clipboardData.getData("text");
          const normalized = normalizeUrl(pasted);
          if (normalized && !label) setLabel(labelFromUrl(normalized));
        }}
        placeholder="Adresse, f.eks. felleskatalogen.no"
        inputMode="url"
        autoFocus
        aria-label="Adresse"
      />
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Navn (valgfritt)" aria-label="Navn" />
      {error && <span className="bookmark-form-error">Sjekk adressen.</span>}
      <div className="bookmark-form-actions">
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}>
            Slett
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onCancel}>
          {keepOpen ? "Ferdig" : "Avbryt"}
        </button>
        <button type="submit" className="primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
