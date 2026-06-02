import { useRef, useState } from "react";

const AVAILABLE_VARIABLES = [
  { name: "nama_pelanggan", display: "Nama Pelanggan" },
  { name: "tanggal", display: "Tanggal" },
  { name: "nomor_tiket", display: "Nomor Tiket" },
  { name: "sapaan", display: "Sapaan (Bapak/Ibu)" },
  { name: "produk", display: "Produk" },
  { name: "status", display: "Status" },
];

const createEmptyStep = () => ({
  clientId: crypto.randomUUID(),
  judulPenanganan: "",
  instruksiInternal: "",
  templateChat: "",
});

const normalizeSteps = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((step, index) => ({
      clientId: step.clientId || step._id || step.id || `step-${index}`,
      _id: step._id,
      judulPenanganan: step.judulPenanganan || "",
      instruksiInternal: Array.isArray(step.instruksiInternal)
        ? step.instruksiInternal.join("\n")
        : step.instruksiInternal || "",
      templateChat: step.templateChat || "",
    }));
  }

  if (value && typeof value === "object") {
    return [
      {
        clientId: value.clientId || value._id || value.id || crypto.randomUUID(),
        _id: value._id,
        judulPenanganan: value.judulPenanganan || "",
        instruksiInternal: Array.isArray(value.instruksiInternal)
          ? value.instruksiInternal.join("\n")
          : value.instruksiInternal || "",
        templateChat: value.templateChat || "",
      },
    ];
  }

  return [createEmptyStep()];
};

function TemplateChatTextarea({
  menuKey,
  onChange,
  onCloseVariableMenu,
  onToggleVariableMenu,
  isVariableMenuOpen,
  value,
}) {
  const textareaRef = useRef(null);

  const insertVariable = (variable) => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variableText = `{{${variable}}}`;
    const nextValue = value.slice(0, start) + variableText + value.slice(end);
    const nextCursorPosition = start + variableText.length;

    onChange(nextValue);
    onCloseVariableMenu(menuKey);

    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"Masukkan template chat (plain text)\nGunakan {{variabel}} untuk placeholder"}
        rows={4}
        className="w-full px-4 py-3 pr-16 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y text-sm"
      />
      <button
        type="button"
        onClick={() => onToggleVariableMenu(menuKey)}
        className="absolute bottom-3 right-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition"
        title="Insert variable"
      >
        @var
      </button>

      {isVariableMenuOpen && (
        <div className="absolute bottom-12 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-max">
          {AVAILABLE_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              type="button"
              onClick={() => insertVariable(variable.name)}
              className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded transition"
            >
              <span className="font-mono text-indigo-600">
                {"{{"}{variable.name}{"}}"}
              </span>
              <span className="ml-2 text-slate-500">({variable.display})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PenangananStepEditor({
  canRemove,
  index,
  isVariableMenuOpen,
  onChangeField,
  onCloseVariableMenu,
  onRemove,
  onToggleVariableMenu,
  step,
}) {
  const menuKey = `${step.clientId}-templateChat`;

  return (
    <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">Tahap {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
          >
            Hapus
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Judul Penanganan
        </label>
        <input
          type="text"
          value={step.judulPenanganan}
          onChange={(event) => onChangeField("judulPenanganan", event.target.value)}
          placeholder="Contoh: Tahap 1: Dengarkan dan Pahami"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Instruksi Internal
        </label>
        <textarea
          value={step.instruksiInternal}
          onChange={(event) => onChangeField("instruksiInternal", event.target.value)}
          placeholder="Masukkan instruksi (satu per baris)"
          rows={3}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Setiap baris akan menjadi satu instruksi
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Template Chat
        </label>
        <TemplateChatTextarea
          menuKey={menuKey}
          value={step.templateChat}
          onChange={(nextValue) => onChangeField("templateChat", nextValue)}
          isVariableMenuOpen={isVariableMenuOpen}
          onToggleVariableMenu={onToggleVariableMenu}
          onCloseVariableMenu={onCloseVariableMenu}
        />
        <p className="mt-1 text-xs text-slate-500">
          Klik @var untuk menambahkan variabel otomatis
        </p>
      </div>
    </div>
  );
}

export default function PenangananEditor({ value = [], onChange }) {
  const [showVariableMenu, setShowVariableMenu] = useState({});
  const steps = normalizeSteps(value);

  const updateSteps = (nextSteps) => {
    onChange(nextSteps);
  };

  const handleStepFieldChange = (clientId, field, nextValue) => {
    updateSteps(
      steps.map((step) =>
        step.clientId === clientId ? { ...step, [field]: nextValue } : step,
      ),
    );
  };

  const handleAddStep = () => {
    updateSteps([...steps, createEmptyStep()]);
  };

  const handleRemoveStep = (clientId) => {
    if (steps.length === 1) return;

    updateSteps(steps.filter((step) => step.clientId !== clientId));
  };

  const handleToggleVariableMenu = (menuKey) => {
    setShowVariableMenu((currentMenu) => ({
      ...currentMenu,
      [menuKey]: !currentMenu[menuKey],
    }));
  };

  const handleCloseVariableMenu = (menuKey) => {
    setShowVariableMenu((currentMenu) => ({
      ...currentMenu,
      [menuKey]: false,
    }));
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const menuKey = `${step.clientId}-templateChat`;

        return (
          <PenangananStepEditor
            key={step.clientId}
            step={step}
            index={index}
            canRemove={steps.length > 1}
            isVariableMenuOpen={Boolean(showVariableMenu[menuKey])}
            onChangeField={(field, nextValue) =>
              handleStepFieldChange(step.clientId, field, nextValue)
            }
            onRemove={() => handleRemoveStep(step.clientId)}
            onToggleVariableMenu={handleToggleVariableMenu}
            onCloseVariableMenu={handleCloseVariableMenu}
          />
        );
      })}

      <button
        type="button"
        onClick={handleAddStep}
        className="w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        + Tambah Tahap Penanganan
      </button>
    </div>
  );
}
