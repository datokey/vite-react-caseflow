# 🧪 Testing Guide & Verification Steps

## Pre-Test Setup

### 1. Start Development Server
```bash
npm run dev
# Dev server will start on http://localhost:5176 (or next available port)
```

### 2. Verify Build Passes
```bash
npm run build
# Should complete successfully with no errors
```

### 3. Check Dependencies
```bash
npm list react-textarea-autosize
# Should be installed and available
```

## Test 1: Create Article Flow

### Scenario: Create a new SOP article

**Steps**:
1. Navigate to `http://localhost:5176/create`
2. Fill in the form:
   - **Judul Artikel**: "Panduan Penanganan Keluhan Pelanggan"
   - **Konten Artikel**: "Artikel ini menjelaskan langkah-langkah..."
   - **Jenis Log**: Select "Panduan Operasional"
   - **Kondisi**: 
     ```
     Pelanggan marah tentang kualitas produk
     Delay pengiriman
     Kesalahan dalam pesanan
     ```
   - **Penanganan - Judul**: "Tahap 1: Dengarkan dan Pahami"
   - **Penanganan - Instruksi Internal**:
     ```
     Dengarkan keluh kesah pelanggan hingga selesai
     Tunjukkan empati dan pemahaman
     Catat poin-poin penting
     ```
   - **Penanganan - Template Chat**: "Saya memahami frustrasi Anda, {{nama_pelanggan}}"

**Expected Results**:
- ✅ All fields render correctly
- ✅ Textarea auto-resizes as you type
- ✅ No console errors
- ✅ Each field accepts input normally

### Test 2: Template Chat Cursor Stability

**Scenario**: Type in Template Chat field without losing focus

**Steps**:
1. Click in Template Chat textarea
2. Type multiple characters: "Halo {{nama_pelanggan}}, bagaimana kabar Anda?"
3. Observe cursor position after each character
4. Verify you can continue typing without interruption

**Expected Results**:
- ✅ Cursor stays at end of text after each keystroke
- ✅ No jumping or re-positioning
- ✅ Can type continuously without clicking again
- ✅ Form doesn't re-render visibly

**Fail Conditions** ❌:
- Cursor moves to different position after typing
- Need to click field again to continue typing
- Form visibly re-renders during typing

### Test 3: Variable Insertion

**Scenario**: Insert variable in Template Chat

**Steps**:
1. Click in Template Chat field after some text
2. Click `@var` button
3. Verify dropdown menu appears with 6 variables:
   - nama_pelanggan
   - tanggal
   - nomor_tiket
   - sapaan
   - produk
   - status
4. Click on "nama_pelanggan"
5. Verify `{{nama_pelanggan}}` is inserted at cursor

**Expected Results**:
- ✅ Dropdown appears when clicking @var
- ✅ All 6 variables are visible
- ✅ Clicking variable inserts `{{variableName}}`
- ✅ Cursor positioned correctly after insertion
- ✅ Can continue typing after insertion
- ✅ Dropdown closes after selection

### Test 4: Form Submission

**Scenario**: Save article to database

**Steps**:
1. Complete all required fields (title, content, JenisLog)
2. Click "Publikasikan Artikel" button
3. Observe loading state (button shows spinner)
4. Wait for success notification

**Expected Results**:
- ✅ Button shows loading spinner
- ✅ Button becomes disabled during save
- ✅ Toast notification appears: "Artikel berhasil dibuat!"
- ✅ Page redirects to home (`/`)
- ✅ New article appears in list

**Failure Handling**:
- ❌ If error occurs: Toast shows error message
- ❌ Form stays on page for correction
- ❌ No data loss

### Test 5: Edit Article Flow

**Scenario**: Edit existing article

**Steps**:
1. Create an article (from Test 1)
2. Navigate to home page
3. Click on article (or go to `/edit/:id` directly)
4. Edit Template Chat field
5. Verify cursor is stable while editing
6. Click "Simpan Perubahan"

**Expected Results**:
- ✅ Article loads correctly
- ✅ All fields pre-populated
- ✅ Template Chat field is editable
- ✅ Cursor stays stable while editing
- ✅ Save succeeds with success message
- ✅ Changes visible after redirect

### Test 6: Data Format Validation

**Scenario**: Verify data is saved in correct format

**Steps**:
1. Create article with multi-line Kondisi and Instruksi Internal
2. Save article
3. In browser console: Check Network tab
4. Find the POST request to `/api/articles`
5. Examine request payload

**Expected Payload Structure**:
```javascript
{
  "title": "string",
  "content": "string",
  "details": {
    "JenisLog": "string",
    "Kondisi": ["item1", "item2", "item3"],  // ← Array
    "Penanganan": [{
      "judulPenanganan": "string",
      "instruksiInternal": ["item1", "item2"],  // ← Array
      "templateChat": "string with {{variables}}"
    }]
  }
}
```

