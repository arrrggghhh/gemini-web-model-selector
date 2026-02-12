// ==UserScript==
// @name         Gemini Auto-Select (Only from Flash)
// @namespace    http://tampermonkey.net/
// @version      5.1
// @description  Flash(빠른) 모드일 때만 감지하여 사고(Thinking) 또는 Pro 모드로 전환합니다. (Pro나 사고 모드일 땐 유지)
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
    // 여기에 있는 단어가 포함된 메뉴를 찾아 클릭합니다.
    // ==========================================
    const TARGET_KEYWORDS = ["사고", "Thinking", "Reasoning"];
    // const TARGET_KEYWORDS = ["Pro", "Advanced"]; // Pro로 가고 싶으면 주석 해제 후 위 줄 주석 처리

    // ==========================================
    // [설정 2] '탈출'하고 싶은 모드 키워드 (Flash/빠른 모드)
    // 현재 상태가 이 단어를 포함할 때만 전환을 시도합니다.
    // ==========================================
    const FLASH_KEYWORDS = ["빠른", "Flash"];

    const CHECK_INTERVAL_MS = 2000;
    let isSwitching = false;

    function checkAndSwitchModel() {
        if (isSwitching) return;

        // 1. 모델 선택 버튼 찾기
        const pickerBtn = document.querySelector('bard-mode-switcher button[aria-haspopup="menu"]');
        if (!pickerBtn) return; // 로딩 전

        // 2. 현재 상태 확인
        const currentLabel = pickerBtn.innerText.trim();

        // 2-1. 현재 모드가 'Flash(빠른)' 모드인지 확인
        // (Flash가 아니라면 Pro든 Thinking이든 건드리지 않고 함수 종료)
        const isFlashMode = FLASH_KEYWORDS.some(keyword => currentLabel.toLowerCase().includes(keyword.toLowerCase()));

        if (!isFlashMode) {
            return; // Flash 모드가 아니므로 아무것도 하지 않음 (Pro/Thinking 유지)
        }

        // 3. 전환 시작 (Flash 모드임이 확인됨)
        isSwitching = true;
        console.log(`[Gemini Auto] 현재 '${currentLabel}' 감지. 타겟 모드(${TARGET_KEYWORDS[0]})로 전환 시도...`);

        pickerBtn.click(); // 메뉴 열기

        // 4. 메뉴가 열릴 때까지 기다렸다가 항목 클릭
        let attempts = 0;
        const menuCheckInterval = setInterval(() => {
            attempts++;

            // 메뉴 아이템 찾기 (role="menuitemradio")
            const menuItems = document.querySelectorAll('div[role="menu"] button[role="menuitemradio"]');
            let targetItem = null;

            // 목표 키워드(사고/Pro)가 포함된 메뉴 찾기
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
                setTimeout(() => { isSwitching = false; }, 1000);
            } else if (attempts > 10) {
                // 2초간 못 찾으면(네트워크 지연, 혹은 해당 계정에 기능 없음 등) 포기
                console.log("[Gemini Auto] 목표 메뉴를 찾을 수 없어 취소합니다.");
                document.body.click(); // 메뉴 닫기
                clearInterval(menuCheckInterval);
                isSwitching = false;
            }
        }, 200);
    }

    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

})();
