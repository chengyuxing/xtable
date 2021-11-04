/**
 * <h2>这是一个简易型的前端静态数据编辑组件</h2>
 * 通过映射字段名生成一个json对象数据，常用于用户数据在线编辑，或者excel文件数据在线字段映射编辑。<br>
 * 此组件依赖 xpage分页组件，版本号至少1.1.0
 * 支持自定义映射表头；
 * 支持表头定义必填字段，字段名加前缀星号(*);
 * 支持字段类型数据格式自定义验证函数；
 * 支持编辑数据，支持行列增删；
 * 支持搜索功能；
 * @author chengyuxingo@gmail.com
 * @version 1.0.0
 */
(function () {
    const w = window;
    const defaultSetting = {
        enableQuery: true, //true：启用查询，false：禁用查询
        editing: false, //true：编辑模式，false：观察模式
        invalidFormat: '*{a}*',  //未通过字段验证函数的数据格式,例：数据28，{a}代表数据模版，则数据将被替换为*28*
        style: {
            buttons: {
                delColumn: {class: 'btn btn-danger btn-sm', css: '', icon: 'fa fa-minus', content: '删除列'},
                addColumn: {class: 'btn btn-success btn-sm', css: '', icon: 'fa fa-plus', content: '添加列'},
                delRow: {class: 'btn btn-danger btn-block btn-sm', css: '', icon: 'fa fa-minus', content: '删除行'},
                addRow: {class: 'btn btn-success btn-sm', css: '', icon: 'fa fa-plus', content: '添加行'}
            },
            table: {
                class: 'table table-bordered table-hover table-sm',
                css: 'margin-bottom: 0'
            },
            select: {class: 'form-select form-select-sm', css: 'font-weight: bold;', content: '--列名--', value: ''}
        },
        xPage: {
            btnJump: {content: ''},
            btnFirst: {content: ''},
            btnLast: {content: ''},
            btnNext: {content: ''},
            btnPre: {content: ''}
        }
    };
    const createHeaderSelects = function (header, headerIndices, isEditing, btnStyle, selectStyle) {
        const select = document.createElement('select');
        select.className = selectStyle.class;
        select.dataset.id = 'fields-select';
        select.setAttribute('style', selectStyle.css);
        select.innerHTML = `<option value=${selectStyle.value}>${selectStyle.content}</option>`;
        select.innerHTML += Object.keys(header).map(field => {
            let style = '';
            let headerText = header[field];
            if (typeof header[field] === 'object') {
                headerText = header[field].text || '未定义';
            }
            if (field.startsWith("*")) {
                style = 'style="color:red;"';
                headerText = "*" + headerText;
            }
            return `<option ${style} value="${field}">${headerText}</option>`;
        }).join('');
        const selectHtml = select.outerHTML;
        const tds = ['<th style="width: 50px;"><span class="btn btn-light btn-sm"><i class="fa fa-list-ol"></i></span></th>'];
        for (let i = 0; i < headerIndices.length; i++) {
            tds.push(`<th data-y="${headerIndices[i]}" data-type="select">${selectHtml}</th>`);
        }
        tds.push(`<th><div class="d-grid"><button data-type="edit" data-id="btn-add-row" ${isEditing ? '' : 'disabled'} class="${btnStyle.class}" type="button"><i data-id="i-add-row" class="${btnStyle.icon}"></i> ${btnStyle.content}</button></div></th>`);
        return tds.join('');
    };
    const createHeaderButtons = function (headerIndices, btnStyle, isEditing) {
        const btns = [`<th><div class="d-grid"><button data-id="btn-edit" class="btn btn-primary btn-sm"><i data-id="i-lock" class="fa ${isEditing ? 'fa-unlock-alt' : 'fa-lock'}"></i></button></div></th>`];
        for (let i = 0; i < headerIndices.length; i++) {
            btns.push(`<th><div class="d-grid"><button data-type="edit" data-id="btn-del-column" data-idx="${headerIndices[i]}" ${isEditing ? '' : 'disabled'} class="${btnStyle.delColumn.class}" type="button"><i data-id="i-del-column" class="${btnStyle.delColumn.icon}"></i> ${btnStyle.delColumn.content}</button></div></th>`);
        }
        btns.push(`<th style="min-width: 85px;max-width: 100px;"><div class="d-grid"><button data-type="edit" data-id="btn-add-column" class="${btnStyle.addColumn.class}" ${isEditing ? '' : 'disabled'} type="button"><i data-id="i-add-column" class="${btnStyle.addColumn.icon}"></i> ${btnStyle.addColumn.content}</button></div></th>`);
        return btns.join('');
    };
    const INPUT_ERROR = 'border: 1px solid #ff3535;background-color: #ffe1e1;';
    const INPUT_GOOD = 'border: 1px solid #00b344;background-color: #c0e4bb;';
    w.xtable = function (containerId, setting) {
        if (w.xpage) {
            this.setting = w.xpage.objectDeepAssign(w.xpage.objectDeepClone(defaultSetting), setting);
            this.container = document.getElementById(containerId);
            // 是否可添加行列
            this.editable = this.setting.editing;
            // 记录新增或修改输入框的坐标
            this.coord = {};
            this.container.innerHTML = `<div class="table-responsive">
                        <table style="${this.setting.style.table.css}" class="${this.setting.style.table.class}">
                            <thead class="bg-light text-center">
                            <tr data-id="query-row" style="display: none;" ${this.setting.enableQuery ? '' : 'style="display: none"'}>
                                <th data-id="header-query">
                                    <div class="input-group input-group-sm">
                                      <input data-id="input-keyword" type="text" class="form-control" value="" placeholder="请输入关键字进行检索...">
                                      <button data-id="btn-clear" class="btn btn-outline-primary btn-sm"><i class="fa fa-trash"></i> 清空</button>
                                      <button data-id="btn-query" class="btn btn-primary btn-sm"><i class="fa fa-search"></i> 查询</button>
                                    </div>
                                </th>
                            </tr>
                            <tr data-id="header-buttons"></tr>
                            <tr data-id="header-selector"></tr>
                            </thead>
                            <tbody data-id="table-body"></tbody>
                        </table>
                        <div id="${containerId}_table-pager"></div>
                    </div>`;
            this.inputKeyword = this.container.querySelector('input[data-id="input-keyword"]');
            this.btnClear = this.container.querySelector('button[data-id="btn-clear"]');
            this.btnQuery = this.container.querySelector('button[data-id="btn-query"]');
            this.headerQuery = this.container.querySelector('th[data-id="header-query"]');
            this.headerContainer = this.container.querySelector('tr[data-id="header-selector"]');
            this.headerButtons = this.container.querySelector('tr[data-id="header-buttons"]');
            this.bodyContainer = this.container.querySelector('tbody[data-id="table-body"]');
            this.xPage = w.xpage.init(containerId + "_table-pager", this.setting.xPage);

            if (this.setting.enableQuery) {
                this.btnQuery.addEventListener('click', () => {
                    this.build();
                });

                this.btnClear.addEventListener('click', () => {
                    this.inputKeyword.value = '';
                    this.build();
                });
            }

            this.headerContainer.addEventListener('change', e => {
                if (e.target.tagName === 'SELECT') {
                    const obj = this.header[e.target.value];
                    let validator = function () {
                        return null;
                    };
                    if (typeof obj === 'object' && typeof obj.validator === 'function') {
                        validator = obj.validator;
                    }
                    for (let i = 0; i < this.body.length; i++) {
                        // 获取固定的input坐标
                        const x = this.body[i][0];
                        const y = e.target.parentElement.dataset.y;
                        // 获取数据源的纵坐标
                        // 因为第一列是虚列（索引），所以+1，实际数据从第二列开始
                        const columnIdx = this.headerIndices.indexOf(+y) + 1;
                        const coord = `${x},${y}`;
                        const input = document.querySelector(`input[data-coord="${coord}"]`);
                        const res = validator(this.body[i][columnIdx]);
                        // 根据规定，验证函数返回null，说明验证通过，不为null，则返回未验证通过的提示信息
                        if (res !== null) {
                            if (input !== null) {
                                input.setAttribute('style', "display:" + input.style.display + ";" + INPUT_ERROR);
                            }
                            // 记录下未验证通过的输入框坐标
                            const red = {};
                            red[y] = false;
                            this.coord[x] = red;
                        } else {
                            if (input !== null) {
                                // 如果为true，说明是数据修改过的输入框，或者修正结果通过后的输入框
                                if (this.coord[+x] && this.coord[+x][+y] === true) {
                                    input.setAttribute('style', "display:" + input.style.display + ";" + INPUT_GOOD);
                                } else {
                                    // 数据格式没问题，则清除样式
                                    input.setAttribute('style', "display:" + input.style.display + ";");
                                }
                            }
                            // 下拉选择框验证通过，则移除之前未通过的坐标
                            if (this.coord[+x]) {
                                if (this.coord[+x][+y] === false) {
                                    delete this.coord[+x][+y];
                                }
                            }
                        }
                    }
                }
            });

            this.headerButtons.addEventListener('click', e => {
                let icon = e.target;
                if (e.target.dataset.id === 'btn-edit') {
                    icon = e.target.firstElementChild;
                }
                if (icon.dataset.id === 'i-lock') {
                    if (!this.editable) {
                        this.editable = true;
                        icon.className = 'fa fa-unlock-alt';
                        this.container.querySelectorAll('button[data-type="edit"]').forEach(b => b.removeAttribute('disabled'));
                        this.bodyContainer.querySelectorAll('.td-data').forEach(td => {
                            td.firstElementChild.style.setProperty('display', 'none', 'important');
                            td.lastElementChild.style.display = 'initial';
                        });
                    } else {
                        this.editable = false;
                        icon.className = 'fa fa-lock';
                        this.container.querySelectorAll('button[data-type="edit"]').forEach(b => b.setAttribute('disabled', 'disabled'));
                        this.bodyContainer.querySelectorAll('.td-data').forEach(td => {
                            td.firstElementChild.style.display = 'initial';
                            td.lastElementChild.style.display = 'none';
                        });
                    }
                    return;
                }

                if (e.target.dataset.id === 'btn-add-column') {
                    icon = e.target.firstElementChild;
                }
                if (icon.dataset.id === 'i-add-column') {
                    // 表头列索引自增防止重复
                    this.headerIndices.push(++this.maxColumnId);
                    for (let i = 0; i < this.body.length; i++) {
                        // 增加一列空数据待填充
                        this.body[i].push('');
                        // 将新单元格坐标记录下来
                        const rowId = this.body[i][0];
                        if (this.coord[rowId] === undefined) {
                            this.coord[rowId] = {};
                        }
                        this.coord[rowId][this.maxColumnId] = true;
                    }
                    this.headerQuery.colSpan = this.headerQuery.colSpan + 1;
                    this.headerButtons.innerHTML = createHeaderButtons(this.headerIndices, this.setting.style.buttons, this.editable);
                    this.headerContainer.innerHTML = createHeaderSelects(this.header, this.headerIndices, this.editable, this.setting.style.buttons.addRow, this.setting.style.select);
                    this.xPage.refresh();
                    return;
                }

                if (e.target.dataset.id === 'btn-del-column') {
                    icon = e.target.firstElementChild;
                }
                if (icon.dataset.id === 'i-del-column') {
                    const columnId = +icon.parentElement.dataset.idx;
                    const columnIdx = this.headerIndices.indexOf(columnId);
                    this.headerIndices.splice(columnIdx, 1);
                    for (let i = 0; i < this.body.length; i++) {
                        this.body[i].splice(columnIdx + 1, 1);
                        if (this.coord[i] !== undefined) {
                            delete this.coord[i][columnId];
                        }
                    }
                    this.headerQuery.colSpan = this.headerQuery.colSpan - 1;
                    this.headerButtons.innerHTML = createHeaderButtons(this.headerIndices, this.setting.style.buttons, this.editable);
                    let idx = 0;
                    for (const elem of this.headerContainer.querySelectorAll('th[data-type="select"]')) {
                        if (idx === columnIdx) {
                            elem.remove();
                            break;
                        }
                        idx++;
                    }
                    this.xPage.refresh();
                }
            });

            this.headerContainer.addEventListener('click', e => {
                let icon = e.target;
                if (e.target.dataset.id === 'btn-add-row') {
                    icon = e.target.firstElementChild;
                }
                if (icon.dataset.id === 'i-add-row') {
                    const maxIdx = ++this.maxRowId;
                    const newRow = [];
                    for (let i = 0; i <= this.headerIndices.length; i++) {
                        // 这里判断0主要为了处理第一列的自增索引
                        if (i === 0) {
                            newRow.push(maxIdx);
                        } else {
                            // 此处是真正的构建空数据
                            newRow.push('');
                        }
                    }
                    // 将新数据行添加到数据的第一行
                    this.body.unshift(newRow);
                    this.coord[maxIdx] = {};
                    for (let i = 0; i < this.headerIndices.length; i++) {
                        this.coord[maxIdx][this.headerIndices[i]] = true;
                    }
                    this.xPage.refresh();
                }
            });

            this.bodyContainer.addEventListener('focusout', e => {
                if (e.target.tagName === 'INPUT') {
                    const coord = e.target.dataset.coord.split(',');
                    const value = e.target.value;
                    const x = +coord[0], y = +coord[1], idx = this.headerIndices.indexOf(y) + 1;
                    const row = this.body.find(r => r[0] === x);
                    if (row !== undefined) {
                        if (row[idx] !== undefined) {
                            if (row[idx] !== value) {
                                row[idx] = value;
                                const span = e.target.previousElementSibling;
                                span.title = value;
                                span.innerHTML = value;
                                if (this.coord[x] === undefined) {
                                    this.coord[x] = {};
                                }
                                // 失去焦点时，此处用来判断是否应该进行字段验证函数处理
                                const field = document.querySelector(`th[data-y="${y}"] > select`).value;
                                if (field !== null && field !== "") {
                                    if (typeof this.header[field] === 'object' && typeof this.header[field].validator === 'function') {
                                        const res = this.header[field].validator(value);
                                        // 如果未通过，则标记坐标为未通过，并设置为红色
                                        if (res !== null) {
                                            this.coord[x][y] = false;
                                            e.target.setAttribute('style', INPUT_ERROR);
                                        } else {
                                            this.coord[x][y] = true;
                                            e.target.setAttribute('style', INPUT_GOOD);
                                        }
                                        return;
                                    }
                                }
                                // 其他情况，则标记为已编辑过的基本样式
                                this.coord[x][y] = true;
                                e.target.setAttribute('style', INPUT_GOOD);
                            }
                        }
                    }
                }
            });
            this.bodyContainer.addEventListener('click', e => {
                let icon = e.target;
                if (e.target.dataset.id === 'btn-del-row') {
                    icon = e.target.firstElementChild;
                }
                if (icon.dataset.id === 'i-del-row') {
                    const rowId = +icon.parentElement.dataset.idx;
                    for (let i = 0; i < this.body.length; i++) {
                        if (this.body[i][0] === rowId) {
                            this.body.splice(i, 1);
                            break;
                        }
                    }
                    delete this.coord[rowId];
                    this.xPage.refresh();
                }
            });

        } else {
            throw new Error("xtable depends on xpage-1.1.0, xpage is required!");
        }
    };
    w.xtable.init = function (containerId, setting) {
        return new w.xtable(containerId, setting);
    };
    w.xtable.defaultSetting = w.xpage.objectDeepClone(defaultSetting);
    w.xtable.prototype.sourceFrom = function (source) {
        if (source) {
            if (source['header'] && source['body']) {
                if (source['body'].length > 0 && source['body'][0].length > 0) {
                    document.querySelector('tr[data-id="query-row"]').style.display = this.setting.enableQuery ? 'table-row' : 'none';
                    this.source = source;
                    this.header = this.source["header"];
                    this.requiredColumn = Object.keys(this.header).filter(field => field.startsWith("*"));
                    this.body = this.source["body"];
                    // 默认为第一列数据生成一个唯一行索引
                    for (let i = 0; i < this.body.length; i++) {
                        this.body[i].unshift(i);
                    }
                    // 并记录下当前数据长度作为最大索引，用于后续添加行自增防止重复
                    this.maxRowId = this.body.length - 1;
                    // 默认生成一行为唯一列索引
                    // 第一列为索引，所以从第二列开始
                    this.headerIndices = this.body[0].slice(1).map((x, i) => i + 1);
                    this.maxColumnId = this.headerIndices.length;
                    this.headerQuery.colSpan = this.headerIndices.length + 2;
                    this.headerButtons.innerHTML = createHeaderButtons(this.headerIndices, this.setting.style.buttons, this.editable);
                    this.headerContainer.innerHTML = createHeaderSelects(this.header, this.headerIndices, this.editable, this.setting.style.buttons.addRow, this.setting.style.select);
                    this.build();
                }
            }
        }
    };
    /**
     * 清空数据源
     */
    w.xtable.prototype.empty = function () {
        this.body = [];
        this.build();
    };
    /**
     * 构建表格数据
     */
    w.xtable.prototype.build = function () {
        this.xPage.sourceFrom(this.body, {
            success: (data, page) => {
                const spanDisplay = this.editable ? 'none !important' : 'initial';
                const inputDisplay = this.editable ? 'initial' : 'none !important';
                const delRow = this.setting.style.buttons.delRow;
                this.bodyContainer.innerHTML = data.map((row, rowId) => {
                    const index = (page.page - 1) * page.size + rowId + 1;
                    const idxTd = `<td class="text-center bg-light">${index}.</td>`;
                    let tds = idxTd + row.slice(1).map((col, colIdx) => {
                        // 此处根据坐标标记判断输入框需要显示的颜色
                        let newInputStyle = '';
                        if (this.coord[row[0]]) {
                            if (this.coord[row[0]][this.headerIndices[colIdx]] === true) {
                                newInputStyle = INPUT_GOOD;
                            } else if (this.coord[row[0]][this.headerIndices[colIdx]] === false) {
                                newInputStyle = INPUT_ERROR;
                            }
                        }
                        return `<td class="td-data"><span title="${col}" class="d-inline-block text-truncate" style="max-width: 150px;min-width: 110px;display: ${spanDisplay};">${col}</span><input data-coord="${row[0]},${this.headerIndices[colIdx]}" type="text" class="form-control form-control-sm" style="display: ${inputDisplay};${newInputStyle}" value="${col}"></td>`;
                    }).join('');
                    tds += `<td class="text-center bg-light"><div class="d-grid"><button data-type="edit" data-id="btn-del-row" ${this.editable ? '' : 'disabled'} data-idx="${row[0]}" class="${delRow.class}" type="button"><i data-id="i-del-row" class="${delRow.icon}"></i> ${delRow.content}</button></div></td>`;
                    return `<tr>${tds}</tr>`;
                }).join('');
            },
            filter: items => {
                const keyword = (this.inputKeyword.value || '').trim();
                if (keyword === '') {
                    return true;
                }
                for (const item of items) {
                    const str = item + '';
                    if (str !== '' && (str.includes(keyword) || keyword.includes(str))) {
                        return true;
                    }
                }
                return false;
            }
        });
    };
    w.xtable.prototype.getResult = function (option) {
        option.error = option.error || function () {
        };
        option.success = option.success || function () {
        };
        // 记录选择框选择的所有字段，包括未选择的空字段
        const allField = [].slice.call(this.headerContainer.querySelectorAll('select[data-id="fields-select"]'))
            .map((select) => select.value);
        // 计算出已选择的字段，并判断是否重复选择
        const selectedField = [];
        for (const field of allField) {
            if (field !== '') {
                if (selectedField.includes(field)) {
                    option.error("字段不允许重复，请重新选择！");
                    return;
                } else {
                    selectedField.push(field);
                }
            }
        }
        // 计算出必选字段（带星号*）
        const selectedNecessaryField = selectedField.filter(f => f.startsWith("*"));
        // 如果选择的必选字段小于预设的必选字段，则不通过
        if (selectedNecessaryField.length < this.requiredColumn.length) {
            option.error("带*号的为必选字段！");
        } else {
            // 获取字段对应的验证器函数，如果没有选或者不需要验证
            const validators = allField.reduce((acc, f) => {
                if (typeof this.header[f] === 'object' && typeof this.header[f].validator === 'function') {
                    acc[f] = this.header[f].validator;
                }
                return acc;
            }, {});

            //数据验证默认为通过
            let pass = true;
            const result = [];
            const errRowId = [];
            const messages = [];
            for (let i = 0; i < this.body.length; i++) {
                const row = this.body[i];
                let acc = {};
                for (let j = 1; j < row.length; j++) {
                    // 表格input固定坐标
                    const x = row[0];
                    const y = this.headerIndices[j - 1];
                    // 坐标对应的数据
                    const col = row[j];
                    let field = allField[j - 1];
                    if (field !== '') {
                        let f = field;
                        if (f.startsWith("*")) {
                            f = f.substr(1);
                        }
                        let validator = validators[field];
                        let res = null;
                        if (validator !== undefined) {
                            res = validator(col);
                        }
                        if (res !== null) {
                            pass = false;
                            const coord = `${x},${y}`;
                            const input = document.querySelector(`input[data-coord="${coord}"]`);
                            if (input !== null) {
                                input.setAttribute('style', `display:${input.style.display};${INPUT_ERROR}`);
                            }
                            const red = {};
                            red[y] = false;
                            this.coord[x] = red;
                            //将未通过验证的数据标记
                            acc[f] = this.setting.invalidFormat.replace('{a}', col);
                            if (!errRowId.includes(i)) {
                                errRowId.push(i);
                            }
                            if (!messages.includes(res)) {
                                messages.push(res);
                            }
                        } else {
                            acc[f] = col;
                        }
                    }
                }
                result.push(acc);
            }

            if (!pass) {
                option.error(messages, result, errRowId);
                return;
            }
            option.success(result);
        }
    };
})();