**Verification**:
- ✅ Kondisi is array (not string)
- ✅ Penanganan is array of objects
- ✅ instruksiInternal is array (not string)
- ✅ Variables are preserved: `{{nama_pelanggan}}`

### Test 7: Responsive Design

**Scenario**: Test on different screen sizes

**Steps - Desktop**:
1. Open DevTools (F12)
2. Set viewport to 1920x1080
3. Verify all fields are properly aligned
4. Verify buttons are full width or side-by-side

**Steps - Tablet**:
1. Set viewport to 768x1024
2. Verify form is readable
3. Verify buttons stack properly
4. Verify textarea is usable

**Steps - Mobile**:
1. Set viewport to 375x667
2. Verify form is responsive
3. Verify @var button is clickable
4. Verify dropdown doesn't overflow screen

**Expected Results**:
- ✅ All viewports render correctly
- ✅ Text is readable
- ✅ Buttons are clickable
- ✅ Form is usable on all sizes

### Test 8: Error Handling

**Scenario**: Submit form with validation errors

**Steps**:
1. Try submitting empty form
2. Click "Publikasikan Artikel" without filling anything
3. Observe validation message

**Expected Results**:
- ✅ Form shows validation error
- ✅ Article is NOT created
- ✅ Form stays on page
- ✅ Error message is clear

**Steps - Field-specific**:
1. Fill title only
2. Leave other required fields empty
3. Try to submit

**Expected**: Validation prevents submission

### Test 9: Browser Console Check

**Scenario**: Verify no errors in console

**Steps**:
1. Open DevTools Console (F12)
2. Create an article
3. Edit an article
4. Type in Template Chat
5. Insert variables
6. Check console for errors

**Expected Results**:
- ✅ No red error messages
- ✅ No warnings about controlled components
- ✅ No React warnings
- ✅ Network requests show success (200 status)

## Performance Testing

### Typing Performance
```
Measure: Open Template Chat field
- Type 10 characters
- Measure latency (should be <50ms)

Expected: Smooth, no visible lag
```

### Variable Insertion Performance
```
Measure: Click @var button, select variable
- Total time: should be <100ms

Expected: Instant dropdown, quick insertion
```

## Checklist for Successful Implementation

### Component Rendering
- [ ] ArticleForm renders without errors
- [ ] PenangananEditor component loads
- [ ] TextareaAutosize works smoothly
- [ ] @var button visible and clickable

### User Interactions
- [ ] Can type in all textarea fields
- [ ] Cursor stays in place while typing
- [ ] Variable dropdown appears on button click
- [ ] Variables insert correctly

### Data Flow
- [ ] Form data updates on input
- [ ] Template Chat value updates reactively
- [ ] Penanganan data structure is correct
- [ ] Form state logging shows proper structure

### API Integration
- [ ] Create request sends to `/api/articles`
- [ ] Payload structure is correct
- [ ] Response is successful (200/201)
- [ ] Article appears in list

### Error Handling
- [ ] Validation messages appear
- [ ] Form doesn't submit with errors
- [ ] Error messages clear
- [ ] Success notifications work

### UI/UX
- [ ] Responsive on all screen sizes
- [ ] Touch-friendly on mobile
- [ ] Loading states visible
- [ ] No visual glitches

## Debugging Tips

### If Cursor Jumps:
```javascript
// Check in console:
1. document.activeElement  // Should be textarea
2. setInterval(() => console.log(document.activeElement), 500)
3. Look for unexpected re-mounts
```

### If Variable Insert Fails:
```javascript
// Check:
1. Is textarea element found? document.getElementById('textarea-templateChat')
2. Is selection working? console.log(textarea.selectionStart)
3. Is state updating? Check React DevTools
```

### If Create Fails:
```javascript
// In Network tab:
1. Check request payload structure
2. Check response status code
3. Check error message in response
4. Verify API endpoint in .env
```

## Performance Metrics

Acceptable performance:
- Form rendering: <500ms
- Character input latency: <50ms
- Variable dropdown: <100ms
- API request: <2000ms (depending on server)

## Sign-off Checklist

Before considering implementation complete:

- [ ] All 9 tests pass
- [ ] No console errors
- [ ] Cursor stable in Template Chat
- [ ] Create article saves successfully
- [ ] Edit article works smoothly
- [ ] Variable insertion works
- [ ] Data format is correct
- [ ] Responsive design works
- [ ] Error handling works
- [ ] Performance is acceptable

---

**Status**: Ready for testing ✅
