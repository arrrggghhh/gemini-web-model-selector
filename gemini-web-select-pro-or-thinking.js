// ==UserScript==
// @name         Gemini Auto-Select Model + Auto Focus
// @namespace    http://tampermonkey.net/
// @version      7.1
// @description  Gemini 새 UI에서 빠른 모델/사고 모델/Pro를 감지해 지정 모델로 자동 전환하고 입력창 포커스를 복구합니다.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    /**
     * 목표 모델 설정
     *
     * 사고 모델로 자동 선택:
     *   const TARGET_MODEL = 'thinking';
     *
     * Pro로 자동 선택:
     *   const TARGET_MODEL = 'pro';
     */
    const TARGET_MODEL = 'thinking'; // 'thinking' | 'pro'

    const CHECK_INTERVAL_MS = 1500;
    const MENU_WAIT_TIMEOUT_MS = 4000;
    const SWITCH_COOLDOWN_MS = 10000;
    const DEBUG = true;

    const RANK = {
        fast: 0,
        thinking: 1,
        pro: 2,
        ultra: 3,
    };

    const TARGET_KEYWORDS = {
        thinking: [
            '사고 모델',
            '사고',
            'Thinking',
            'Reasoning',
            '복잡한 문제',
        ],
        pro: [
            'Pro',
            '프로',
            'Advanced',
            '고급 수학',
            '고급 수학 및 코딩',
        ],
    };

    let isSwitching = false;
    let lastSwitchStartedAt = 0;

    function log(...args) {
        if (DEBUG) console.log('[Gemini Auto]', ...args);
    }

    function normalize(text) {
        return String(text || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function getElementText(el) {
        if (!el) return '';

        return [
            el.innerText,
            el.textContent,
            el.getAttribute?.('aria-label'),
            el.getAttribute?.('data-test-id'),
        ]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isVisible(el) {
        if (!el || !(el instanceof Element)) return false;

        const style = window.getComputedStyle(el);
        if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number(style.opacity) === 0
        ) {
            return false;
        }

        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function isDisabled(el) {
        if (!el) return true;

        return (
            el.disabled === true ||
            el.getAttribute('aria-disabled') === 'true' ||
            el.classList.contains('mat-mdc-button-disabled') ||
            el.classList.contains('mdc-button--disabled')
        );
    }

    function modelRankFromText(text) {
        const original = String(text || '');
        const t = normalize(original);

        if (!t) return null;

        // 높은 등급부터 판정합니다.
        // Pro 설명에 "고급" 같은 단어가 들어가므로 순서가 중요합니다.
        if (
            t.includes('ultra') ||
            t.includes('울트라') ||
            t.includes('google ai ultra')
        ) {
            return RANK.ultra;
        }

        if (
            /\bpro\b/i.test(original) ||
            t.includes('프로') ||
            t.includes('advanced') ||
            t.includes('고급 수학') ||
            t.includes('고급 코딩')
        ) {
            return RANK.pro;
        }

        if (
            t.includes('사고') ||
            t.includes('thinking') ||
            t.includes('reasoning') ||
            t.includes('복잡한 문제')
        ) {
            return RANK.thinking;
        }

        if (
            t.includes('빠른') ||
            t.includes('flash') ||
            t.includes('fast') ||
            t.includes('빠르게 답변')
        ) {
            return RANK.fast;
        }

        return null;
    }

    function getTargetRank() {
        if (TARGET_MODEL === 'thinking') return RANK.thinking;
        if (TARGET_MODEL === 'pro') return RANK.pro;

        throw new Error(`지원하지 않는 TARGET_MODEL: ${TARGET_MODEL}`);
    }

    function matchesTargetText(text) {
        const t = normalize(text);

        return TARGET_KEYWORDS[TARGET_MODEL].some(keyword =>
            t.includes(normalize(keyword))
        );
    }

    function clickOnce(el) {
        if (!el) return;

        const target =
            el.closest?.(
                [
                    'button',
                    '[role="menuitem"]',
                    '[role="menuitemradio"]',
                    '[role="option"]',
                    '[role="button"]',
                    '.mat-mdc-menu-item',
                    '[mat-menu-item]',
                ].join(',')
            ) || el;

        target.scrollIntoView?.({
            block: 'center',
            inline: 'center',
        });

        target.focus?.({
            preventScroll: true,
        });

        // 중요:
        // dispatchEvent(click) + el.click()을 같이 쓰면 Angular Material 메뉴가
        // 열렸다가 바로 닫히는 토글 현상이 생길 수 있으므로 click은 한 번만 실행합니다.
        target.click();
    }

    function findModelButton() {
        const selectors = [
            'button[data-test-id="bard-mode-menu-button"]',
            'button.input-area-switch[aria-haspopup="menu"]',
            'button[aria-label*="모드 선택"][aria-haspopup="menu"]',
            'button[aria-label*="mode"][aria-haspopup="menu"]',
            'bard-mode-switcher button[aria-haspopup="menu"]',
        ];

        for (const selector of selectors) {
            const btn = document.querySelector(selector);

            if (btn && isVisible(btn) && !isDisabled(btn)) {
                return btn;
            }
        }

        // fallback: 텍스트가 모델명이고 메뉴를 여는 버튼
        const candidates = [
            ...document.querySelectorAll(
                'button[aria-haspopup="menu"], [role="button"][aria-haspopup="menu"]'
            ),
        ];

        return (
            candidates.find(el => {
                if (!isVisible(el) || isDisabled(el)) return false;

                const text = getElementText(el);
                const rank = modelRankFromText(text);

                if (rank === null) return false;

                const aria = normalize(el.getAttribute('aria-label'));

                // Gem 옵션, 대화 옵션, 업로드 메뉴 등 제외
                if (
                    aria.includes('옵션 더보기') ||
                    aria.includes('파일 업로드') ||
                    aria.includes('settings') ||
                    aria.includes('help')
                ) {
                    return false;
                }

                return true;
            }) || null
        );
    }

    function getCurrentModelInfo() {
        const btn = findModelButton();
        if (!btn) return null;

        const label = getElementText(btn);
        const rank = modelRankFromText(label);

        return {
            btn,
            label,
            rank,
        };
    }

    function getOverlayRoots() {
        const roots = [
            ...document.querySelectorAll(
                [
                    '.cdk-overlay-container',
                    '.cdk-overlay-pane',
                    '.mat-mdc-menu-panel',
                    '[role="menu"]',
                    '[role="listbox"]',
                    '[role="dialog"]',
                ].join(',')
            ),
        ].filter(isVisible);

        return roots.length ? roots : [document.body];
    }

    function getClickableMenuAncestor(el) {
        return (
            el.closest?.(
                [
                    'button',
                    '[role="menuitem"]',
                    '[role="menuitemradio"]',
                    '[role="option"]',
                    '[role="button"]',
                    '.mat-mdc-menu-item',
                    '[mat-menu-item]',
                ].join(',')
            ) || el
        );
    }

    function findTargetMenuItem() {
        const roots = getOverlayRoots();

        const candidates = [];
        const seen = new Set();

        for (const root of roots) {
            const elements = [
                ...root.querySelectorAll(
                    [
                        'button',
                        '[role="menuitem"]',
                        '[role="menuitemradio"]',
                        '[role="option"]',
                        '[role="button"]',
                        '.mat-mdc-menu-item',
                        '[mat-menu-item]',
                        'div',
                        'span',
                    ].join(',')
                ),
            ];

            for (const el of elements) {
                if (!isVisible(el) || isDisabled(el)) continue;

                const rawText = getElementText(el);
                if (!rawText || !matchesTargetText(rawText)) continue;

                const rank = modelRankFromText(rawText);
                if (rank !== getTargetRank()) continue;

                const clickEl = getClickableMenuAncestor(el);
                if (!clickEl || !isVisible(clickEl) || isDisabled(clickEl)) continue;

                if (seen.has(clickEl)) continue;
                seen.add(clickEl);

                const clickText = getElementText(clickEl);
                const clickRank = modelRankFromText(clickText || rawText);

                if (clickRank !== getTargetRank()) continue;

                const rect = clickEl.getBoundingClientRect();

                candidates.push({
                    el: clickEl,
                    text: clickText || rawText,
                    length: normalize(clickText || rawText).length,
                    area: rect.width * rect.height,
                    exact: normalize(clickText || rawText).startsWith(
                        normalize(TARGET_KEYWORDS[TARGET_MODEL][0])
                    ),
                });
            }
        }

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            if (a.exact !== b.exact) return a.exact ? -1 : 1;
            if (a.length !== b.length) return a.length - b.length;
            return a.area - b.area;
        });

        return candidates[0].el;
    }

    function closeMenu() {
        document.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true,
                cancelable: true,
            })
        );

        setTimeout(() => {
            document.body.dispatchEvent(
                new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                })
            );
        }, 50);
    }

    function setCaretToEnd(targetElem) {
        targetElem.focus();

        if (targetElem.isContentEditable) {
            const range = document.createRange();
            const sel = window.getSelection();

            range.selectNodeContents(targetElem);
            range.collapse(false);

            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }

        if (
            typeof targetElem.selectionStart === 'number' &&
            typeof targetElem.selectionEnd === 'number'
        ) {
            const len = targetElem.value.length;
            targetElem.selectionStart = len;
            targetElem.selectionEnd = len;
        }
    }

    function findPromptInput() {
        const selectors = [
            'div[role="textbox"][aria-label="Gemini 프롬프트 입력"][contenteditable="true"]',
            'div.ql-editor[role="textbox"][contenteditable="true"]',
            'div[role="textbox"][contenteditable="true"]',
            '[contenteditable="true"][aria-label*="프롬프트"]',
            '[contenteditable="true"][data-placeholder*="Gemini"]',
            'textarea',
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);

            if (el && isVisible(el)) {
                return el;
            }
        }

        return null;
    }

    function attemptFocus(maxRetries = 20) {
        let attempts = 0;

        const timer = setInterval(() => {
            attempts++;

            const input = findPromptInput();

            if (input) {
                try {
                    setCaretToEnd(input);
                    log(`입력창 포커스 시도 ${attempts}회차`);

                    if (
                        document.activeElement === input ||
                        input.contains(document.activeElement)
                    ) {
                        log('입력창 포커스 성공');
                        clearInterval(timer);
                        return;
                    }
                } catch (e) {
                    console.warn('[Gemini Auto] 입력창 포커스 실패:', e);
                }
            }

            if (attempts >= maxRetries) {
                log('입력창 포커스 시간 초과');
                clearInterval(timer);
            }
        }, 150);
    }

    function waitForMenuAndClickTarget() {
        const startedAt = Date.now();

        const timer = setInterval(() => {
            const targetItem = findTargetMenuItem();

            if (targetItem) {
                const text = getElementText(targetItem);

                log(`모델 메뉴 항목 클릭: ${text}`);

                clearInterval(timer);
                clickOnce(targetItem);

                setTimeout(() => {
                    attemptFocus();
                    isSwitching = false;
                }, 500);

                return;
            }

            if (Date.now() - startedAt > MENU_WAIT_TIMEOUT_MS) {
                clearInterval(timer);

                log('목표 모델 메뉴 항목을 찾지 못해 취소');
                closeMenu();

                isSwitching = false;
            }
        }, 100);
    }

    function checkAndSwitchModel() {
        if (isSwitching) return;

        const now = Date.now();

        if (now - lastSwitchStartedAt < SWITCH_COOLDOWN_MS) {
            return;
        }

        const current = getCurrentModelInfo();

        if (!current) {
            log('모델 선택 버튼을 찾지 못함');
            return;
        }

        const targetRank = getTargetRank();

        if (current.rank === null) {
            log(`현재 모델 판정 불가: ${current.label}`);
            return;
        }

        // 현재 모델이 목표 모델과 같거나 더 높으면 전환하지 않습니다.
        if (current.rank >= targetRank) {
            return;
        }

        isSwitching = true;
        lastSwitchStartedAt = now;

        log(`전환 시작: "${current.label}" -> ${TARGET_MODEL}`);

        clickOnce(current.btn);

        // 메뉴가 렌더링될 시간을 줍니다.
        setTimeout(waitForMenuAndClickTarget, 400);
    }

    function start() {
        log(`시작됨. TARGET_MODEL=${TARGET_MODEL}`);

        setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

        // Gemini는 SPA라서 DOM이 자주 갈아엎어집니다.
        // MutationObserver로 새 채팅/라우팅/계정 전환 후에도 다시 감지합니다.
        const observer = new MutationObserver(() => {
            if (!isSwitching) {
                checkAndSwitchModel();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        setTimeout(checkAndSwitchModel, 1000);
    }

    start();
})();
