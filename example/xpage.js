/**
 * <h2>分页控件（支持静态数据前端分页和远程后端分页）</h2>
 * 基于javascript ES6开发，提供灵活的配置项，后端分页数据格式可以自定义配置，主题可自由发挥，
 * 无任何强制第三方依赖，第三方依赖仅仅作为可选项：引入<b>font-awesome</b>,则显示翻页按钮默认图标，
 * 否则显示默认文字
 * @author chengyuxingo@gmail.com
 * @version 1.1.0
 */
(function () {
    const w = window;
    const config = {
        styles: {
            disabled: "pointer-events: none;filter: alpha(opacity=50);-moz-opacity: 0.5;opacity: 0.5;",
            loading: "pointer-events: none;cursor:wait;"
        },
        defaultOption: {
            type: 'get',
            headers: {}, // {'Content-Type':'application/json'}
            timeout: -1, // 单位：秒(-1：不做超时监听)
            data: {},
            /**
             * 开始请求前进行一些设置
             * @param xhr 当前XMLHttpRequest对象
             */
            before: function (xhr) {
            },
            /**
             * 分页成功回调函数
             * @param data 分页数据
             * @param page 分页信息
             */
            success: function (data, page) {
            },
            /**
             * 错误回调函数
             * @param err 错误信息
             */
            error: function (err) {
            },
            /**
             * 请求完成，无论是否成功
             */
            finish: function () {

            },
            /**
             * 仅在前端静态分页中有效，用于模拟后端请求参数筛选结果集
             * @param item 当前行
             * @returns {boolean}
             */
            filter: function (item) {
                return true;
            }
        },
        defaultSetting: {
            btnJump: {cssClass: 'x-btn', style: '', iconClass: 'fa fa-hashtag', content: '跳页'},
            btnFirst: {cssClass: 'x-btn', style: '', iconClass: 'fa fa-fast-backward', content: '第一页'},
            btnLast: {cssClass: 'x-btn', style: '', iconClass: 'fa fa-fast-forward', content: '最后一页'},
            btnNext: {cssClass: 'x-btn', style: '', iconClass: 'fa fa-forward', content: '下一页'},
            btnPre: {cssClass: 'x-btn', style: '', iconClass: 'fa fa-backward', content: '上一页'},
            inputPage: {cssClass: 'x-input', style: 'max-width:80px !important;'},
            selectPageNum: {cssClass: 'x-input', style: 'max-width: 60px !important;'},
            selectPageSize: {cssClass: 'x-input', style: 'max-width: 60px !important;'},
            other: {cssClass: '', style: '', content: ''},
            textClass: "x-text",
            size: [10],
            /**
             * 当页数大于 range * 2 时，则下拉页码以当前页前后展示的页码数为 range 条
             */
            range: 5,
            /**
             * 发送给后端的分页参数属性名
             * @description 默认get请求此参数内部会追加到url上，形如：http://getdatas?page=1&size=10
             */
            requestProps: {page: 'page', size: 'size'},
            /**
             * 后端响应给前端的参数属性名，exp: a.b.c 用以js获取对象属性值的格式 (后端分页数据可返回任意格式，只需要配置此选项)
             * @code {"data":[],"pager":{"pageNumber":1,"pageSize":10,"pageCount":10,"recordCount":100}}
             */
            responseProps: {
                content: 'data',
                pageMeta: {
                    page: 'pager.pageNumber',
                    size: 'pager.pageSize',
                    pages: 'pager.pageCount',
                    count: 'pager.recordCount'
                }
            }
        }
    };
    const createPageSizeOptions = sizeArr => {
        const options = [];
        for (let x = 0, y = sizeArr.length; x < y; x++) {
            options.push(`<option value='${sizeArr[x]}'>${sizeArr[x]}条</option>`);
        }
        return options.join('');
    }
    const createPageNumOptions = (pageMeta, range) => {
        const options = [];
        if (range * 2 + 1 < pageMeta.pages) { //范围小于总页数，则激活页码段
            let start, end;
            if (pageMeta.page <= range + 1) {
                start = 1;
                end = range * 2 + 1;
            } else if (pageMeta.pages - pageMeta.page <= range) {
                start = pageMeta.pages - range * 2;
                end = pageMeta.pages;
            } else {
                start = pageMeta.page - range;
                end = pageMeta.page + range;
            }
            for (let a = start, b = end; a <= b; a++) {
                if (a === pageMeta.page) {
                    options.push(`<option value='${a}' selected>${a}</option>`);
                } else {
                    options.push(`<option value='${a}'>${a}</option>`);
                }
            }
        } else { //否则执行默认方法
            for (let i = 1, j = pageMeta.pages; i <= j; i++) {
                if (i === pageMeta.page) {
                    options.push(`<option value='${i}' selected>${i}</option>`);
                } else {
                    options.push(`<option value='${i}'>${i}</option>`);
                }
            }
        }
        return options.join('');
    };
    const calcStaticPageable = (page, size, count) => {
        const pages = count % size === 0 ? count / size : Math.ceil(count / size);
        const startNum = size > count ? 0 : (page - 1) * size;
        const endNum = page * size > count ? count : page * size;
        return {
            startNum: startNum,
            endNum: endNum,
            pages: pages
        };
    };
    const getValue = (propPath, obj) => {
        if (propPath.indexOf('.') === -1) {
            return obj[propPath];
        }
        const head = propPath.substring(0, propPath.indexOf('.'));
        const tail = propPath.substring(head.length + 1);
        return getValue(tail, obj[head]);
    };
    const setLoadingStyle = (containerElement) => {
        containerElement.setAttribute('style', config.styles.loading);
    };
    const setLoadedStyle = (containerElement) => {
        containerElement.setAttribute('style', '');
    };
    const setBtnStatus = (elements, pageMeta) => {
        const disabled = config.styles.disabled;
        let setStyle = (element, value) => {
            const prevStyle = element.getAttribute('style') || '';
            if (value !== '') {
                if (!prevStyle.includes(value)) {
                    element.setAttribute('style', prevStyle + ';' + value);
                }
            } else {
                element.setAttribute('style', prevStyle.replace(disabled, ''));
            }
        };
        const elms = elements;
        if (pageMeta.pages === 1) {
            setStyle(elms.btnFirst, disabled);
            setStyle(elms.btnNext, disabled);
            setStyle(elms.btnPre, disabled);
            setStyle(elms.btnLast, disabled);
            setStyle(elms.btnJump, disabled);
        } else if (pageMeta.page === 1) {
            setStyle(elms.btnFirst, disabled);
            setStyle(elms.btnNext, '');
            setStyle(elms.btnPre, disabled);
            setStyle(elms.btnLast, '');
            setStyle(elms.btnJump, '');
        } else if (pageMeta.pages === pageMeta.page) {
            setStyle(elms.btnFirst, '');
            setStyle(elms.btnNext, disabled);
            setStyle(elms.btnPre, '');
            setStyle(elms.btnLast, disabled);
            setStyle(elms.btnJump, '');
        } else {
            setStyle(elms.btnFirst, '');
            setStyle(elms.btnNext, '');
            setStyle(elms.btnPre, '');
            setStyle(elms.btnLast, '');
            setStyle(elms.btnJump, '');
        }
    };

    /**
     * 绑定分页数据到目标元素上
     * @param elements 分页控件的子元素
     * @param pageMeta 分页数据
     * @param setting 配置信息
     */
    const bindElementsData = (elements, pageMeta, setting) => {
        const prePage = pageMeta.page - 1 === 0 ? 1 : pageMeta.page - 1;
        const nextPage = pageMeta.page === pageMeta.pages ? pageMeta.pages : pageMeta.page + 1;
        // 每次请求记录下分页数据，在点击按钮进行下一步操作时，从dom的data-num属性上获得下一次点击的分页参数
        elements.btnPre.dataset.num = prePage.toString();
        elements.btnNext.dataset.num = nextPage;
        elements.btnLast.dataset.num = pageMeta.pages;
        elements.spanSize.innerText = pageMeta.pages;
        elements.spanCount.innerText = pageMeta.count;
        elements.selectNum.innerHTML = createPageNumOptions(pageMeta, setting.range);
    };
    /**
     * 对象深拷贝
     * @param obj 对象
     * @returns {any} 拷贝后的对象
     */
    const deepClone = obj => {
        return JSON.parse(JSON.stringify(obj));
    };
    /**
     * 嵌套对象合并
     * @param target 合并目标
     * @param sources 数据源
     * @returns {{}} 合并后的对象
     */
    const deepObjectAssign = (target = {}, sources = {}) => {
        let obj = target;
        if (typeof target != 'object' || typeof sources != 'object') {
            return sources; // 如果其中一个不是对象 就返回sources
        }
        for (let key in sources) {
            // 如果target也存在 那就再次合并
            if (target.hasOwnProperty(key)) {
                obj[key] = deepObjectAssign(target[key], sources[key]);
            } else {
                // 不存在就直接添加
                obj[key] = sources[key];
            }
        }
        return obj;
    }

    /**
     * 分页控件
     * @param {string} containerId 容器ID
     * @param {{}} setting 配置
     */
    w.xpage = function (containerId, setting) {
        this.mode = 'local'; //默认为静态分页
        this.pageMetaData = {}; //返回的分页元数据
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.setting = deepObjectAssign(deepClone(config.defaultSetting), setting);
        this.container.innerHTML = `<a href="javascript:void(0)" data-num="1" data-id="btn_first_of_${this.containerId}" class="${this.setting.btnFirst.cssClass}" style="${this.setting.btnFirst.style}" title="第一页"><i class="${this.setting.btnFirst.iconClass}"></i>${this.setting.btnFirst.content}</a>
        <a href="javascript:void(0)" data-num="" data-id="btn_pre_of_${this.containerId}" class="${this.setting.btnPre.cssClass}" style="${this.setting.btnPre.style}" title="上一页"><i class="${this.setting.btnPre.iconClass}"></i>${this.setting.btnPre.content}</a>
        <select data-id="select_num_of_${this.containerId}" class="${this.setting.selectPageNum.cssClass}" style="${this.setting.selectPageNum.style}"></select>
        <a href="javascript:void(0)" data-num="" data-id="btn_next_of_${this.containerId}" class="${this.setting.btnNext.cssClass}" style="${this.setting.btnNext.style}" title="下一页">${this.setting.btnNext.content}<i class="${this.setting.btnNext.iconClass}"></i></a>
        <a href="javascript:void(0)" data-num="" data-id="btn_last_of_${this.containerId}" class="${this.setting.btnLast.cssClass}" style="${this.setting.btnLast.style}" title="最后一页">${this.setting.btnLast.content}<i class="${this.setting.btnLast.iconClass}"></i></a>
        <input type="number" data-id="input_x_page_of_${this.containerId}" value="" class="${this.setting.inputPage.cssClass}" style="${this.setting.inputPage.style}">
        <a href="javascript:void(0)" data-id="btn_jump_of_${this.containerId}" class="${this.setting.btnJump.cssClass}" style="${this.setting.btnJump.style}" title="跳页">${this.setting.btnJump.content}<i class="${this.setting.btnJump.iconClass}"></i></a>
        <a class="${this.setting.textClass}">每页</a>
        <select data-id="select_size_of_${this.containerId}" class="${this.setting.selectPageSize.cssClass}" style="${this.setting.selectPageSize.style}">${createPageSizeOptions(this.setting.size)}</select>
        <a class="${this.setting.textClass}">共<span data-id="span_size_of_${this.containerId}"></span>页</a>
        <a class="${this.setting.textClass}">共<span data-id="span_count_of_${this.containerId}"></span>条</a>
        <a class="${this.setting.other.cssClass}" style="${this.setting.other.style}">${this.setting.other.content}</a>`;
        this.container.setAttribute('style', config.styles.disabled);
        this.subElements = {
            btnFirst: this.container.querySelector('a[data-id=btn_first_of_' + this.containerId + ']'),
            btnPre: this.container.querySelector('a[data-id=btn_pre_of_' + this.containerId + ']'),
            btnNext: this.container.querySelector('a[data-id=btn_next_of_' + this.containerId + ']'),
            btnLast: this.container.querySelector('a[data-id=btn_last_of_' + this.containerId + ']'),
            btnJump: this.container.querySelector('a[data-id=btn_jump_of_' + this.containerId + ']'),
            selectNum: this.container.querySelector('select[data-id=select_num_of_' + this.containerId + ']'),
            selectSize: this.container.querySelector('select[data-id=select_size_of_' + this.containerId + ']'),
            spanCount: this.container.querySelector('span[data-id=span_count_of_' + this.containerId + ']'),
            spanSize: this.container.querySelector('span[data-id=span_size_of_' + this.containerId + ']'),
            inputPage: this.container.querySelector('input[data-id=input_x_page_of_' + this.containerId + ']')
        };
        this.doPageable = (option) => {
            if (this.mode === 'remote') {
                this.request(this.url, option);
            } else {
                this.resource(this.staticSource, option);
            }
        };
        const bindEvent = () => {
            const reqProps = this.setting.requestProps;
            this.container.addEventListener('click', e => {
                let element = e.target;
                if (element.nodeName === 'I') {
                    // 如果点到的时I元素，则将目标元素赋值为A元素
                    element = element.parentElement;
                }
                const elementId = element.dataset.id || '';
                if (elementId.startsWith("btn_")) {
                    if (elementId === 'btn_jump_of_' + this.containerId) {
                        let number = +this.subElements.inputPage.value;
                        if (number < 1) {
                            number = 1;
                        }
                        if (number > this.pageMetaData.pages) {
                            number = this.pageMetaData.pages;
                            this.subElements.spanSize.parentElement.style.color = 'red';
                        } else {
                            this.subElements.spanSize.parentElement.style.color = '';
                        }
                        this.option.data[reqProps.page] = number;
                    } else {
                        this.option.data[reqProps.page] = +element.dataset.num;
                    }
                    this.doPageable(this.option);
                }
            });
            this.container.addEventListener('change', e => {
                const element = e.target;
                const elementId = element.dataset.id;
                if (elementId.startsWith('select_')) {
                    const selectedIndex = element.selectedIndex;
                    const number = +element.options[selectedIndex].value;
                    if (elementId === 'select_num_of_' + this.containerId) {
                        this.option.data[reqProps.page] = number;
                    } else if (elementId === 'select_size_of_' + this.containerId) {
                        this.option.data[reqProps.page] = 1;
                        this.option.data[reqProps.size] = number;
                    }
                    this.doPageable(this.option);
                }
            });
        };
        bindEvent();
    }
    /**
     *
     * @param obj
     * @returns {*}
     */
    w.xpage.objectDeepClone = obj => deepClone(obj);
    /**
     *
     * @param target
     * @param source
     * @returns {{}}
     */
    w.xpage.objectDeepAssign = (target = {}, source = {}) => deepObjectAssign(target, source);
    /**
     * 默认选项
     * @type {any} 默认选项
     */
    w.xpage.defaultOption = deepClone(config.defaultOption);
    /**
     * 默认配置
     * @type {any} 默认配置
     */
    w.xpage.defaultSetting = deepClone(config.defaultSetting);
    /**
     * 初始化
     * @param {string} containerId 容器ID
     * @param {{}} setting 配置
     * @returns {xpage} 分页对象
     */
    w.xpage.init = function (containerId, setting) {
        return new w.xpage(containerId, setting);
    };

    w.xpage.prototype = {
        /**
         * http请求分页
         * @param {string} url url
         * @param {{}} option 选项
         * @see defaultOption
         */
        request: function (url, option) {
            setLoadingStyle(this.container);
            if (this.xhr) {
                if (this.xhr.readyState !== 4) {
                    this.xhr.abort();
                }
            }
            const xhr = new XMLHttpRequest();
            this.xhr = xhr;
            this.mode = 'remote';
            this.url = url;
            this.option = option || w.xpage.defaultOption;
            this.option.type = option.type || 'get';
            this.option.headers = option.headers || {};
            this.option.timeout = option.timeout || -1;
            this.option.data = option.data || {};
            this.option.before = option.before || function () {
            };
            this.option.success = option.success || function () {
            };
            this.option.error = option.error || function () {
            };
            this.option.finish = option.finish || function () {
            };
            const repProps = this.setting.responseProps;
            const reqProps = this.setting.requestProps;
            const params = {};
            params[reqProps.page] = this.option.data[reqProps.page] || 1;
            params[reqProps.size] = this.option.data[reqProps.size] || this.setting.size[0];
            //因为由于请求分页参数除了page，size，还会有其他参数，例如搜索筛选框的参数，所以此处，将这些参数统一合并在一起
            const allParams = Object.assign({}, params, this.option.data);
            // 如果没有指定请求方式，则默认get请求
            const method = this.option.type || 'get';
            let searchUrl = this.url;
            let search = Object.keys(allParams).map(p => `${p}=${allParams[p]}`).join('&');
            if (method.toLowerCase() === 'get') {
                const concatChar = this.url.includes('?') ? '&' : '?';
                searchUrl = this.url + concatChar + search;
            } else {
                if (!this.option.headers['Content-Type']) {
                    this.option.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
            }
            const that = this;
            xhr.open(method, searchUrl, true);
            this.option.before(xhr);
            xhr.responseType = 'json';
            if (this.option.headers) {
                Object.keys(this.option.headers).forEach(key => {
                    xhr.setRequestHeader(key, this.option.headers[key]);
                });
            }
            if (this.option.timeout && this.option.timeout >= 0) {
                xhr.timeout = this.option.timeout;
                xhr.addEventListener('timeout', function (e) {
                    const error = new Error('408:request timeout, request wait time > ' + this.timeout);
                    that.option.error(error);
                });
            }
            xhr.addEventListener('load', function (e) {
                if (this.status === 200) {
                    const result = this.response;
                    that.pageMetaData = {
                        page: getValue(repProps.pageMeta.page, result),
                        size: getValue(repProps.pageMeta.size, result),
                        pages: getValue(repProps.pageMeta.pages, result),
                        count: getValue(repProps.pageMeta.count, result)
                    };
                    that.option.success(getValue(repProps.content, result), that.pageMetaData);
                    bindElementsData(that.subElements, that.pageMetaData, that.setting);
                    setBtnStatus(that.subElements, that.pageMetaData);
                } else {
                    const error = new Error(this.status + ':request failed, ' + this.statusText);
                    that.option.error(error);
                }
            });
            xhr.addEventListener('error', function (e) {
                const error = new Error('500:request error, ' + this.statusText);
                that.option.error(error);
            });
            xhr.addEventListener('loadend', function (e) {
                setLoadedStyle(that.container);
                that.option.finish();
            });
            if (method === 'get') {
                xhr.send();
            } else {
                const contentType = this.option.headers['Content-Type'] || 'application/x-www-form-urlencoded';
                if (contentType === 'application/x-www-form-urlencoded') {
                    xhr.send(search);
                } else if (contentType === 'application/json') {
                    xhr.send(JSON.stringify(allParams));
                } else {
                    console.warn("unsupported contentType:" + contentType);
                }
            }
        },
        /**
         * 静态数据分页请求
         * @param {[]} list 数据
         * @param {{}} option 选项
         * @see defaultOption
         */
        resource: function (list, option) {
            setLoadingStyle(this.container);
            this.mode = 'local';
            this.staticSource = list;
            this.option = option || {};
            this.option.data = option.data || {};
            const reqProps = this.setting.requestProps;
            const page = this.option.data[reqProps.page] || 1;
            const size = this.option.data[reqProps.size] || this.setting.size[0];
            //过滤器回调函数，默认返回true为不过滤，实现此过滤器用来进行数据筛选，用户用户自定义的筛选框
            this.option.filter = option.filter || function () {
                return true;
            };
            this.option.before = option.before || function () {
            };
            this.option.success = option.success || function () {
            };
            this.option.finish = option.finish || function () {
            };
            this.option.before({page, size});
            const filteredSource = list.filter(item => this.option.filter(item));
            const {startNum, endNum, pages} = calcStaticPageable(page, size, filteredSource.length);
            this.pageMetaData = {
                page: page,
                size: size,
                pages: pages,
                count: filteredSource.length
            };
            // 进行数据分页
            const pagedSource = filteredSource.slice(startNum, endNum);
            this.option.success(pagedSource, this.pageMetaData);
            this.option.finish();
            bindElementsData(this.subElements, this.pageMetaData, this.setting);
            setBtnStatus(this.subElements, this.pageMetaData);
            setLoadedStyle(this.container);
        },
        /**
         * 分页请求
         * @param from {string|[]} url或静态数据数据
         * @param option {{}} 选项
         * @see defaultOption
         */
        sourceFrom: function (from, option) {
            if (typeof from === 'string') {
                this.request(from, option);
            } else if (from instanceof Array) {
                this.resource(from, option);
            } else {
                console.error("分页数据类型错误：" + typeof from);
            }
        },
        refresh: function () {
            const reqProps = this.setting.requestProps;
            const pageMeta = this.pageMetaData;
            // 静态分页当前页刷新
            if (Object.keys(pageMeta).length === 4) {
                this.option.data[reqProps.page] = pageMeta.page;
                this.option.data[reqProps.size] = pageMeta.size;
                if (this.mode === 'local') {
                    this.resource(this.staticSource, this.option);
                } else {
                    // 动态分页当前页刷新
                    this.request(this.url, this.option);
                }
            }
        }
    };
})();