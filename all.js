// 基本資料結構
    const TASKS_KEY = 'todolist_v1';
    const CATEGORIES_KEY = 'categories_v1'; 
    const DEFAULT_CATEGORIES = ['運動', '工作', '自我成長', '其他']; 

    let tasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
    let categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || DEFAULT_CATEGORIES; 

    // DOM
    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const todoList = document.getElementById('todoList');
    const categorySelect = document.getElementById('categorySelect');
    const prioritySelect = document.getElementById('prioritySelect');
    const delAllBtn = document.getElementById('delAllBtn');
    const filters = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const noProgress = document.getElementById('noProgress');

    // Modal
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');

    let currentFilter = 'all';

    // --- 輔助函式 ---

    // 儲存任務
    function save(){
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
    // 儲存類別
    function saveCategories(){
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }
    
    function uid(){return Date.now().toString(36) + Math.random().toString(36).slice(2,6)}

    // 擴展任務結構：新增 dueDate, dueTime
    function createTask(text, category='其他', priority='normal', dueDate=null, dueTime='23:59'){
      return {id:uid(),text,category,priority,done:false,created:Date.now(),dueDate,dueTime}
    }

    // --- 類別管理功能 ---

    // 渲染主畫面上的類別選擇框
    function renderCategorySelect(){
        categorySelect.innerHTML = '';
        categories.filter(c => c!=='').forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
        
        const manageOption = document.createElement('option');
        manageOption.value = 'manage';
        manageOption.textContent = '⚙️ 管理類別';
        categorySelect.appendChild(manageOption);
    }
    
    // 類別管理介面
    function openCategoryManager(){
        modalTitle.textContent = '管理類別';
        modalBody.innerHTML = `
            <div style="display:flex; gap:8px; margin-bottom:12px">
                <input id="newCategoryInput" type="text" placeholder="輸入新類別名稱" style="flex:1" />
                <button id="addCategoryBtn" class="btn">新增</button>
            </div>
            <ul id="categoryList" style="list-style:none; padding:0; margin:0; max-height:200px; overflow-y:auto; border:1px solid #eee; border-radius:8px; padding:0 12px;"></ul>
        `;
        showModal();
        
        const categoryListEl = document.getElementById('categoryList');
        const newCategoryInput = document.getElementById('newCategoryInput');
        const addCategoryBtn = document.getElementById('addCategoryBtn');

        function renderManagerList(){
            categoryListEl.innerHTML = '';
            categories.filter(c => c!=='').forEach(cat => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.padding = '8px 0';
                
                li.innerHTML = `<span>${cat}</span>`;
                
                // 預設類別不能刪除
                if(!DEFAULT_CATEGORIES.includes(cat)){
                    const delBtn = document.createElement('button');
                    delBtn.className = 'btn secondary';
                    delBtn.textContent = '刪除';
                    delBtn.style.fontSize = '14px';
                    delBtn.style.padding = '4px 8px';
                    delBtn.onclick = () => {
                        // 刪除類別時，將使用該類別的任務改為 '其他'
                        tasks.forEach(t => { if(t.category === cat) t.category = '其他'; });
                        categories = categories.filter(c => c !== cat);
                        saveCategories(); save();
                        renderManagerList();
                        renderCategorySelect(); 
                        render();
                    };
                    li.appendChild(delBtn);
                }
                categoryListEl.appendChild(li);
            });
        }
        
        function addCategory(){
            const newCat = newCategoryInput.value.trim();
            if(newCat && !categories.includes(newCat)){
                categories.push(newCat);
                saveCategories();
                newCategoryInput.value = '';
                renderManagerList();
                renderCategorySelect();
            }
        }

        addCategoryBtn.addEventListener('click', addCategory);
        newCategoryInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ addCategory() } });

        renderManagerList();

        // 關閉 Modal 時，恢復按鈕並確保選擇框回歸
        const closeManager = ()=>{ 
            hideModal(); 
            // 恢復原本的確認/取消按鈕
            document.querySelector('.modal > div:last-child').style.display = 'flex'; 
            categorySelect.value = categories[0] || '其他';
            renderCategorySelect();
            render();
        };

        // 隱藏 modal 上的確認/取消按鈕，因為管理介面操作直接生效
        document.querySelector('.modal > div:last-child').style.display = 'none';
        modalBackdrop.onclick = (e) => { if(e.target === modalBackdrop){ closeManager(); } }
        modalCancel.onclick = closeManager;
        modalConfirm.onclick = closeManager;
    }
    
    // 監聽主畫面類別選擇框的變動
    categorySelect.addEventListener('change', ()=>{
        if(categorySelect.value === 'manage'){
            openCategoryManager();
        }
    });
    
    // --- 主要功能邏輯 ---

    function addTaskFromInput(){
      const v = taskInput.value.trim();
      if(!v) return;
      const t = createTask(v, categorySelect.value, prioritySelect.value);
      tasks.unshift(t);
      taskInput.value='';
      render();save();
      // 新增後自動跳出編輯視窗，讓使用者設定日期時間
      openFullEdit(t, true); 
    }

    addBtn.addEventListener('click', addTaskFromInput);
    taskInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ addTaskFromInput() } });

    // filter
    filters.forEach(btn=>btn.addEventListener('click', ()=>{
      filters.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    }))

    searchInput.addEventListener('input', ()=> render())

    // render
    function render(){
      todoList.innerHTML='';
      const q = searchInput.value.trim().toLowerCase();

      let visible = tasks.filter(t=>{
        if(currentFilter==='progress' && t.done) return false;
        if(currentFilter==='done' && !t.done) return false;
        if(q){
          return t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
      });

      // 顯示『進行中沒任務』訊息
      const progressCount = tasks.filter(t=>!t.done).length;
      noProgress.style.display = progressCount===0 && currentFilter !== 'done' ? 'block':'none';

      if(visible.length===0){
        const empty = document.createElement('div');
        empty.className='empty-state';
        empty.textContent='沒有符合條件的任務';
        todoList.appendChild(empty);
        return;
      }

      visible.forEach(t=>{
        const el = document.createElement('div'); el.className='todo';
        el.dataset.priority = t.priority;
        const left = document.createElement('div'); left.className='left';
        // checkbox
        const check = document.createElement('button'); check.className='check';
        check.setAttribute('aria-pressed', String(t.done));
        if(t.done) check.classList.add('checked');
        check.addEventListener('click', ()=>{
          t.done = !t.done; save(); render();
        });

        left.appendChild(check);

        const content = document.createElement('div'); content.className='content';
        const title = document.createElement('h4'); title.className='title editable';
        title.textContent = t.text;
        if(t.done) title.style.textDecoration = 'line-through';

        // 雙擊編輯標題
        title.addEventListener('dblclick', ()=> openInlineEditor(t, title));

        const meta = document.createElement('div'); meta.className='meta';

        const tagWrap = document.createElement('div'); tagWrap.className='tags';
        
        // 類別標籤
        const catTag = document.createElement('button'); 
        catTag.className='tag'; catTag.textContent = t.category;
        catTag.title = '雙擊編輯分類';
        catTag.addEventListener('dblclick', ()=> openCategoryEditor(t, catTag));
        tagWrap.appendChild(catTag);

        // 顯示優先度
        const pri = document.createElement('span'); 
        pri.className='priority ' + t.priority; 
        pri.title='優先度';
        const priMap = { 'urgent': '⚡ 緊急', 'important': '⭐ 重要', 'normal': '🟢 一般' };
        pri.textContent = priMap[t.priority] || t.priority;
        meta.appendChild(pri);
        
        // 顯示截止日期時間
        if(t.dueDate){
            const dueDisplay = document.createElement('span');
            dueDisplay.className = 'due-date';
            dueDisplay.style.fontWeight = 'bold';
            dueDisplay.style.color = t.done ? 'var(--muted)' : 'var(--danger)'; 
            
            const dueText = `${t.dueDate} ${t.dueTime || '23:59'}`;
            dueDisplay.textContent = '📅 ' + dueText;

            meta.appendChild(dueDisplay);
        }

        // 顯示創建日期
        const time = document.createElement('span');
        const d = new Date(t.created);
        time.textContent = `建立於 ${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
        time.style.marginLeft='auto'; // 推到最右邊

        meta.appendChild(time);
        
        content.appendChild(title);
        content.appendChild(meta);

        const actions = document.createElement('div'); actions.className='actions';
        const editBtn = document.createElement('button'); editBtn.className='icon-btn'; editBtn.innerHTML='✏️';
        editBtn.title='編輯細節';
        editBtn.addEventListener('click', ()=> openFullEdit(t));

        const delBtn = document.createElement('button'); delBtn.className='icon-btn'; delBtn.innerHTML='🗑️';
        delBtn.title='刪除任務';
        delBtn.addEventListener('click', ()=> confirmModal('刪除此任務？', async ()=>{ tasks = tasks.filter(x=>x.id!==t.id); save(); render(); } ))

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        el.appendChild(left);
        el.appendChild(content);
        el.appendChild(actions);

        todoList.appendChild(el);
      })
    }

    // 內嵌編輯（雙擊）
    function openInlineEditor(task, titleEl){
      if(titleEl.classList.contains('editing')) return;
      titleEl.classList.add('editing');
      const input = document.createElement('input');
      input.type='text'; input.value=task.text; 
      input.className='editable editing';
      titleEl.replaceWith(input);
      input.focus();
      function commit(){ task.text = input.value.trim() || task.text; save(); render(); }
      function cancel(){ render(); }
      input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ commit() } else if(e.key==='Escape'){ cancel() } });
      input.addEventListener('blur', ()=>{ commit() });
    }

    // 編輯分類
    function openCategoryEditor(task, tagEl){
      const sel = document.createElement('select');
      categories.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v; if(v===task.category) o.selected=true; sel.appendChild(o)});
      // 加上 "管理類別" 選項
      const manageOption = document.createElement('option');
      manageOption.value = 'manage'; manageOption.textContent = '⚙️ 管理類別'; sel.appendChild(manageOption);
      
      sel.className='editable editing';
      tagEl.replaceWith(sel); sel.focus();
      sel.addEventListener('change', ()=>{ 
        if(sel.value === 'manage'){
            openCategoryManager(); 
            sel.value = task.category; 
        } else {
            task.category = sel.value; save(); render(); 
        }
      });
      sel.addEventListener('blur', ()=>{ save(); render(); });
    }

    // 全面編輯（包含標籤、優先度、日期時間）
    function openFullEdit(task, isNew=false){
      modalTitle.textContent = isNew ? '設定任務細節' : '編輯任務';
      modalBody.innerHTML = '';
      const form = document.createElement('div');
      form.style.display='grid'; 
      form.style.gap='12px';
      form.style.gridTemplateColumns = '1fr 1fr'; // 讓日期和時間並排

      const tLabel = document.createElement('div'); tLabel.textContent = '任務內容';
      const cLabel = document.createElement('div'); cLabel.textContent = '分類';
      const pLabel = document.createElement('div'); pLabel.textContent = '優先度';
      const dLabel = document.createElement('div'); dLabel.textContent = '截止日期';
      const tmLabel = document.createElement('div'); tmLabel.textContent = '截止時間';

      // 文字
      const tInput = document.createElement('input'); 
      tInput.value = task.text; 
      tInput.style.gridColumn = '1 / span 2'; // 佔滿兩欄
      
      // 分類
      const cSel = document.createElement('select'); 
      categories.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v; if(v===task.category) o.selected=true; cSel.appendChild(o)});
      const manageOption = document.createElement('option');
      manageOption.value = 'manage'; manageOption.textContent = '⚙️ 管理類別'; cSel.appendChild(manageOption);
      cSel.addEventListener('change', ()=>{ 
        if(cSel.value === 'manage'){ openCategoryManager(); cSel.value = task.category; }
      });
      
      // 優先
      const pSel = document.createElement('select'); [['urgent','緊急'],['important','重要'],['normal','一般']].forEach(a=>{const o=document.createElement('option');o.value=a[0];o.textContent=a[1]; if(a[0]===task.priority) o.selected=true; pSel.appendChild(o)});

      // 日期和時間輸入
      const dInput = document.createElement('input'); dInput.type = 'date'; dInput.value = task.dueDate || '';
      const tmInput = document.createElement('input'); tmInput.type = 'time'; tmInput.value = task.dueTime || '23:59';
      
      // 添加元素到表單 (調整順序以符合 grid 排版)
      form.appendChild(tInput); 
      form.appendChild(cSel); 
      form.appendChild(pSel);
      
      form.appendChild(dInput); 
      form.appendChild(tmInput); 

      modalBody.appendChild(form);
      
      // 顯示 modal
      showModal();
      modalConfirm.onclick = ()=>{
        task.text = tInput.value.trim() || task.text;
        task.category = cSel.value; 
        task.priority = pSel.value; 
        // 儲存日期和時間
        task.dueDate = dInput.value || null;
        task.dueTime = tmInput.value || '23:59';
        
        save(); hideModal(); render();
      };
      modalCancel.onclick = ()=>{ hideModal(); render(); }; // 取消時也要 render，確保列表狀態正確
    }

    // modal helpers
    function showModal(){ 
        modalBackdrop.style.display='flex'; 
        modalBackdrop.setAttribute('aria-hidden','false'); 
    }
    function hideModal(){ 
        modalBackdrop.style.display='none'; 
        modalBackdrop.setAttribute('aria-hidden','true'); 
    }

    // 用於確認動作的 modal
    function confirmModal(message, onConfirm){
      modalTitle.textContent = '確認';
      modalBody.textContent = message;
      document.querySelector('.modal > div:last-child').style.display = 'flex'; // 確保按鈕顯示
      showModal();
      modalConfirm.onclick = ()=>{ onConfirm(); hideModal(); }
      modalCancel.onclick = ()=>{ hideModal(); }
    }

    // 全部刪除
    delAllBtn.addEventListener('click', ()=>{
      confirmModal('確定要刪除全部任務？此動作無法復原。', ()=>{ tasks = []; save(); render(); })
    })

    // 初始畫面
    renderCategorySelect(); // 載入類別
    render();

    // 範例資料（如果沒有資料則建立 demo，並增加日期欄位）
    if(tasks.length===0){
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      
      tasks.push(createTask('晨跑 30 分鐘', '運動', 'normal', null, null));
      tasks.push(createTask('整理工作報告', '工作', 'urgent', tomorrowDate, '10:00'));
      tasks.push(createTask('閱讀 30 分鐘英文', '自我成長', 'important', tomorrowDate, '20:30'));
      save(); render();
    }

    // Accessibility: Esc 關閉 modal
    document.addEventListener('keydown', (e)=>{ 
        if(e.key==='Escape' && modalBackdrop.getAttribute('aria-hidden') === 'false') {
            hideModal(); 
            // 如果是在管理類別介面，需要額外清理
            if(modalTitle.textContent === '管理類別'){
                 // 恢復原本的確認/取消按鈕
                document.querySelector('.modal > div:last-child').style.display = 'flex'; 
                categorySelect.value = categories[0] || '其他';
                renderCategorySelect();
            }
            render();
        } 
    })