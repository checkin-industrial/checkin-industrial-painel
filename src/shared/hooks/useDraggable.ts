import { useEffect, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY_PREFIX = "draggable-position-";

export function useDraggable<T extends HTMLElement = HTMLElement>(elementId: string) {
  const ref = useRef<T>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartMouseRef = useRef<Position>({ x: 0, y: 0 });
  const dragStartPositionRef = useRef<Position>({ x: 0, y: 0 });
  const dragStartRectRef = useRef<DOMRect | null>(null);
  const positionRef = useRef<Position>({ x: 0, y: 0 });

  // Load position from localStorage on mount
  useEffect(() => {
    const storedPosition = localStorage.getItem(STORAGE_KEY_PREFIX + elementId);
    if (storedPosition) {
      try {
        const parsed = JSON.parse(storedPosition);
        setPosition(parsed);
        positionRef.current = parsed;
      } catch {
        // Ignore invalid stored position
      }
    }
  }, [elementId]);

  // Apply position to element
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (position.x === 0 && position.y === 0) {
      ref.current.style.transform = "";
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const minX = -rect.left;
    const maxX = window.innerWidth - rect.right;
    const minY = -rect.top;
    const maxY = window.innerHeight - rect.bottom;

    const constrainedX = Math.max(minX, Math.min(position.x, maxX));
    const constrainedY = Math.max(minY, Math.min(position.y, maxY));

    if (constrainedX !== position.x || constrainedY !== position.y) {
      setPosition({ x: constrainedX, y: constrainedY });
      return;
    }

    ref.current.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
  }, [position]);

  // Keep ref updated
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!ref.current || e.button !== 0) return;

    dragStartMouseRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
    dragStartPositionRef.current = positionRef.current;
    dragStartRectRef.current = ref.current.getBoundingClientRect();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) {
      // Save position to localStorage when drag ends
      localStorage.setItem(STORAGE_KEY_PREFIX + elementId, JSON.stringify(positionRef.current));
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;

      const startMouse = dragStartMouseRef.current;
      const startPosition = dragStartPositionRef.current;
      const startRect = dragStartRectRef.current;

      const deltaX = e.clientX - startMouse.x;
      const deltaY = e.clientY - startMouse.y;

      let constrainedX = startPosition.x + deltaX;
      let constrainedY = startPosition.y + deltaY;

      if (startRect) {
        // Keep the panel visible in the viewport regardless of left/right anchoring.
        const minDeltaX = -startRect.left;
        const maxDeltaX = window.innerWidth - startRect.right;
        const minDeltaY = -startRect.top;
        const maxDeltaY = window.innerHeight - startRect.bottom;

        const clampedDeltaX = Math.max(minDeltaX, Math.min(deltaX, maxDeltaX));
        const clampedDeltaY = Math.max(minDeltaY, Math.min(deltaY, maxDeltaY));

        constrainedX = startPosition.x + clampedDeltaX;
        constrainedY = startPosition.y + clampedDeltaY;
      }

      setPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, elementId]);

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    localStorage.removeItem(STORAGE_KEY_PREFIX + elementId);
  };

  return {
    ref: ref as React.RefObject<T>,
    isDragging,
    handleMouseDown,
    resetPosition,
    position,
  };
}
