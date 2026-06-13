// ~ FILE-PATH: src/components/GlyphGrid.tsx

import {
  type FC,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Card from "./Card";

// Define the shape of data coming from our SQLite database
export type UnicodeCharRecord = {
  unicode_code: string;
  code_int: number;
  name: string;
};

type GlyphGridProps = {
  fontSize: number;
  search: string;
  category: { start: number; end: number } | null;
  onCopy: (char: string) => void;
};

const GlyphGrid: FC<GlyphGridProps> = ({
  fontSize,
  search,
  category,
  onCopy,
}) => {
  const [visibleGlyphs, setVisibleGlyphs] = useState<UnicodeCharRecord[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef<boolean>(false);

  // Reset the grid when filters change
  useEffect(() => {
    setVisibleGlyphs([]);
    setOffset(0);
    setHasMore(true);
  }, [search, category]);

  const loadMoreGlyphs = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;

    try {
      // Build search query parameters for our Bun SQLite server endpoint
      const params = new URLSearchParams({
        limit: "100",
        offset: offset.toString(),
        search: search,
        start: category ? category.start.toString() : "",
        end: category ? category.end.toString() : "",
      });

      const response = await fetch(`/api/glyphs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch glyphs");

      const data: UnicodeCharRecord[] = await response.json();

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setVisibleGlyphs((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
      }
    } catch (error) {
      console.error("Database query error:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [search, category, offset, hasMore]);

  const gridStyle = useMemo(() => {
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${fontSize + 100}px, 1fr))`,
    };
  }, [fontSize]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreGlyphs();
      }
    });

    if (sentinelRef.current) observer.current.observe(sentinelRef.current);
    return () => observer.current?.disconnect();
  }, [loadMoreGlyphs]);

  return (
    <main className="mx-auto w-full max-w-7xl p-4">
      <div className="grid gap-4" style={gridStyle}>
        {visibleGlyphs.map((char) => (
          <Card
            key={`card-${char.unicode_code}`}
            code={char.code_int}
            hex={char.unicode_code}
            name={char.name}
            fontSize={fontSize}
            onCopy={onCopy}
          />
        ))}
      </div>
      <div
        ref={sentinelRef}
        className="p-10 text-center font-mono text-sm text-(--text)"
      >
        {!hasMore
          ? "// End of Unicode Range reached."
          : "Loading symbols from database..."}
      </div>
    </main>
  );
};

export default GlyphGrid;
