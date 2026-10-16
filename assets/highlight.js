/* Brush Wiki —— 离线语法高亮（无 CDN、无外部依赖）。
 *
 * 由 assets/nav.js 动态注入；扫描 main 里所有 <pre><code>，按内容自动判断语言后上色。
 * 支持：Java / Groovy（Gradle 脚本）/ Windows 批处理 / JSON / properties。
 * 无法判定或是控制台输出、目录树时**保持原样**（不上色，避免把日志染花）。
 *
 * 上色完全在客户端做：不改动页面里的代码文本，只包一层 <span class="tok-*">。
 */
(function () {
    'use strict';

    var JAVA_KEYWORDS = ('abstract assert break case catch class const continue default do else enum extends final finally for goto ' +
        'if implements import instanceof interface native new package private protected public return static strictfp super switch ' +
        'synchronized this throw throws transient try volatile while var record sealed permits yield true false null').split(' ');
    var BAT_KEYWORDS = ('call cd cls copy del do echo else endlocal errorlevel exist exit for goto if in not pause popd pushd rem ' +
        'ren rd md set setlocal shift start'.split(' '));

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function detect(code) {
        var t = code.trim();
        if (t === '') { return null; }
        // 控制台日志 / 目录树 / 表格输出：一律保持原样（上色反而更难读）
        if (/^\[?\d{2}:\d{2}:\d{2}/m.test(t)) { return null; }                 // 带时间戳的日志行
        if (/^\[\w[\w.-]*\//m.test(t)) { return null; }                        // [thread/LEVEL] 前缀
        if (/^\[brush\]/m.test(t)) { return null; }                            // 加载器自身日志
        if (/^[├└│─]|^\s+[├└│]/m.test(t)) { return null; }                     // 目录树
        if (/^>\s|^BUILD (SUCCESSFUL|FAILED)/m.test(t)) { return null; }       // Gradle 控制台
        if (/^\s*(PASS|FAIL|SKIPPED|OK|X)\b/m.test(t) && !/[;{}]/.test(t)) { return null; }
        if (/^(java|javax|org|com|net)\.[\w.]*(Exception|Error)\b/.test(t)) { return null; }   // 异常栈首行
        if (/(^|\n)\s+at [\w.$]+\(/.test(t)) { return null; }                                  // 栈帧
        if (/^@echo off/m.test(t) || /^\s*::/m.test(t) || /\bgradlew\.bat\b/.test(t)) { return 'bat'; }
        if (/^\s*(plugins\s*\{|tasks\.register|dependencies\s*\{|repositories\s*\{|sourceSets\s*\{|def\s+\w+\s*=)/m.test(t)) { return 'groovy'; }
        if (/^\s*[\{\[]/.test(t) && /"\s*:/.test(t)) { return 'json'; }
        if (/^\s*[A-Za-z0-9_.\-]+\s*=\s*\S/m.test(t) && !/[;{}<>]/.test(t) && !/^\s*\[/m.test(t)) { return 'props'; }
        if (/(^|\n)\s*(package|import)\s+[\w.]+\s*;/.test(t) || /\b(public|private|protected)\s+(static\s+)?(final\s+)?[\w<>\[\], .]+\s+\w+\s*\(/.test(t)
            || /@Override|@Mixin|@Inject\b/.test(t) || /\bclass\s+\w+/.test(t)) { return 'java'; }
        // 片段式 Java（无类声明，只有方法调用/签名 + C 系语法标记）：例如
        //   BrushEvents.DATA_LOADED.register(server -> { … });
        //   Minecraft minecraft();   // 当前客户端实例（类型 + 方法声明）
        // 行尾允许跟注释，故标记后用 (\/\/…)? $ 收尾。
        if (/[;{](?:\s*\/\/[^\n]*)?$/m.test(t)
            && (/\b[A-Z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*\s*\(/.test(t) || /\b[A-Z][A-Za-z0-9_]*\s+\w+\s*\(/.test(t))) { return 'java'; }
        return null;
    }

    function wrap(kind, text) {
        return '<span class="tok-' + kind + '">' + text + '</span>';
    }

    /* 通用分词：注释 → 字符串 → 注解 → 关键字 → 数字。
     * 用一次 replace 的回调按序号决定 token 类型，避免嵌套替换互相干扰。 */
    function tokenize(code, lang) {
        var keywords = lang === 'bat' ? BAT_KEYWORDS : JAVA_KEYWORDS;
        var patterns = [];

        if (lang === 'bat') {
            patterns.push(['comment', /(^|\n)\s*(::|rem\b)[^\n]*/g]);
            patterns.push(['string', /"[^"\n]*"/g]);
        } else if (lang === 'json') {
            patterns.push(['string', /"(?:\\.|[^"\\])*"/g]);
            patterns.push(['number', /\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g]);
        } else if (lang === 'props') {
            patterns.push(['comment', /(^|\n)#[^\n]*/g]);
            patterns.push(['string', /(^|\n)[A-Za-z0-9_.\-]+(?==)/g]);
        } else {
            patterns.push(['comment', /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g]);
            patterns.push(['string', /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g]);
            patterns.push(['anno', /@[A-Za-z_][\w.]*/g]);
            patterns.push(['number', /\b\d[\d_]*(?:\.\d+)?[LlFfDd]?\b/g]);
            patterns.push(['keyword', new RegExp('\\b(?:' + keywords.join('|') + ')\\b', 'g')]);
        }

        var tokens = [];
        patterns.forEach(function (p, order) {
            var re = p[1];
            var m;
            while ((m = re.exec(code)) !== null) {
                tokens.push({ start: m.index, end: m.index + m[0].length, kind: p[0], order: order, text: m[0] });
                if (m[0].length === 0) { re.lastIndex++; }
            }
        });

        // 先出现者优先；同起点时按模式顺序（注释/字符串优先于关键字）
        tokens.sort(function (a, b) { return a.start - b.start || a.order - b.order; });
        var out = '';
        var cursor = 0;
        tokens.forEach(function (tk) {
            if (tk.start < cursor) { return; }
            out += escapeHtml(code.slice(cursor, tk.start));
            out += wrap(tk.kind, escapeHtml(tk.text));
            cursor = tk.end;
        });
        out += escapeHtml(code.slice(cursor));
        return out;
    }

    function run() {
        var blocks = document.querySelectorAll('main pre > code');
        Array.prototype.forEach.call(blocks, function (code) {
            if (code.dataset.highlighted === 'yes') { return; }
            var raw = code.textContent;
            var lang = detect(raw);
            if (!lang) { code.dataset.highlighted = 'no'; return; }
            code.innerHTML = tokenize(raw, lang);
            code.dataset.highlighted = 'yes';
            code.classList.add('lang-' + lang);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
