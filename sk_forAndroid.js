// ==UserScript==
// @name         禁用视频暂停 + 浮动控制面板
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  禁止网页中的视频被暂停，并提供浮动控制面板。优化了移动浏览器兼容性。
// @author       chetuia
// @match        *://*sagz.hnocc.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // 存储各个功能是否启用的状态
    const STORAGE_KEYS = {
        disablePause: 'disablePause',
        feature1: 'feature1',
        feature2: 'feature2',
        feature3: 'feature3',
        panelPosition: 'panelPosition' // 新增：存储面板位置
    };

    // 初始化状态（默认值）
    for (const key in STORAGE_KEYS) {
        if (GM_getValue(STORAGE_KEYS[key]) === undefined) {
            GM_setValue(STORAGE_KEYS[key], key === 'panelPosition' ? { top: '20px', left: '20px' } : true);
        }
    }

    // 创建悬浮窗
    function createControlPanel() {
        // 如果已存在面板则先移除
        const existingPanel = document.getElementById('video-control-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'video-control-panel';
        panel.style.position = 'fixed';
        
        // 从存储中获取位置或使用默认值
        const savedPosition = GM_getValue(STORAGE_KEYS.panelPosition) || { top: '20px', left: '20px' };
        panel.style.top = savedPosition.top || '20px';
        panel.style.left = savedPosition.left || '20px';
        
        panel.style.width = '280px';
        panel.style.backgroundColor = '#fff';
        panel.style.border = '1px solid #ccc';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        panel.style.zIndex = '99999';
        panel.style.padding = '15px';
        panel.style.fontFamily = 'Arial, sans-serif';
        panel.style.fontSize = '14px';
        panel.style.maxHeight = '90vh';
        panel.style.overflowY = 'auto';
        panel.style.cursor = 'move';

        panel.innerHTML = `
            <h3 style="margin-top: 0;">🎬 视频控制面板</h3>
            <label><input type="checkbox" id="toggle-disable-pause" checked> 禁用视频暂停</label><br><br>

            <label><input type="checkbox" id="toggle-feature1" checked> 快刷</label><br><br>

            <label><input type="checkbox" id="toggle-feature2" checked> 待开发</label><br><br>

            <label><input type="checkbox" id="toggle-feature3" checked> 待开发</label><br><br>
        `;

        document.body.appendChild(panel);

        // 使面板可拖动
        makePanelDraggable(panel);

        // 绑定事件监听器
        bindControlEvents(panel);
    }

    // 使面板可拖动
    function makePanelDraggable(panel) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        panel.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmousemove = elementDrag;
            document.onmouseup = closeDragElement;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            const newTop = panel.offsetTop - pos2;
            const newLeft = panel.offsetLeft - pos1;

            panel.style.top = newTop + "px";
            panel.style.left = newLeft + "px";

            // 保存位置到存储
            GM_setValue(STORAGE_KEYS.panelPosition, {
                top: panel.style.top,
                left: panel.style.left
            });
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // 绑定开关事件
    function bindControlEvents(panel) {
        const disablePauseCheckbox = panel.querySelector('#toggle-disable-pause');
        const feature1Checkbox = panel.querySelector('#toggle-feature1');
        const feature2Checkbox = panel.querySelector('#toggle-feature2');
        const feature3Checkbox = panel.querySelector('#toggle-feature3');

        disablePauseCheckbox.checked = GM_getValue(STORAGE_KEYS.disablePause);
        feature1Checkbox.checked = GM_getValue(STORAGE_KEYS.feature1);
        feature2Checkbox.checked = GM_getValue(STORAGE_KEYS.feature2);
        feature3Checkbox.checked = GM_getValue(STORAGE_KEYS.feature3);

        disablePauseCheckbox.addEventListener('change', (e) => {
            GM_setValue(STORAGE_KEYS.disablePause, e.target.checked);
            console.log("🔧 禁用暂停功能：" + (e.target.checked ? "已启用" : "已禁用"));
        });

        feature1Checkbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            GM_setValue(STORAGE_KEYS.feature1, enabled);

            if (enabled) {
                enableProgressHook();
                console.log("🔧 进度提交Hook：已启用");
            } else {
                disableProgressHook();
                console.log("🔧 进度提交Hook：已禁用");
            }
        });

        feature2Checkbox.addEventListener('change', (e) => {
            GM_setValue(STORAGE_KEYS.feature2, e.target.checked);
            console.log("🔧 功能开关 2：" + (e.target.checked ? "已启用" : "已禁用"));
        });

        feature3Checkbox.addEventListener('change', (e) => {
            GM_setValue(STORAGE_KEYS.feature3, e.target.checked);
            console.log("🔧 功能开关 3：" + (e.target.checked ? "已启用" : "已禁用"));
        });
    }

    // Hook video.pause 方法
    function hookVideoElement(video) {
        const originalPause = video.pause;

        video.pause = function () {
            if (GM_getValue(STORAGE_KEYS.disablePause)) {
                console.log("⏸️ 【视频暂停被阻止】");
                if (!video.paused) {
                    video.play().catch(() => {});
                }
                return;
            }
            return originalPause.apply(this, arguments);
        };

        let _paused = false;
        Object.defineProperty(video, 'paused', {
            get: () => _paused,
            set: (val) => {
                if (GM_getValue(STORAGE_KEYS.disablePause) && val === true) return;
                _paused = val;
            },
            configurable: false,
            enumerable: true
        });

        video.addEventListener('pause', () => {
            if (GM_getValue(STORAGE_KEYS.disablePause)) {
                video.play().catch(() => {});
            }
        });
    }

    // 处理所有视频元素
    function processVideos() {
        document.querySelectorAll('video').forEach(hookVideoElement);
    }

    // 监听 DOM 变化
    function setupMutationObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'VIDEO') {
                        hookVideoElement(node);
                    } else if (node.nodeType === 1) {
                        node.querySelectorAll('video').forEach(hookVideoElement);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 进度提交Hook相关变量
    let originalFetch, origOpen, origSend, origFormSubmit;
    const TARGET_URL = '/prod-api/mobile/sa_trainingCourse/course_duration';
    const FULL_TARGET_URL = 'https://sagz.hnocc.com' + TARGET_URL;

    // 启用进度提交Hook
    function enableProgressHook() {
        // 在页面加载完成后尝试打开新标签页
        window.addEventListener('load', () => {
            setTimeout(() => {
                switchTab('https://www.baidu.com');
            }, 10);
        });

        // 打开新标签页并切换回当前页面的函数
        function switchTab(tempUrl) {
            window.open(tempUrl, '_blank');
            setTimeout(() => {
                try {
                    window.focus();
                } catch (e) {
                    console.error('Unable to focus the current window:', e);
                }
            }, 100);
        }

        // Hook fetch()
        originalFetch = window.fetch;
        window.fetch = function (input, init) {
            const url = input instanceof Request ? input.url : String(input);

            if ((url === TARGET_URL || url === FULL_TARGET_URL) && init?.method === 'POST') {
                console.log("🔍 拦截到目标请求 (fetch)");

                let body = init.body;

                if (typeof body === 'string') {
                    try {
                        let data = JSON.parse(body);
                        if (data?.courseOutlineVo?.duration !== undefined) {
                            data.duration = data.courseOutlineVo.duration;
                            console.log("✅ 已修改 duration 为:", data.duration);
                            init.body = JSON.stringify(data);
                        }
                    } catch (e) {
                        console.warn("⚠️ fetch: 无法解析 body", e);
                    }
                }

                // 优化后的刷新逻辑
                setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        console.log("🔄 请求已发送，正在刷新页面...");
                        location.reload();
                    } else {
                        const refreshOnVisible = () => {
                            if (document.visibilityState === 'visible') {
                                document.removeEventListener('visibilitychange', refreshOnVisible);
                                location.reload();
                            }
                        };
                        document.addEventListener('visibilitychange', refreshOnVisible);
                    }
                }, 800);

                return originalFetch(input, init);
            } else {
                return originalFetch(input, init);
            }
        };

        // Hook XMLHttpRequest
        origOpen = XMLHttpRequest.prototype.open;
        origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url;
            this._method = method;
            return origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const self = this;

            if ((self._url === TARGET_URL || self._url === FULL_TARGET_URL) && self._method === 'POST') {
                console.log("🔍 拦截到目标请求 (xhr)");

                if (typeof body === 'string') {
                    try {
                        let data = JSON.parse(body);
                        if (data?.courseOutlineVo?.duration !== undefined) {
                            data.duration = data.courseOutlineVo.duration;
                            console.log("✅ XHR: 已修改 duration 为:", data.duration);
                            body = JSON.stringify(data);
                        }
                    } catch (e) {
                        console.warn("⚠️ XHR: 无法解析 body", e);
                    }
                }

                setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        console.log("🔄 请求已发送，正在刷新页面...");
                        location.reload();
                    } else {
                        const refreshOnVisible = () => {
                            if (document.visibilityState === 'visible') {
                                document.removeEventListener('visibilitychange', refreshOnVisible);
                                location.reload();
                            }
                        };
                        document.addEventListener('visibilitychange', refreshOnVisible);
                    }
                }, 800);
            }

            return origSend.call(self, body);
        };

        // Hook form.submit()
        origFormSubmit = HTMLFormElement.prototype.submit;

        HTMLFormElement.prototype.submit = function () {
            const form = this;
            const action = form.getAttribute('action');
            if (!action || !action.endsWith(TARGET_URL)) {
                return origFormSubmit.call(form);
            }

            console.log("🔍 拦截到目标表单提交");

            const formData = new FormData(form);
            const data = {};

            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            if (data?.courseOutlineVo && data.courseOutlineVo.duration) {
                data.duration = data.courseOutlineVo.duration;
                console.log("✅ Form: 已修改 duration 为:", data.duration);
            }

            fetch(FULL_TARGET_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then(response => {
                console.log("✅ 表单已通过 fetch 提交");
                setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        console.log("🔄 请求已发送，正在刷新页面...");
                        location.reload();
                    } else {
                        const refreshOnVisible = () => {
                            if (document.visibilityState === 'visible') {
                                document.removeEventListener('visibilitychange', refreshOnVisible);
                                location.reload();
                            }
                        };
                        document.addEventListener('visibilitychange', refreshOnVisible);
                    }
                }, 800);
            }).catch(err => {
                console.error("❌ 提交失败", err);
            });

            return;
        };

        console.log("🔌 【进度提交Hook已生效（fetch + xhr + form.submit）】");
    }

    // 禁用进度提交Hook
    function disableProgressHook() {
        if (originalFetch) {
            window.fetch = originalFetch;
            originalFetch = null;
        }

        if (origOpen) {
            XMLHttpRequest.prototype.open = origOpen;
            origOpen = null;
        }

        if (origSend) {
            XMLHttpRequest.prototype.send = origSend;
            origSend = null;
        }

        if (origFormSubmit) {
            HTMLFormElement.prototype.submit = origFormSubmit;
            origFormSubmit = null;
        }

        console.log("🔌 【进度提交Hook已禁用】");
    }

    // 启动脚本
    function init() {
        // 确保DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        createControlPanel();
        processVideos();
        setupMutationObserver();

        if (GM_getValue(STORAGE_KEYS.feature1)) {
            enableProgressHook();
        }
    }

    // 添加页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            setTimeout(init, 300); // 延迟确保完全激活
        }
    });

    // 初始执行
    if (document.readyState === 'complete') {
        setTimeout(init, 0);
    } else {
        window.addEventListener('load', init);
    }
})();
