/**
 * 幻想城小说章节自动格式化与远程同步工具
 * 支持：
 * 1. 自动从目录扫描最新未同步/已修改的 txt 章节
 * 2. 支持命令行直接传入 txt 路径：node sync_chapter.js "第19章.txt"
 * 3. 支持无参数时弹出 Windows 原生文件选择对话框
 * 4. 自动标准排版与 JSON/JS 双向更新
 * 5. 自动为 antigravity bot 生成待推送事项队列 (novel_push_queue.json)
 * 6. 自动 git commit 并推送至 GitHub main 分支
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FANTASY_CITY_DIR = path.resolve(__dirname);
const CHAPTERS_JSON_PATH = path.join(FANTASY_CITY_DIR, 'data', 'chapters.json');
const CHAPTERS_JS_PATH = path.join(FANTASY_CITY_DIR, 'data', 'chapters.js');
const RENEW_DIR = 'C:\\Users\\xrjpr\\Desktop\\小说集\\幻想城\\遗落的能力 renew';
const RENEW_JSON_PATH = path.join(RENEW_DIR, '遗落的能力.json');

// antigravity bot 数据队列路径
const BOT_DATA_DIR = 'C:\\Users\\xrjpr\\Desktop\\github project\\antigravity bot\\data';
const BOT_QUEUE_FILE = path.join(BOT_DATA_DIR, 'novel_push_queue.json');

// 打开 Windows 原生文件选择框
function openFileDialog() {
    const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.OpenFileDialog
        $f.InitialDirectory = "${RENEW_DIR.replace(/\\/g, '\\\\')}"
        $f.Filter = "文本文件 (*.txt)|*.txt|所有文件 (*.*)|*.*"
        $f.Title = "请选择要同步的小说章节文本"
        if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $f.FileName
        }
    `;
    try {
        const result = execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf-8' }).trim();
        return result || null;
    } catch (e) {
        return null;
    }
}

// 解析文件名获取章节序号与标题
function parseTitleFromFilename(filename) {
    const base = path.basename(filename, path.extname(filename));
    // 匹配 "第19章 深渊回响" 或 "19 深渊回响" 或 "第19章" 等
    const match = base.match(/^(?:第\s*(\d+)\s*章|\s*(\d+)\s*)?[-\s_]*(.*)$/);
    let chNum = null;
    let title = base;

    if (match) {
        if (match[1] || match[2]) {
            chNum = parseInt(match[1] || match[2], 10);
        }
        if (match[3] && match[3].trim()) {
            title = match[3].trim();
        }
    }
    return { chNum, title };
}

// 格式化段落文本
function formatContent(rawText) {
    const paragraphs = rawText
        .split(/\r?\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
    return paragraphs.join('\n\n');
}

// 获取今天日期 YYYY-MM-DD
function getTodayDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// 为 antigravity bot 新增小说更新待推送事项
function addPushTaskToBot({ chNum, title, content, date, targetIndex }) {
    try {
        if (!fs.existsSync(BOT_DATA_DIR)) {
            fs.mkdirSync(BOT_DATA_DIR, { recursive: true });
        }
        let queueData = { queue: [], history: [] };
        if (fs.existsSync(BOT_QUEUE_FILE)) {
            try {
                queueData = JSON.parse(fs.readFileSync(BOT_QUEUE_FILE, 'utf-8'));
                if (!Array.isArray(queueData.queue)) queueData.queue = [];
                if (!Array.isArray(queueData.history)) queueData.history = [];
            } catch (e) {
                queueData = { queue: [], history: [] };
            }
        }

        // 提取正文摘要（取前两段或前 180 字符）
        const paragraphs = content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
        let summary = '';
        if (paragraphs.length > 0) {
            summary = paragraphs.slice(0, 2).join('\n');
            if (summary.length > 180) {
                summary = summary.slice(0, 180) + '...';
            }
        }

        const taskId = `novel_ch_${targetIndex + 1}_${Date.now()}`;
        const readUrl = `https://xrjprogram.github.io/FantasyCity/novel.html?chapter=${targetIndex}`;

        // 检查待推送队列中是否已有相同章节序号的任务，若有则更新，若无则追加
        const existingIdx = queueData.queue.findIndex(item => item.chapter_num === (targetIndex + 1));
        const taskItem = {
            id: taskId,
            type: "novel_chapter_update",
            chapter_num: targetIndex + 1,
            title: title,
            date: date,
            url: readUrl,
            summary: summary,
            created_at: Math.floor(Date.now() / 1000),
            status: "pending"
        };

        if (existingIdx >= 0) {
            queueData.queue[existingIdx] = taskItem;
            console.log(`[提示] 已更新 antigravity bot 待推送事项: 第 ${targetIndex + 1} 章 《${title}》`);
        } else {
            queueData.queue.push(taskItem);
            console.log(`[成功] 已为 antigravity bot 新增待推送事项: 第 ${targetIndex + 1} 章 《${title}》`);
        }

        fs.writeFileSync(BOT_QUEUE_FILE, JSON.stringify(queueData, null, 2), 'utf-8');
        console.log(`[提示] 推送事项已写入队列文件: ${BOT_QUEUE_FILE}`);
        console.log(`[提示] antigravity bot 开启后将自动识别该事项并发布到交流群。\n`);
        return true;
    } catch (err) {
        console.warn('[警告] 写入 antigravity bot 推送队列失败:', err.message);
        return false;
    }
}

async function main() {
    console.log('==============================================');
    console.log('  [幻想城小说章节自动格式化与云端同步工具]');
    console.log('==============================================\n');

    let targetFilePath = process.argv[2];

    // 如果没有传入参数，先尝试在 RENEW_DIR 中寻找更新或未同步的文件
    if (!targetFilePath) {
        console.log('[检索] 未指定文件，正在弹出文件选择器...');
        targetFilePath = openFileDialog();
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
        console.log('[警告] 未选择任何有效文件，操作已取消。');
        process.exit(0);
    }

    console.log(`[目标文件] ${targetFilePath}`);

    const rawText = fs.readFileSync(targetFilePath, 'utf-8');
    const { chNum, title } = parseTitleFromFilename(targetFilePath);
    const content = formatContent(rawText);
    const today = getTodayDate();

    console.log(`[章节解析] ${chNum ? '第 ' + chNum + ' 章' : '新章节'} 《${title}》`);
    console.log(`[排版格式化] 共 ${content.split('\n\n').length} 段落，${content.length} 字符\n`);

    // 1. 读取并更新 chapters.json
    let chapters = [];
    if (fs.existsSync(CHAPTERS_JSON_PATH)) {
        chapters = JSON.parse(fs.readFileSync(CHAPTERS_JSON_PATH, 'utf-8'));
    }

    const chapterObj = {
        title: title,
        date: today,
        content: content
    };

    let targetIndex = chNum ? chNum - 1 : chapters.length;
    if (targetIndex < chapters.length) {
        console.log(`[更新已有章节] [索引 ${targetIndex}] ${chapters[targetIndex].title} -> ${title}`);
        chapters[targetIndex] = chapterObj;
    } else {
        console.log(`[追加新章节] [索引 ${chapters.length}] ${title}`);
        chapters.push(chapterObj);
        targetIndex = chapters.length - 1;
    }

    fs.writeFileSync(CHAPTERS_JSON_PATH, JSON.stringify(chapters, null, 2), 'utf-8');
    console.log(`[成功] 已写入: ${CHAPTERS_JSON_PATH}`);

    // 2. 更新 chapters.js (用于 file:// 本地预览无缝回退)
    const jsContent = `window.FANTASY_CITY_CHAPTERS = ${JSON.stringify(chapters, null, 2)};\n`;
    fs.writeFileSync(CHAPTERS_JS_PATH, jsContent, 'utf-8');
    console.log(`[成功] 已写入: ${CHAPTERS_JS_PATH}`);

    // 3. 同步更新 原文备份 json
    if (fs.existsSync(RENEW_JSON_PATH)) {
        try {
            let renewChapters = JSON.parse(fs.readFileSync(RENEW_JSON_PATH, 'utf-8'));
            if (targetIndex < renewChapters.length) {
                renewChapters[targetIndex] = chapterObj;
            } else {
                renewChapters.push(chapterObj);
            }
            fs.writeFileSync(RENEW_JSON_PATH, JSON.stringify(renewChapters, null, 2), 'utf-8');
            console.log(`[成功] 已同步原文备份: ${RENEW_JSON_PATH}`);
        } catch (e) {
            console.warn('[警告] 同步原文备份 json 异常:', e.message);
        }
    }

    // 4. 为 antigravity bot 生成待推送事项
    addPushTaskToBot({
        chNum: targetIndex + 1,
        title: title,
        content: content,
        date: today,
        targetIndex: targetIndex
    });

    // 5. Git 提交与推送
    console.log('[提交] 正在提交并推送到 GitHub 远程仓库...');
    try {
        const commitMsg = `feat: update chapter ${targetIndex + 1} (${title})`;
        execSync(`git add data/chapters.json data/chapters.js sync_chapter.js`, { cwd: FANTASY_CITY_DIR, stdio: 'inherit' });
        execSync(`git commit -m "${commitMsg}"`, { cwd: FANTASY_CITY_DIR, stdio: 'inherit' });
        execSync(`git push origin main`, { cwd: FANTASY_CITY_DIR, stdio: 'inherit' });
        console.log('\n==============================================');
        console.log(`  [完成] 第 ${targetIndex + 1} 章 《${title}》 已成功发布并推送！`);
        console.log('  [线上地址] https://xrjprogram.github.io/FantasyCity/novel.html');
        console.log('==============================================\n');
    } catch (err) {
        console.error('[错误] Git 推送过程发生错误:', err.message);
    }
}

// 导出方法供外部直接调用
module.exports = {
    addPushTaskToBot
};

if (require.main === module) {
    main();
}
