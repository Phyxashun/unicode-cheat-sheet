// ~ FILE-PATH: src/components/Header.tsx

import { type FC } from "react";
import Logo from "./Logo";

type Category = { name: string; start: number; end: number };

type HeaderProps = {
  search: string;
  fontSize: number;
  categories: Category[];
  onSearchChange: (value: string) => void;
  onFontSizeChange: (value: number) => void;
  onCategoryChange: (value: string) => void;
};

const FONT_SIZES = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144];

const Header: FC<HeaderProps> = ({
  search,
  fontSize,
  categories,
  onSearchChange,
  onFontSizeChange,
  onCategoryChange,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-10 flex flex-col items-center gap-4 border-b border-(--border) p-4 shadow-sm">
      <Logo />

      <div className="flex w-full max-w-4xl flex-col items-center gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search hex code (e.g., f1a0)..."
          autoComplete="off"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full grow rounded-lg border border-(--border) bg-(--code-bg) p-3 text-sm text-(--text-h) shadow-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
        />
        <div className="flex w-full gap-3 sm:w-auto">
          <select
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="w-full rounded-lg border border-(--border) bg-(--code-bg) p-3 text-sm text-(--text-h) shadow-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none sm:w-auto"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <select
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-lg border border-(--border) bg-(--code-bg) p-3 text-sm text-(--text-h) shadow-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none sm:w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map(({ name, start, end }) => (
              <option key={name} value={`${start}-${end}`}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

export default Header;
