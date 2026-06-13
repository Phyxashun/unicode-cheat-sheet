// ~ FILE-PATH: src/components/Card.tsx

import { type FC, useState } from "react";

type CardProps = {
  code: number;
  hex: string;
  name: string;
  fontSize: number;
  onCopy: (char: string) => void;
};

const Card: FC<CardProps> = ({ code, hex, name, fontSize, onCopy }) => {
  const [isCopied, setIsCopied] = useState(false);
  const iconChar = String.fromCodePoint(code);

  const handleCopy = () => {
    onCopy(iconChar);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`group relative flex w-full flex-col items-center justify-center rounded-lg border p-4 text-center shadow-md transition-all duration-150 ease-in-out hover:border-violet-400 focus:ring-2 focus:ring-violet-500 focus:outline-none active:scale-95 ${
        isCopied
          ? "border-violet-500 ring-2 ring-violet-300"
          : "border-(--border)"
      } bg-(--bg)`}
    >
      <div
        className={`transition-opacity duration-150 ${isCopied ? "opacity-10" : "opacity-100"}`}
      >
        <div
          className="flex items-center justify-center font-mono text-(--text-h)"
          style={{ fontSize: `${fontSize}px` }}
        >
          {iconChar}
        </div>
      </div>
      <h3 className="mt-5 text-base font-medium tracking-tight text-gray-900 dark:text-white">
        U+{hex}
      </h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400" title={name}>
        {name}
      </p>
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-violet-600 transition-opacity duration-150 dark:text-violet-400 ${
          isCopied ? "opacity-100" : "opacity-0"
        }`}
      >
        Copied!
      </div>
    </button>
  );
};

export default Card;
