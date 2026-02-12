// ==UserScript==
// @name         Gemini Auto-Select (Only from Flash) + Auto Focus
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Flash(빠른) 모드일 때만 감지하여 사고(Thinking) 또는 Pro 모드로 전환하고 입력창에 포커스를 둡니다.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // [설정 1] 전환하고 싶은 '목표' 모드 키워드
    // ==========================================
    const TARGET_KEYWORDS = ["사고", "Thinking", "Reasoning"];
    // const TARGET_KEYWORDS = ["Pro", "Advanced"];

    // ==========================================
    // [설정 2] '탈출'하고 싶은 모드 키워드 (Flash/빠른 모드)
    // ==========================================
    const FLASH_KEYWORDS = ["빠른", "Flash"];

    const CHECK_INTERVAL_MS = 2000;
    let isSwitching = false;

    // [추가 기능] 입력창 포커스 함수
    function focusInput() {
        // 사용자 힌트 기반 선택자 (v2 -> rich-textarea -> editable div)
        const selectors = [
            'input-area-v2 rich-textarea div[contenteditable="true"]', // 1순위: 정확한 경로
            'div[role="textbox"]',                                     // 2순위: 접근성 표준
            'rich-textarea'                                            // 3순위: 래퍼 자체
        ];

        for (let sel of selectors) {
            const inputEl = document.querySelector(sel);
            if (inputEl) {
                inputEl.focus();
                // 필요 시 커서를 끝으로 이동시키는 로직이 들어갈 수 있으나,
                // 보통 focus()만으로도 입력 준비 상태가 됩니다.
                console.log(`[Gemini Auto] 입력창 포커스 성공 (${sel})`);
                return;
            }
        }
        console.log("[Gemini Auto] 입력창을 찾을 수 없습니다.");
    }

    function checkAndSwitchModel() {
        if (isSwitching) return;

        // 1. 모델 선택 버튼 찾기
        const pickerBtn = document.querySelector('bard-mode-switcher button[aria-haspopup="menu"]');
        if (!pickerBtn) return;

        // 2. 현재 상태 확인
        const currentLabel = pickerBtn.innerText.trim();

        // 2-1. Flash 모드인지 확인
        const isFlashMode = FLASH_KEYWORDS.some(keyword => currentLabel.toLowerCase().includes(keyword.toLowerCase()));

        if (!isFlashMode) {
            return;
        }

        // 3. 전환 시작
        isSwitching = true;
        console.log(`[Gemini Auto] 현재 '${currentLabel}' 감지. 타겟 모드(${TARGET_KEYWORDS[0]})로 전환 시도...`);

        pickerBtn.click(); // 메뉴 열기

        // 4. 메뉴 항목 클릭 및 후속 조치
        let attempts = 0;
        const menuCheckInterval = setInterval(() => {
            attempts++;
            const menuItems = document.querySelectorAll('div[role="menu"] button[role="menuitemradio"]');
            let targetItem = null;

            for (let item of menuItems) {
                const text = item.innerText;
                if (TARGET_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
                    targetItem = item;
                    break;
                }
            }

            if (targetItem) {
                targetItem.click();
                console.log(`[Gemini Auto] 전환 완료!`);
                clearInterval(menuCheckInterval);

                // [변경됨] 전환 후 입력창 포커스 시도 (UI 갱신 시간을 고려해 약간 지연)
                setTimeout(() => {
                    focusInput();
                    isSwitching = false;
                }, 500);

            } else if (attempts > 10) {
                console.log("[Gemini Auto] 목표 메뉴를 찾을 수 없어 취소합니다.");
                document.body.click(); // 메뉴 닫기
                clearInterval(menuCheckInterval);
                isSwitching = false;
            }
        }, 200);
    }

    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

})();
