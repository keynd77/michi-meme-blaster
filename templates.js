// Michi Meme Blaster — Template Editor
// Provides createTemplateTab(flyoutContainer, uploadFn)

const TEMPLATE_API = 'https://michi.meme/api/meme-templates';

const TEMPLATE_TYPES = [
  {
    id: 'sign',
    label: '📋 Sign',
    fields: [{ name: 'text', label: 'Sign text', placeholder: 'What should Michi hold?' }],
    variants: ['normal', 'smile', 'grumpy', 'mean', 'sideeyes', 'troll'],
  },
  {
    id: 'lesson',
    label: '📚 Lesson',
    fields: [
      { name: 'text1', label: 'Top text', placeholder: 'First lesson...' },
      { name: 'text2', label: 'Bottom text', placeholder: 'Second lesson...' },
    ],
    variants: ['normal', 'troll', 'smug', 'boss', 'neutral', 'excited', 'serious', 'crashout'],
  },
  {
    id: 'nsi',
    label: '🤔 NSI',
    fields: [
      { name: 'text1', label: 'Top text', placeholder: 'Not sure if...' },
      { name: 'text2', label: 'Bottom text', placeholder: 'Or just...' },
    ],
    variants: [],
  },
];

const TEMPLATE_STYLES = {
  bg: 'rgb(32,35,39)',
  border: 'rgb(47,51,54)',
  text: '#e7e9ea',
  accent: '#f7b731',
  blue: 'rgb(29,155,240)',
  fontFamily: '"TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

function createTemplateTab(flyoutContainer, uploadFn) {
  const panel = document.createElement('div');
  panel.id = 'michi-template-panel';
  panel.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 12px;
    font-family: ${TEMPLATE_STYLES.fontFamily};
    color: ${TEMPLATE_STYLES.text};
    font-size: 13px;
    box-sizing: border-box;
    gap: 10px;
  `;

  // --- State ---
  let selectedType = null;
  let selectedVariant = null;
  let generatedBlobUrl = null;

  // --- Type selector row ---
  const typeRow = document.createElement('div');
  typeRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

  const typeButtons = {};
  for (const tmpl of TEMPLATE_TYPES) {
    const btn = document.createElement('button');
    btn.textContent = tmpl.label;
    btn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid ${TEMPLATE_STYLES.border};
      border-radius: 20px;
      background: transparent;
      color: ${TEMPLATE_STYLES.text};
      cursor: pointer;
      font-size: 13px;
      font-family: ${TEMPLATE_STYLES.fontFamily};
      transition: border-color 0.15s, color 0.15s;
    `;
    btn.addEventListener('click', () => selectType(tmpl.id));
    typeButtons[tmpl.id] = btn;
    typeRow.appendChild(btn);
  }
  panel.appendChild(typeRow);

  // --- Form area (fields + variants) ---
  const formArea = document.createElement('div');
  formArea.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  panel.appendChild(formArea);

  // --- Generate button ---
  const generateBtn = document.createElement('button');
  generateBtn.textContent = '🎨 Generate & Preview';
  generateBtn.style.cssText = `
    padding: 8px 16px;
    border: none;
    border-radius: 20px;
    background: ${TEMPLATE_STYLES.accent};
    color: #000;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    font-family: ${TEMPLATE_STYLES.fontFamily};
    display: none;
  `;
  panel.appendChild(generateBtn);

  // --- Status / error message ---
  const statusEl = document.createElement('div');
  statusEl.style.cssText = `
    font-size: 12px;
    color: rgb(113,118,123);
    min-height: 16px;
    display: none;
  `;
  panel.appendChild(statusEl);

  // --- Preview area ---
  const previewArea = document.createElement('div');
  previewArea.style.cssText = 'display:none;flex-direction:column;align-items:center;gap:8px;';
  panel.appendChild(previewArea);

  const previewImg = document.createElement('img');
  previewImg.style.cssText = `
    max-width: 100%;
    max-height: 240px;
    border-radius: 8px;
    border: 1px solid ${TEMPLATE_STYLES.border};
    object-fit: contain;
  `;
  previewArea.appendChild(previewImg);

  const postBtn = document.createElement('button');
  postBtn.textContent = '🚀 Post it!';
  postBtn.style.cssText = `
    padding: 8px 20px;
    border: none;
    border-radius: 20px;
    background: ${TEMPLATE_STYLES.blue};
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    font-family: ${TEMPLATE_STYLES.fontFamily};
  `;
  postBtn.addEventListener('click', () => {
    if (generatedBlobUrl) {
      uploadFn(generatedBlobUrl);
    }
  });
  previewArea.appendChild(postBtn);

  // --- Field inputs map (reset on each type select) ---
  let fieldInputs = {};
  let variantBtns = {};

  function selectType(typeId) {
    selectedType = typeId;
    selectedVariant = null;
    generatedBlobUrl = null;
    previewArea.style.display = 'none';
    previewImg.src = '';
    statusEl.style.display = 'none';

    // Update type button styles
    for (const [id, btn] of Object.entries(typeButtons)) {
      btn.style.borderColor = id === typeId ? TEMPLATE_STYLES.accent : TEMPLATE_STYLES.border;
      btn.style.color = id === typeId ? TEMPLATE_STYLES.accent : TEMPLATE_STYLES.text;
    }

    const tmpl = TEMPLATE_TYPES.find(t => t.id === typeId);
    if (!tmpl) return;

    formArea.innerHTML = '';
    fieldInputs = {};
    variantBtns = {};

    // Field inputs
    for (const field of tmpl.fields) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

      const label = document.createElement('label');
      label.textContent = field.label;
      label.style.cssText = `font-size:11px;color:rgb(113,118,123);text-transform:uppercase;letter-spacing:0.5px;`;

      const input = document.createElement('textarea');
      input.placeholder = field.placeholder;
      input.rows = 2;
      input.style.cssText = `
        width: 100%;
        padding: 7px 10px;
        border: 1px solid ${TEMPLATE_STYLES.border};
        border-radius: 8px;
        background: rgb(22,24,28);
        color: ${TEMPLATE_STYLES.text};
        font-size: 13px;
        font-family: ${TEMPLATE_STYLES.fontFamily};
        outline: none;
        resize: vertical;
        box-sizing: border-box;
      `;
      input.addEventListener('focus', () => { input.style.borderColor = TEMPLATE_STYLES.blue; });
      input.addEventListener('blur', () => { input.style.borderColor = TEMPLATE_STYLES.border; });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      formArea.appendChild(wrapper);
      fieldInputs[field.name] = input;
    }

    // Variant selector
    if (tmpl.variants.length > 0) {
      const variantLabel = document.createElement('div');
      variantLabel.textContent = 'Variant';
      variantLabel.style.cssText = 'font-size:11px;color:rgb(113,118,123);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;';
      formArea.appendChild(variantLabel);

      const variantRow = document.createElement('div');
      variantRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';

      for (const v of tmpl.variants) {
        const vBtn = document.createElement('button');
        vBtn.textContent = v;
        vBtn.style.cssText = `
          padding: 4px 10px;
          border: 1px solid ${TEMPLATE_STYLES.border};
          border-radius: 14px;
          background: transparent;
          color: ${TEMPLATE_STYLES.text};
          cursor: pointer;
          font-size: 12px;
          font-family: ${TEMPLATE_STYLES.fontFamily};
        `;
        vBtn.addEventListener('click', () => selectVariant(v));
        variantBtns[v] = vBtn;
        variantRow.appendChild(vBtn);
      }
      formArea.appendChild(variantRow);

      // Default to first variant
      selectVariant(tmpl.variants[0]);
    }

    generateBtn.style.display = 'block';
  }

  function selectVariant(variant) {
    selectedVariant = variant;
    for (const [v, btn] of Object.entries(variantBtns)) {
      btn.style.borderColor = v === variant ? TEMPLATE_STYLES.accent : TEMPLATE_STYLES.border;
      btn.style.color = v === variant ? TEMPLATE_STYLES.accent : TEMPLATE_STYLES.text;
    }
  }

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#f4212e' : 'rgb(113,118,123)';
    statusEl.style.display = msg ? 'block' : 'none';
  }

  generateBtn.addEventListener('click', async () => {
    if (!selectedType) return;

    const tmpl = TEMPLATE_TYPES.find(t => t.id === selectedType);
    if (!tmpl) return;

    // Collect field values
    const body = {};
    for (const field of tmpl.fields) {
      const val = fieldInputs[field.name]?.value?.trim() || '';
      if (!val) {
        setStatus(`Please fill in "${field.label}"`, true);
        return;
      }
      body[field.name] = val;
    }
    if (selectedVariant) {
      body.variant = selectedVariant;
    }

    setStatus('Generating...');
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Generating...';
    previewArea.style.display = 'none';

    // Revoke previous blob
    if (generatedBlobUrl) {
      URL.revokeObjectURL(generatedBlobUrl);
      generatedBlobUrl = null;
    }

    try {
      const response = await fetch(`${TEMPLATE_API}/${selectedType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody.error || errMsg;
        } catch { /* ignore */ }
        setStatus(errMsg, true);
        return;
      }

      const blob = await response.blob();
      generatedBlobUrl = URL.createObjectURL(blob);
      previewImg.src = generatedBlobUrl;
      previewArea.style.display = 'flex';
      setStatus('');
    } catch (err) {
      console.error('[templates] Generate error:', err);
      setStatus('Network error. Check your connection.', true);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '🎨 Generate & Preview';
    }
  });

  return panel;
}
