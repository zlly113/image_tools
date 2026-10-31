// tests/test_pdf_tools.js - 自动化综合校验测试脚本
const fs = require('fs');
const vm = require('vm');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`[PASS] ${testName}`);
        passedTests++;
    } else {
        console.error(`[FAIL] ${testName}`);
        failedTests++;
    }
}

async function runTests() {
    console.log('=== 1. 验证国际化语言包 (i18n) ===');
    const zhContent = fs.readFileSync('locales/zh-CN.json', 'utf8');
    const enContent = fs.readFileSync('locales/en-US.json', 'utf8');
    
    let zhJson, enJson;
    try {
        zhJson = JSON.parse(zhContent);
        assert(true, 'zh-CN.json 是合法的 JSON');
    } catch (e) {
        assert(false, `zh-CN.json 解析失败: ${e.message}`);
    }

    try {
        enJson = JSON.parse(enContent);
        assert(true, 'en-US.json 是合法的 JSON');
    } catch (e) {
        assert(false, `en-US.json 解析失败: ${e.message}`);
    }

    if (zhJson && enJson) {
        assert(zhJson.nav?.pdf_station === 'PDF 魔法工具箱', 'zh-CN 含有 nav.pdf_station');
        assert(enJson.nav?.pdf_station === 'PDF Magic Studio', 'en-US 含有 nav.pdf_station');
        assert(zhJson.bottom_nav?.pdf_station === 'PDF 工具', 'zh-CN 含有 bottom_nav.pdf_station');
        assert(enJson.bottom_nav?.pdf_station === 'PDF Tools', 'en-US 含有 bottom_nav.pdf_station');
        assert(typeof zhJson.pdf_station === 'object', 'zh-CN 含有 pdf_station 对象');
        assert(typeof enJson.pdf_station === 'object', 'en-US 含有 pdf_station 对象');
    }

    console.log('\n=== 2. 验证 HTML 结构与关键 DOM 锚点 ===');
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('/models/pdf-lib.min.js'), 'index.html 成功引入 /models/pdf-lib.min.js');
    assert(html.includes('id="nav-pdf-station"'), '桌面侧边栏包含 nav-pdf-station');
    assert(html.includes('id="nav-bottom-pdf-station"'), '移动端底栏包含 nav-bottom-pdf-station');
    assert(html.includes('id="global-section-pdf-station"'), '页面主区域包含 global-section-pdf-station');

    const expectedDomIds = [
        'pdf-tab-btn-organize', 'pdf-tab-btn-convert', 'pdf-tab-btn-security',
        'pdf-section-organize', 'pdf-section-convert', 'pdf-section-security',
        'pdfOrganizerDropzone', 'pdfOrganizerInput', 'pdfOrganizerGrid', 'btnExportOrganizedPdf',
        'pdfMergeDropzone', 'pdfMergeInput', 'pdfMergeList', 'btnExecuteMerge',
        'pdfSplitDropzone', 'pdfSplitInput', 'splitRangeInput', 'btnExtractSplit', 'btnSplitAllZip',
        'pdfToImgDropzone', 'pdfToImgInput', 'selectPdfToImgDpi', 'selectPdfToImgFormat', 'btnPdfToImgZip',
        'imgToPdfDropzone', 'imgToPdfInput', 'selectImgToPdfOrientation', 'selectImgToPdfMargin', 'btnGeneratePdfFromImg',
        'pdfSecurityDropzone', 'pdfSecurityInput', 'wmTextInput', 'wmAngleRange', 'wmOpacityRange', 'btnApplyWatermark',
        'pageNumFormatSelect', 'pageNumPositionSelect', 'btnApplyPageNumbers',
        'btnCleanMetadata', 'securityPreviewCanvas'
    ];

    let allDomIdsFound = true;
    for (const id of expectedDomIds) {
        if (!html.includes(`id="${id}"`)) {
            console.error(`缺少 DOM ID: ${id}`);
            allDomIdsFound = false;
        }
    }
    assert(allDomIdsFound, `全部 ${expectedDomIds.length} 个核心 DOM 元素 ID 均在 index.html 存在`);

    console.log('\n=== 3. 验证 Service Worker 预缓存清单 ===');
    const sw = fs.readFileSync('sw.js', 'utf8');
    assert(sw.includes('/models/pdf-lib.min.js'), 'sw.js 预缓存清单包含 /models/pdf-lib.min.js');
    assert(sw.includes('/js/pdfTools.js'), 'sw.js 预缓存清单包含 /js/pdfTools.js');

    console.log('\n=== 4. 验证 pdf-lib 核心功能 (纯本地内存计算) ===');
    const pdfLibCode = fs.readFileSync('models/pdf-lib.min.js', 'utf8');
    const ctx = {
        window: {},
        self: {},
        navigator: {},
        console: console,
        setTimeout,
        clearTimeout,
        assertResult: (cond, name) => assert(cond, name)
    };
    ctx.window = ctx;
    ctx.self = ctx;
    vm.createContext(ctx);
    vm.runInContext(pdfLibCode, ctx);

    const testScript = `
    (async () => {
        const { PDFDocument, degrees } = window.PDFLib;
        assertResult(typeof PDFDocument !== 'undefined', 'PDFDocument 类加载成功');

        // 4.1 创建与旋转测试
        const doc1 = await PDFDocument.create();
        const page1 = doc1.addPage([400, 600]);
        page1.drawText('Page 1 Content');
        const page2 = doc1.addPage([400, 600]);
        page2.drawText('Page 2 Content');
        page2.setRotation(degrees(90));
        const doc1Bytes = await doc1.save();
        assertResult(doc1Bytes.length > 500, 'PDF 创建与保存成功 (2页，第2页旋转90°)');

        // 4.2 拆分与提取测试
        const loadedDoc = await PDFDocument.load(doc1Bytes);
        assertResult(loadedDoc.getPageCount() === 2, '加载 PDF 页面计数准确 (2页)');
        const splitDoc = await PDFDocument.create();
        const [extractedPage] = await splitDoc.copyPages(loadedDoc, [1]);
        splitDoc.addPage(extractedPage);
        const splitBytes = await splitDoc.save();
        const reloadedSplit = await PDFDocument.load(splitBytes);
        assertResult(reloadedSplit.getPageCount() === 1, 'PDF 页面提取与拆分成功 (提取第2页为新PDF)');

        // 4.3 合并测试
        const mergedDoc = await PDFDocument.create();
        const copied1 = await mergedDoc.copyPages(loadedDoc, [0, 1]);
        copied1.forEach(p => mergedDoc.addPage(p));
        const copied2 = await mergedDoc.copyPages(reloadedSplit, [0]);
        copied2.forEach(p => mergedDoc.addPage(p));
        const mergedBytes = await mergedDoc.save();
        const reloadedMerged = await PDFDocument.load(mergedBytes);
        assertResult(reloadedMerged.getPageCount() === 3, '多文件/多页面合并成功 (2页 + 1页 = 3页)');

        // 4.4 元数据隐私脱敏测试
        const metaDoc = await PDFDocument.create();
        metaDoc.setTitle('Confidential Title');
        metaDoc.setAuthor('Secret Author');
        const rawMetaBytes = await metaDoc.save();
        const loadedMetaDoc = await PDFDocument.load(rawMetaBytes);
        assertResult(loadedMetaDoc.getTitle() === 'Confidential Title', '原始元数据写入成功');
        loadedMetaDoc.setTitle('');
        loadedMetaDoc.setAuthor('');
        const cleanMetaBytes = await loadedMetaDoc.save();
        const reloadedClean = await PDFDocument.load(cleanMetaBytes);
        assertResult(!reloadedClean.getTitle() && !reloadedClean.getAuthor(), '元数据隐私清理与脱敏擦除成功');
    })();
    `;

    await vm.runInContext(testScript, ctx);

    console.log(`\n========================================`);
    console.log(`测试完成: 通过 ${passedTests} 项, 失败 ${failedTests} 项`);
    console.log(`========================================`);

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('测试运行异常:', err);
    process.exit(1);
});
