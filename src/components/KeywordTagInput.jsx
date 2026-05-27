import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useKeywordSearch } from "../hooks/useKeywordSearch";
import { normalizeKeyword } from "../lib/keywordUtils";

const DEBOUNCE_DELAY_MS = 300;

const normalizeValue = (value) => value.trim().toLowerCase();

const isSameKeyword = (keyword, value) => keyword.value === normalizeValue(value);

const hasKeyword = (keywords, value) => keywords.some((keyword) => isSameKeyword(keyword, value));

const createNewKeywordOption = (label) => normalizeKeyword(label, { isNew: true });

const getUniqueKeywords = (keywords) => {
  const keywordMap = new Map();

  keywords.forEach((keyword) => {
    if (!keywordMap.has(keyword.value)) {
      keywordMap.set(keyword.value, keyword);
    }
  });

  return Array.from(keywordMap.values());
};

const KeywordTagInput = ({ value, onChange, onError }) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debouncedInputValue = useDebounce(inputValue, DEBOUNCE_DELAY_MS);
  const { keywordErrorMsg, keywords, isErrorKeywords, isSearchingKeywords } = useKeywordSearch(debouncedInputValue);

  const selectedKeywords = useMemo(() => value || [], [value]);
  const normalizedInput = normalizeValue(inputValue);
  const isWaitingForDebounce = inputValue.trim() !== debouncedInputValue.trim();

  const availableKeywords = useMemo(
    () => getUniqueKeywords(keywords).filter((keyword) => !hasKeyword(selectedKeywords, keyword.label)),
    [keywords, selectedKeywords],
  );

  const canAddNewKeyword =
    normalizedInput &&
    !isWaitingForDebounce &&
    !isSearchingKeywords &&
    !hasKeyword(selectedKeywords, inputValue) &&
    !keywords.some((keyword) => isSameKeyword(keyword, inputValue));
  const showDropdown = isFocused && (inputValue.trim() || isWaitingForDebounce || isSearchingKeywords || isErrorKeywords);

  const addKeyword = (keyword) => {
    if (!keyword?.label || hasKeyword(selectedKeywords, keyword.label)) {
      return;
    }

    onChange([...selectedKeywords, keyword]);
    setInputValue("");
  };

  const removeKeyword = (keywordToRemove) => {
    onChange(selectedKeywords.filter((keyword) => keyword.value !== keywordToRemove.value));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();

      if (availableKeywords.length > 0) {
        addKeyword(availableKeywords[0]);
        return;
      }

      if (canAddNewKeyword) {
        addKeyword(createNewKeywordOption(inputValue));
      }
    }

    if (event.key === "Backspace" && !inputValue && selectedKeywords.length > 0) {
      removeKeyword(selectedKeywords[selectedKeywords.length - 1]);
    }
  };

  const handleBlur = () => {
    window.setTimeout(() => setIsFocused(false), 120);
  };

  useEffect(() => {
    if (isErrorKeywords && keywordErrorMsg) {
      onError?.(keywordErrorMsg);
    }
  }, [isErrorKeywords, keywordErrorMsg, onError]);

  return (
    <div className="relative">
      <div className="flex min-h-12 w-full flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 transition focus-within:ring-2 focus-within:ring-indigo-500">
        {selectedKeywords.map((keyword) => (
          <span
            key={keyword.value}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100"
          >
            <span className="truncate">{keyword.label}</span>
            <button
              type="button"
              onClick={() => removeKeyword(keyword)}
              className="rounded-full text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-800"
              aria-label={`Hapus keyword ${keyword.label}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onBlur={handleBlur}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedKeywords.length ? "Tambah keyword..." : "Cari atau tambah keyword..."}
          className="min-w-40 flex-1 border-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {(isWaitingForDebounce || isSearchingKeywords) && (
            <div className="px-4 py-3 text-sm text-slate-500">Mencari keyword...</div>
          )}

          {!isWaitingForDebounce && !isSearchingKeywords && isErrorKeywords && (
            <div className="px-4 py-3 text-sm text-rose-600">Gagal memuat suggestion keyword.</div>
          )}

          {!isWaitingForDebounce &&
            !isSearchingKeywords &&
            !isErrorKeywords &&
            availableKeywords.map((keyword) => (
              <button
                key={keyword.id || keyword.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addKeyword(keyword)}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                {keyword.label}
              </button>
            ))}

          {!isWaitingForDebounce && !isSearchingKeywords && !isErrorKeywords && canAddNewKeyword && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addKeyword(createNewKeywordOption(inputValue))}
              className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              + Tambahkan "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordTagInput;
