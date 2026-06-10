import InternalInstructionEditor from "./InternalInstructionEditor";
import TemplateChatEditor from "./TemplateChatEditor";
import {
  HANDLING_ITEM_LABELS,
  HANDLING_ITEM_TYPES,
  createEmptyHandlingStep,
  createHandlingItem,
  hasHandlingItemContent,
  normalizeHandlingItemType,
} from "../lib/handlingItems";

const getStepKey = (step, index) => step?._id || step?.id || `handling-${index}`;
const getItemKey = (item, index) => item?._id || item?.id || `item-${index}`;

const moveArrayItem = (items, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= items.length) return items;

  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
};

export default function HandlingBuilder({
  onChange,
  onCloseVariableMenu,
  onToggleVariableMenu,
  showToast,
  showVariableMenu = {},
  steps = [],
}) {
  const safeSteps = steps.length ? steps : [createEmptyHandlingStep()];

  const updateSteps = (nextSteps) => {
    onChange(nextSteps.length ? nextSteps : [createEmptyHandlingStep()]);
  };

  const updateStep = (stepIndex, updater) => {
    updateSteps(
      safeSteps.map((step, index) =>
        index === stepIndex ? updater(step) : step,
      ),
    );
  };

  const addStep = () => {
    updateSteps([...safeSteps, createEmptyHandlingStep()]);
  };

  const removeStep = (stepIndex) => {
    if (safeSteps.length === 1) {
      showToast?.("Minimal harus ada satu penanganan.", "error");
      return;
    }

    updateSteps(safeSteps.filter((_, index) => index !== stepIndex));
  };

  const moveStep = (stepIndex, direction) => {
    updateSteps(moveArrayItem(safeSteps, stepIndex, stepIndex + direction));
  };

  const addItem = (stepIndex, type) => {
    updateStep(stepIndex, (step) => ({
      ...step,
      items: [...(Array.isArray(step.items) ? step.items : []), createHandlingItem(type)],
    }));
  };

  const updateItem = (stepIndex, itemIndex, value) => {
    updateStep(stepIndex, (step) => ({
      ...step,
      items: (Array.isArray(step.items) ? step.items : []).map((item, index) =>
        index === itemIndex ? { ...item, content: value } : item,
      ),
    }));
  };

  const removeItem = (stepIndex, itemIndex) => {
    updateStep(stepIndex, (step) => {
      const currentItems = Array.isArray(step.items) ? step.items : [];

      if (currentItems.length === 1) {
        showToast?.("Minimal harus ada satu item pada penanganan.", "error");
        return step;
      }

      return {
        ...step,
        items: currentItems.filter((_, index) => index !== itemIndex),
      };
    });
  };

  const moveItem = (stepIndex, itemIndex, direction) => {
    updateStep(stepIndex, (step) => ({
      ...step,
      items: moveArrayItem(Array.isArray(step.items) ? step.items : [], itemIndex, itemIndex + direction),
    }));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Penanganan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Susun penanganan secara dinamis. Setiap penanganan dapat berisi instruksi, template chat, dan catatan.
          </p>
        </div>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          + Tambah Penanganan
        </button>
      </div>

      <div className="space-y-6">
        {safeSteps.map((step, stepIndex) => {
          const stepKey = getStepKey(step, stepIndex);
          const items = Array.isArray(step.items) && step.items.length
            ? step.items
            : [createHandlingItem(HANDLING_ITEM_TYPES.instruction)];

          return (
            <div
              key={stepKey}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Penanganan {stepIndex + 1}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveStep(stepIndex, -1)}
                    disabled={stepIndex === 0}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Naik
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(stepIndex, 1)}
                    disabled={stepIndex === safeSteps.length - 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Turun
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(stepIndex)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Judul Penanganan
                </span>
                <input
                  type="text"
                  value={step.judulPenanganan || ""}
                  onChange={(event) =>
                    updateStep(stepIndex, (currentStep) => ({
                      ...currentStep,
                      judulPenanganan: event.target.value,
                    }))
                  }
                  placeholder="Contoh: Probing awal kendala user"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </label>

              <div className="mt-5 space-y-4">
                {items.map((item, itemIndex) => {
                  const itemKey = getItemKey(item, itemIndex);
                  const type = normalizeHandlingItemType(item.type);
                  const editorId = `handling-${stepKey}-${itemKey}`;

                  return (
                    <div
                      key={itemKey}
                      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {HANDLING_ITEM_LABELS[type]}
                          </p>
                          {!hasHandlingItemContent(item) && (
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              Item ini belum diisi.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveItem(stepIndex, itemIndex, -1)}
                            disabled={itemIndex === 0}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Naik
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(stepIndex, itemIndex, 1)}
                            disabled={itemIndex === items.length - 1}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Turun
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(stepIndex, itemIndex)}
                            className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>

                      {type === HANDLING_ITEM_TYPES.template ? (
                        <TemplateChatEditor
                          id={editorId}
                          value={item.content || ""}
                          onChange={(value) => updateItem(stepIndex, itemIndex, value)}
                          placeholder="Masukkan template chat. Gunakan toolbar untuk numbering/bullet dan {{variabel}} untuk placeholder."
                          label="Template Chat"
                          isVariableMenuOpen={Boolean(showVariableMenu[editorId])}
                          onToggleVariableMenu={onToggleVariableMenu}
                          onCloseVariableMenu={onCloseVariableMenu}
                        />
                      ) : (
                        <InternalInstructionEditor
                          id={editorId}
                          value={item.content || ""}
                          onChange={(value) => updateItem(stepIndex, itemIndex, value)}
                          placeholder={
                            type === HANDLING_ITEM_TYPES.note
                              ? "Tulis catatan khusus untuk penanganan ini."
                              : "Tulis instruksi internal untuk agen."
                          }
                          label={HANDLING_ITEM_LABELS[type]}
                          defaultMaxDepth={type === HANDLING_ITEM_TYPES.note ? 3 : 2}
                          helperText={
                            type === HANDLING_ITEM_TYPES.note
                              ? "Catatan ditampilkan berbeda di halaman detail SOP."
                              : "Gunakan list dan tombol indent/outdent untuk membuat instruksi bertingkat."
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addItem(stepIndex, HANDLING_ITEM_TYPES.instruction)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                >
                  + Internal Instruction
                </button>
                <button
                  type="button"
                  onClick={() => addItem(stepIndex, HANDLING_ITEM_TYPES.template)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100"
                >
                  + Template Chat
                </button>
                <button
                  type="button"
                  onClick={() => addItem(stepIndex, HANDLING_ITEM_TYPES.note)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                >
                  + Catatan
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
