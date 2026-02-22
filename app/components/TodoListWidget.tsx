"use client";

import React, { useState, useEffect, useRef } from "react";
import "./TodoListWidget.css";

/**
 * TodoListWidget - A draggable todo list widget for dashboard
 * Features:
 * - Add/remove todo items
 * - Mark items as completed (with strikethrough)
 * - localStorage persistence
 * - Drag & drop compatible
 * - Editable title
 * - Minimalist design
 * - Extensible for tags and deadlines
 */

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  tags: string[]; // For future tag support (#viktig, #les)
  deadline?: string; // For future deadline support
  createdAt: string;
}

interface TodoList {
  id: string;
  title: string;
  items: TodoItem[];
  createdAt: string;
  updatedAt: string;
}

interface TodoListWidgetProps {
  listId: string;
  onDelete?: (listId: string) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const STORAGE_KEY = "legex_todos";

// Generate unique ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Main TodoListWidget component
export default function TodoListWidget({
  listId,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
}: TodoListWidgetProps) {
  const [todoList, setTodoList] = useState<TodoList | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load todo list from localStorage
  useEffect(() => {
    const loadTodoList = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      try {
        const allLists = JSON.parse(stored) as Record<string, TodoList>;
        const foundList = allLists[listId];
        if (foundList) {
          setTodoList(foundList);
          setEditTitle(foundList.title);
        }
      } catch (error) {
        console.error("Failed to load todo lists from localStorage:", error);
      }
    };

    loadTodoList();
  }, [listId]);

