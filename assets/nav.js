/* Brush Wiki —— 侧栏导航 / 搜索过滤 / 代码复制。
 * 每个页面在 <body data-root="../"> 里给出相对根目录前缀（首页为 ""）。
 * 页面只引用本文件，不写内联脚本。 */
(function () {
    'use strict';

    var NAV = [
        { section: '首页', items: [
            { href: 'index.html', title: '总览' }
        ]},
        { section: '第一部分 · Brush（加载器）', items: [
            { href: 'brush/overview.html', title: '定位与整体架构' },
            { href: 'brush/startup.html', title: '启动管线与自举' },
            { href: 'brush/injection.html', title: '注入层' },
            { href: 'brush/dispatch.html', title: '派发层与事件' },
            { href: 'brush/mods.html', title: '模组加载' },
            { href: 'brush/runtimes.html', title: '三运行时与宿主适配' },
            { href: 'brush/resources.html', title: '资源、数据与界面' },
            { href: 'brush/build.html', title: '构建、产物与命令' },
            { href: 'brush/limits.html', title: '最小改动原则与禁止清单' },
            { href: 'brush/diagnostics.html', title: '测试矩阵与诊断' },
            { href: 'brush/faq.html', title: '常见问题' }
        ]},
        { section: '第二部分 · Brush API（能力库）', items: [
            { href: 'api/overview.html', title: '契约面与设计原则' },
            { href: 'api/first-mod.html', title: '第一个 mod（MDK 上手）' },
            { href: 'api/content.html', title: '内容注册' },
            { href: 'api/network.html', title: '网络' },
            { href: 'api/ui.html', title: '界面与输入' },
            { href: 'api/data.html', title: '数据与资源' },
            { href: 'api/events.html', title: '事件总表' },
            { href: 'api/platform.html', title: '平台适配与自检' },
            { href: 'api/reference.html', title: 'API 参考索引' }
        ]}
    ];

    var root = document.body.getAttribute('data-root') || '';
    var here = location.pathname.replace(/\\/g, '/');
    if (here.endsWith('/')) { here += 'index.html'; }

    function isCurrent(href) {
        return here.endsWith('/' + href) || here.endsWith(href);
    }

    var html = '';
    html += '<div class="brand"><a href="' + root + 'index.html">Brush Wiki</a></div>';
    html += '<div class="sub">Minecraft 26.1.2 自研模组加载器</div>';
    html += '<input type="search" id="nav-search" placeholder="过滤页面…" autocomplete="off">';

    NAV.forEach(function (group) {
        html += '<h4>' + group.section + '</h4><ul>';
        // 每节各自从 1 编号（2026-10-17 用户反馈修正）：此前 counter 是**全局**的，
        // 「首页 · 总览」那条占掉了计数 1（它的编号又被隐藏），于是「第一部分」的第一项
        // 显示成了 2。现在每个 section 内部独立计数，首页那节仍不显示编号。
        var counter = 0;
        group.items.forEach(function (item) {
            counter += 1;
            var num = item.href === 'index.html' ? '' : '<span class="num">' + counter + '.</span>';
            html += '<li><a href="' + root + item.href + '"' + (isCurrent(item.href) ? ' class="current"' : '') + '>'
                + num + item.title + '</a></li>';
        });
        html += '</ul>';
    });
    html += '<h4>本站</h4><ul>'
        + '<li><a href="' + root + 'maintenance.html">维护说明 / 内容口径</a></li>'
        + '</ul>';

    var sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = html;

    // 语法高亮：离线自实现（assets/highlight.js），在此动态挂上 —— 页面无需额外的 <script>
    var hl = document.createElement('script');
    hl.src = root + 'assets/highlight.js';
    document.body.appendChild(hl);

    var search = document.getElementById('nav-search');
    var links = Array.prototype.slice.call(sidebar.querySelectorAll('ul li'));
    search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        links.forEach(function (li) {
            var text = (li.textContent || '').toLowerCase();
            li.classList.toggle('hidden', q !== '' && text.indexOf(q) === -1);
        });
        Array.prototype.slice.call(sidebar.querySelectorAll('h4')).forEach(function (h) {
            var ul = h.nextElementSibling;
            if (!ul) { return; }
            var visible = ul.querySelectorAll('li:not(.hidden)').length;
            h.style.display = visible === 0 ? 'none' : '';
            ul.style.display = visible === 0 ? 'none' : '';
        });
    });

    // 代码块复制按钮
    Array.prototype.slice.call(document.querySelectorAll('main pre')).forEach(function (pre) {
        var code = pre.querySelector('code');
        if (!code) { return; }
        var btn = document.createElement('button');
        btn.className = 'copy';
        btn.type = 'button';
        btn.textContent = '复制';
        btn.addEventListener('click', function () {
            var text = code.innerText;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    btn.textContent = '已复制';
                    setTimeout(function () { btn.textContent = '复制'; }, 1200);
                });
            } else {
                var ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.textContent = '已复制';
                setTimeout(function () { btn.textContent = '复制'; }, 1200);
            }
        });
        pre.appendChild(btn);
    });
})();
