
// src/App.tsx

import { type FC, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import GlyphGrid from './components/GlyphGrid';
import Particles from './components/Particles';
import { fetchGlyphData } from './utils/utils';

const App: FC = () => {
  const [fontSize, setFontSize] = useState<number>(36);
  const [search, setSearch] = useState<string>('');
  const [glyphNames, setGlyphNames] = useState<Map<number, string>>(new Map());
  const [categories, setCategories] = useState<{ name: string; start: number; end: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<{
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    fetchGlyphData().then(({ glyphNames, categories }) => {
      setGlyphNames(glyphNames);
      setCategories(categories);
    });
  }, []);

  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      setSelectedCategory(null);
    } else {
      const [start, end] = value.split('-').map(Number);
      setSelectedCategory({ start, end });
    }
  };

  const handleCopy = useCallback((char: string) => {
    navigator.clipboard.writeText(char);
  }, []);

  // Create a unique key from the current filters.
  const gridKey = `${selectedCategory?.start ?? 'all'}-${search}`;

  return (
    <div className='min-h-screen font-sans'>
      <Particles />
      <Header
        search={search}
        fontSize={fontSize}
        categories={categories}
        onSearchChange={setSearch}
        onFontSizeChange={setFontSize}
        onCategoryChange={handleCategoryChange}
      />
      <GlyphGrid
        key={gridKey}
        id={gridKey}
        glyphNames={glyphNames}
        fontSize={fontSize}
        search={search}
        category={selectedCategory}
        onCopy={handleCopy}
      />
    </div>
  );
};

export default App;

