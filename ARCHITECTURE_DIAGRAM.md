# 🏗️ Architecture & Flow Diagram

## Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│ CreateArticlePage / EditPage                                │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ useCreateArticle() / useEditArticle()                 │   │
│ │ - formData state                                      │   │
│ │ - handlePenangananChange (NEW)                        │   │
│ │ - handleSave (API call)                              │   │
│ └───────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────▼──────────────┐
                │   ArticleForm              │
                │ (Reusable component)       │
                │ Props:                     │
                │ - formData                 │
                │ - onChangePenanganan (NEW) │
                │ - onChangeKondisi          │
                │ - onChangeDetails          │
                │ - onSubmit                 │
                └────────────┬───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    RichTextEditor     PenangananEditor    KeywordTagInput
    (Content)          (Template Chat)     (Keywords)
                       └─── Variable
                            Autocomplete
```

## State Management Flow

```
User Input (Type in Template Chat)
        │
        ▼
PenangananEditor onChange event
        │
        ▼
handlePenangananChange callback
        │
        ▼
setFormData({...details, Penanganan: {...}})
        │
        ▼
formData updated in hook
        │
        ▼
Props passed back to ArticleForm
        │
        ▼
Template Chat textarea re-renders (stable)
```

## Data Transformation Pipeline

```
FRONTEND (Form Input)
┌──────────────────────────┐
│ Penanganan: {            │
│   judulPenanganan: "",   │
│   instruksiInternal: "", │
│   templateChat: ""       │
│ }                        │
│ Kondisi: "line1\nline2"  │
└────────────┬─────────────┘
             │
     buildArticleSavePayload()
             │
             ▼
BACKEND (API Payload)
┌──────────────────────────────────────┐
│ Penanganan: [{                       │
│   judulPenanganan: "",               │
│   instruksiInternal: ["line1", ...], │
│   templateChat: ""                   │
│ }]                                   │
│ Kondisi: ["line1", "line2"]          │
└──────────────────────────────────────┘
```

## Create Article Flow

```
User Click "Publikasikan Artikel"
        │
        ▼
ArticleForm onSubmit event
        │
        ▼
handleSave() called
        │
        ├─── Validate form
        │
        ▼
keywordService.persistKeywords()
        │
        ▼
buildArticleSavePayload()
        │
        ▼
articleService.createArticle(payload)
        │
        ├─── POST /api/articles
        │
        ▼
Backend saves article
        │
        ▼
showToast("Berhasil dibuat!")
        │
        ▼
navigate("/") - Redirect to home
```

## Template Chat Variable System

```
AVAILABLE_VARIABLES (Constant)
├── nama_pelanggan
├── tanggal
├── nomor_tiket
├── sapaan
├── produk
└── status

User clicks @var button
        │
        ▼
showVariableMenu[fieldName] = true
        │
        ▼
Dropdown menu appears
        │
        ▼
User selects variable
        │
        ▼
insertVariable(fieldName, variableName)
        │
        ├─── Get textarea element
        ├─── Get cursor position
        ├─── Insert {{variable}} at position
        ├─── Update formData
        │
        ▼
Textarea re-renders with variable
        │
        ▼
Cursor positioned after variable
```

## Data Persistence

```
CREATE Article:
Form → validateForm → persistKeywords → buildPayload 
→ articleService.createArticle → POST /api/articles
→ Success: redirect home

EDIT Article:
Load article → mapArticleToForm → Display form
→ User modifies → persistKeywords → buildPayload
→ articleService.saveArticleChanges → PUT /api/articles/:id
→ Success: redirect home
```

## Error Handling

```
Try Create/Edit
        │
    ┌───┴──────────────────┐
    │                      │
    ▼                      ▼
Success            Error/Exception
    │                      │
    ├─ Toast success   ┌───┴────────────┐
    ├─ setError(null)  │                │
    ├─ Clear form      ▼                ▼
    ├─ redirect    Toast error      setError(msg)
    │
    ▼
Finally: isSaving = false
```

## Component Props Interface

```typescript
// ArticleForm Props
interface ArticleFormProps {
  formData: {
    title: string;
    content: string;
    details: {
      JenisLog: string;
      Kondisi: string;
      Penanganan: {
        judulPenanganan: string;
        instruksiInternal: string;
        templateChat: string;
      };
    };
    keywords: any[];
  };
  isSaving: boolean;
  onChangePenanganan?: (penanganan: object) => void;
  onChangeKondisi?: (kondisi: string) => void;
  onChangeDetails?: (field: string, value: any) => void;
  onChangeContent?: (content: string) => void;
  onChangeField?: (e: ChangeEvent) => void;
  onChangeKeywords?: (keywords: any[]) => void;
  onSubmit?: (e: FormEvent) => void;
  onCancel?: () => void;
  // ... error handlers
}

// PenangananEditor Props
interface PenangananEditorProps {
  value: {
    judulPenanganan: string;
    instruksiInternal: string;
    templateChat: string;
  };
  onChange: (penanganan: object) => void;
}
```

## API Endpoints Used

```
CREATE Article:
POST /api/articles
Content-Type: application/json
Body: {
  title, content, details, keyword, keywords, keywordIds
}
Response: article object

EDIT Article:
PUT /api/articles/:id
Content-Type: application/json
Body: {
  title, content, details, keyword, keywords, keywordIds
}
Response: updated article object

GET Articles List:
GET /api/articles
Response: articles array

GET Article Detail:
GET /api/articles/:id
Response: article object
```

## State Update Patterns

```javascript
// Proper pattern used:
const handlePenangananChange = useCallback((penanganan) => {
  setFormData((currentFormData) => ({
    ...currentFormData,
    details: {
      ...currentFormData.details,
      Penanganan: penanganan,
    },
  }));
}, []);

// Benefits:
✅ Closure doesn't capture stale state
✅ useCallback prevents re-renders
✅ Immutable state update
✅ No dependency on formData in dependency array
```

## Cursor Stability Implementation

```javascript
// Key to stability:
1. Controlled component with proper value prop
2. onChange handler without re-mount
3. TextareaAutosize doesn't unmount on size change
4. setTimeout(()=>focus, 0) for cursor positioning
5. setSelectionRange for cursor restoration

Result:
User types → State updates → Component re-renders
→ But textarea element isn't recreated
→ Cursor stays at correct position
```

## File Dependencies

```
useCreateArticle.js
├── articleService
├── keywordService
├── articleUtils (buildArticleSavePayload)
└── articleConstants (ARTICLE_MESSAGES)

useEditArticle.js
├── articleService
├── keywordService
├── articleUtils (mapArticleToForm, buildArticleSavePayload)
└── articleConstants

ArticleForm.jsx
├── PenangananEditor (NEW)
├── RichTextEditor
├── ArticlePreview
└── KeywordTagInput

PenangananEditor.jsx (NEW)
└── react-textarea-autosize
```

## Backward Compatibility

```
✅ Existing code still works
✅ PenangananEditor accepts formData.details.Penanganan
✅ If Penanganan is string, converts to object
✅ buildArticleSavePayload handles both formats
✅ Old articles can still be loaded and edited
```

---

This architecture ensures:
- **Stability**: No cursor jumping
- **Reusability**: ArticleForm used in create/edit
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add more fields/features
- **Performance**: useCallback prevents unnecessary renders
