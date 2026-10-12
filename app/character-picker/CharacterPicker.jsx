"use client";

import {useState, useRef, useCallback, useMemo} from "react";
import {Grid3X3, Square, Smile, Search} from "lucide-react";
import {cn} from "../cn.js";
import {categories as charCategories} from "./character-data.js";
import {emojiGroups} from "./emoji-data.js";

// Representative emoji for each group to use as tab icons
const emojiGroupIcons = {
  "Smileys & Emotion": "😀",
  "People & Body": "👋",
  "Animals & Nature": "🐱",
  "Food & Drink": "🍎",
  "Travel & Places": "🚀",
  Activities: "⚽",
  Objects: "💡",
  Symbols: "❤️",
  Flags: "🏁",
};

const topTabs = [
  {id: "box-drawing", label: "Box Drawing", Icon: Grid3X3},
  {id: "blocks", label: "Blocks", Icon: Square},
  {id: "emoji", label: "Emoji", Icon: Smile},
];

export function CharacterPicker({onInsert}) {
  const [activeTab, setActiveTab] = useState("emoji");
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(0);
  const [hoveredChar, setHoveredChar] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef(null);
  const searchRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    // Prevent the button click from stealing focus from the editor.
    // Exception: allow focus on the search input.
    if (e.target.tagName !== "INPUT") {
      e.preventDefault();
    }
  }, []);

  const handleClick = useCallback(
    (char) => {
      onInsert(char);
    },
    [onInsert],
  );

  // Find the active character category (box-drawing or blocks)
  const activeCharCategory = charCategories.find((c) => c.id === activeTab);

  // Current emoji group data
  const currentEmojiGroup = emojiGroups[activeEmojiGroup];

  // Search results across all emoji
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return null;
    const query = searchQuery.toLowerCase();
    const results = [];
    for (const group of emojiGroups) {
      for (const subgroup of group.subgroups) {
        for (const entry of subgroup.chars) {
          if (entry.name.toLowerCase().includes(query)) {
            results.push(entry);
          }
          if (results.length >= 200) return results;
        }
      }
    }
    return results;
  }, [searchQuery]);

  // Render a grid of characters
  const renderCharGrid = (chars) => (
    <div className={cn("grid grid-cols-8 gap-0.5")}>
      {chars.map((entry, i) => (
        <button
          key={`${entry.codePoint}-${i}`}
          onMouseDown={handleMouseDown}
          onClick={() => handleClick(entry.char)}
          onMouseEnter={() => setHoveredChar(entry)}
          onMouseLeave={() => setHoveredChar(null)}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded",
            "text-lg cursor-pointer",
            "hover:bg-blue-50 hover:scale-125 transition-transform duration-100",
            "active:bg-blue-100",
          )}
          title={entry.name}
        >
          {entry.char}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-md bg-white shadow-sm flex flex-col",
        "sticky top-0 max-h-[calc(100vh-120px)]",
      )}
    >
      {/* Top-level tabs: Box Drawing | Blocks | Emoji */}
      <div className={cn("flex border-b border-gray-200 bg-gray-50 rounded-t-md")}>
        {topTabs.map((tab) => {
          const {Icon} = tab;
          return (
            <button
              key={tab.id}
              onMouseDown={handleMouseDown}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-500 bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Emoji group sub-tabs (only when emoji tab is active) */}
      {activeTab === "emoji" && (
        <div className={cn("flex border-b border-gray-200 bg-gray-50/50 px-1 gap-0.5 overflow-x-auto")}>
          {emojiGroups.map((group, idx) => (
            <button
              key={group.label}
              onMouseDown={handleMouseDown}
              onClick={() => {
                setActiveEmojiGroup(idx);
                setSearchQuery("");
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              className={cn(
                "flex items-center justify-center p-1.5 rounded text-base transition-colors shrink-0",
                activeEmojiGroup === idx && !searchQuery ? "bg-blue-100" : "hover:bg-gray-100",
              )}
              title={group.label}
            >
              {emojiGroupIcons[group.label] || "📦"}
            </button>
          ))}
        </div>
      )}

      {/* Search bar (only when emoji tab is active) */}
      {activeTab === "emoji" && (
        <div className={cn("flex items-center gap-2 px-2 py-1.5 border-b border-gray-100")}>
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search emoji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("w-full text-xs bg-transparent outline-none placeholder:text-gray-400")}
          />
          {searchQuery && (
            <button
              onMouseDown={handleMouseDown}
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Hover preview bar */}
      <div className={cn("flex items-center gap-3 px-3 py-2 border-b border-gray-100 min-h-[52px] bg-gray-50/50")}>
        {hoveredChar ? (
          <>
            <span className="text-3xl leading-none">{hoveredChar.char}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-400 font-mono">{hoveredChar.codePoint}</span>
              <span className="text-[10px] text-gray-600 leading-tight truncate">{hoveredChar.name}</span>
            </div>
          </>
        ) : (
          <span className="text-xs text-gray-400">Hover a character to preview</span>
        )}
      </div>

      {/* Scrollable grid area */}
      <div ref={scrollRef} className={cn("overflow-y-auto flex-1 p-2")}>
        {/* Box Drawing / Blocks categories */}
        {activeCharCategory &&
          activeCharCategory.groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className={cn("text-[10px] text-gray-400 uppercase tracking-wider px-1 pb-1 font-medium")}>
                {group.label}
              </div>
              {renderCharGrid(group.chars)}
            </div>
          ))}

        {/* Emoji: search results */}
        {activeTab === "emoji" && searchResults && (
          <>
            <div className={cn("text-[10px] text-gray-400 uppercase tracking-wider px-1 pb-1 font-medium")}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </div>
            {searchResults.length > 0 ? (
              renderCharGrid(searchResults)
            ) : (
              <div className="text-xs text-gray-400 text-center py-4">No emoji found</div>
            )}
          </>
        )}

        {/* Emoji: browsing by group */}
        {activeTab === "emoji" &&
          !searchResults &&
          currentEmojiGroup?.subgroups.map((subgroup) => (
            <div key={subgroup.label} className="mb-3">
              <div className={cn("text-[10px] text-gray-400 uppercase tracking-wider px-1 pb-1 font-medium")}>
                {subgroup.label}
              </div>
              {renderCharGrid(subgroup.chars)}
            </div>
          ))}
      </div>
    </div>
  );
}