  // Create initial todo list if doesn't exist
  useEffect(() => {
    if (todoList === null) {
      const newList: TodoList = {
        id: listId,
        title: "Huskeliste",
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTodoList(newList);
      setEditTitle(newList.title);
      saveTodoList(newList);
    }
  }, [todoList, listId]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  // Save todo list to localStorage
  const saveTodoList = (updatedList: TodoList) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allLists = stored ? JSON.parse(stored) : {};
      allLists[updatedList.id] = {
        ...updatedList,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLists));
      setTodoList(updatedList);
    } catch (error) {
      console.error("Failed to save todo list to localStorage:", error);
    }
  };

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setEditTitle(newTitle);
    if (todoList) {
      saveTodoList({ ...todoList, title: newTitle });
    }
  };

  // Add new todo item
  const handleAddItem = () => {
    if (!newItemText.trim() || !todoList) return;

    const newItem: TodoItem = {
      id: generateId(),
      text: newItemText.trim(),
      completed: false,
      tags: [],
      createdAt: new Date().toISOString(),
    };

    const updatedList = {
      ...todoList,
      items: [...todoList.items, newItem],
    };

    saveTodoList(updatedList);
    setNewItemText("");
    inputRef.current?.focus();
  };

  // Handle Enter key in add input
  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddItem();
    }
  };

  // Toggle item completion
  const handleToggleComplete = (itemId: string) => {
    if (!todoList) return;

    const updatedItems = todoList.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    // Sort: incomplete items first, completed items last
    const sortedItems = [
      ...updatedItems.filter((item) => !item.completed),
      ...updatedItems.filter((item) => item.completed),
    ];

    saveTodoList({ ...todoList, items: sortedItems });
  };

  // Delete todo item
  const handleDeleteItem = (itemId: string) => {
    if (!todoList) return;

    const updatedItems = todoList.items.filter((item) => item.id !== itemId);
    saveTodoList({ ...todoList, items: updatedItems });
  };

  // Start editing item
  const handleStartEdit = (itemId: string, currentText: string) => {
    setEditingItemId(itemId);
    setEditingItemText(currentText);
  };

  // Save edited item
  const handleSaveEdit = () => {
    if (!todoList || !editingItemId) return;

    const trimmedText = editingItemText.trim();
    if (!trimmedText) {
      // If empty, delete the item
      handleDeleteItem(editingItemId);
    } else {
      const updatedItems = todoList.items.map((item) =>
        item.id === editingItemId ? { ...item, text: trimmedText } : item
      );
      saveTodoList({ ...todoList, items: updatedItems });
    }

    setEditingItemId(null);
    setEditingItemText("");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItemText("");
  };

  // Handle edit key events
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Delete entire list
  const handleDeleteList = () => {
    if (!confirm("Slett hele huskelisten?")) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allLists = JSON.parse(stored);
        delete allLists[listId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allLists));
      }
    } catch (error) {
      console.error("Failed to delete todo list:", error);
    }

    onDelete?.(listId);
  };

  // Clear completed items
  const handleClearCompleted = () => {
    if (!todoList) return;

    const hasCompleted = todoList.items.some((item) => item.completed);
    if (!hasCompleted) return;

    if (!confirm("Fjern alle ferdige oppgaver?")) return;

    const updatedItems = todoList.items.filter((item) => !item.completed);
    saveTodoList({ ...todoList, items: updatedItems });
  };

  if (!todoList) {
    return <div className="todo-widget todo-widget-loading">Laster...</div>;
  }

  const completedCount = todoList.items.filter((item) => item.completed).length;
  const totalCount = todoList.items.length;

  return (
    <div
      className={`todo-widget ${isDragging ? "is-dragging" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Header */}
      <div className="todo-widget-header">
        <input
          type="text"
          className="todo-widget-title"
          value={editTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Tittel"
        />
        <div className="todo-widget-actions">
          {completedCount > 0 && (
            <button
              className="todo-action-btn todo-clear-btn"
              onClick={handleClearCompleted}
              title="Fjern ferdige"
            >
              ✓ Fjern ({completedCount})
            </button>
          )}
          <button
            className="todo-action-btn todo-delete-btn"
            onClick={handleDeleteList}
            title="Slett liste"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      {totalCount > 0 && (
        <div className="todo-progress">
          <div className="todo-progress-bar">
            <div
              className="todo-progress-fill"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
              }}
            />
          </div>
          <span className="todo-progress-text">
            {completedCount} av {totalCount} ferdig
          </span>
        </div>
      )}

      {/* Add new item */}
      <div className="todo-add-section">
        <input
          ref={inputRef}
          type="text"
          className="todo-add-input"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleAddKeyDown}
          placeholder="Legg til ny oppgave..."
        />
        <button
          className="todo-add-btn"
          onClick={handleAddItem}
          disabled={!newItemText.trim()}
        >
          + Legg til
        </button>
      </div>

      {/* Todo items list */}
      <div className="todo-items-list">
        {todoList.items.length === 0 ? (
          <div className="todo-empty-state">
            <p>Ingen oppgaver ennå.</p>
            <p className="todo-empty-hint">Legg til din første oppgave ovenfor!</p>
          </div>
        ) : (
          todoList.items.map((item) => (
            <div
              key={item.id}
              className={`todo-item ${item.completed ? "is-completed" : ""}`}
            >
              {/* Checkbox */}
              <label className="todo-checkbox-container">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleComplete(item.id)}
                  className="todo-checkbox"
                />
                <span className="todo-checkmark"></span>
              </label>

              {/* Item text / edit input */}
              {editingItemId === item.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  className="todo-edit-input"
                  value={editingItemText}
                  onChange={(e) => setEditingItemText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleSaveEdit}
                />
              ) : (
                <span
                  className="todo-item-text"
                  onDoubleClick={() => handleStartEdit(item.id, item.text)}
                  title="Dobbeltklikk for å redigere"
                >
                  {item.text}
                </span>
              )}

              {/* Delete button */}
              <button
                className="todo-item-delete"
                onClick={() => handleDeleteItem(item.id)}
                title="Slett oppgave"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      {todoList.items.length > 0 && (
        <div className="todo-footer-hint">
          Dobbeltklikk på en oppgave for å redigere
        </div>
      )}
    </div>
  );
}
