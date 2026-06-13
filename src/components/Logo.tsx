// ~ FILE-PATH: src/components/Logo.tsx

import { type FC } from "react";

interface LogoProps {
  image?: string;
  width?: string | number;
  height?: string | number;
}

const Logo: FC<LogoProps> = () => {
  return (
    <div
      id="logo"
      className="
        mask-radial mx-auto flex max-w-2xl
        items-center justify-center
        gap-x-4 rounded-xl
        bg-radial from-slate-100 via-slate-100/30 to-transparent
        mask-radial-from-0% mask-radial-to-70%
        p-11
        dark:from-slate-800 dark:via-slate-800/20 dark:to-transparent
      "
    >
      {/* Icon will go here later */}
      <div
        className="
        font-logo text-accent
        flex items-center justify-center
        text-6xl
        "
      >
        <span
          id="logo-zalgo"
          className="
            inline-flex justify-center text-center
            whitespace-nowrap select-none
          "
        >
          Ư̴̟̞̱̗͂͜ń̗̜͔͕̯́͑i̡̻̹͂͑͑͌̃c̴͐́̕͏̯̃͒o̡͇̟̪͑͆̋̾ď̴̞̱̞̔͑͟ḛ̏̿͟͏̞̗̻ ̩̮͓́͑́̏͠C͛͗͏̨̛̤̹͑h̡̛̜̮͛̿͐͝ȅ̴̴̝̮͔̂̓á̯̝̙͒̔̚͠ṯ̶̴̯̿̔͆̕s̜̱̱̼̽͒͏͟h̙̻̜͙̗́͆͝e̴̡̟̦̾̿̾̕e̴̤͇̞̟͑͆̈t̴͏̗̯̔͏̴̮
        </span>
      </div>
    </div>
  );
};

export default Logo;
