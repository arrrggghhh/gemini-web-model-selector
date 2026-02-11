// ==UserScript==
// @name         Gemini Auto-Select (Pro/Thinking)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Automatically selects the preferred model (Pro or Thinking) on Gemini
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

// 원본: https://greasyfork.org/en/scripts/564627-gemini-auto-select-pro-permanent-watcher

(function() {
    'use strict';

    // ==========================================
    // [설정] 원하는 모드를 선택하세요
    // 'PRO'      : Pro 모델 (기본값)
    // 'THINKING' : 사고 모드 (Gemini 2.0 Flash Thinking)
    // ==========================================
    const PREFERRED_MODE = 'THINKING'; 
    // ==========================================


    // 모드별 설정값 (HTML 분석 기반)
    const MODE_CONFIG = {
        'PRO': {
            keywords: ["Pro", "Advanced", "Ultra"],
            // HTML에서 확인된 Pro 버튼 ID
            btnId: 'bard-mode-option-pro'
        },
        'THINKING': {
            keywords: ["사고 모드", "Thinking", "Reasoning"],
            // HTML에서 확인된 사고 모드 버튼 ID
            btnId: 'bard-mode-option-사고모드' 
        }
    };

    const CHECK_INTERVAL_MS = 2000;
    let isSwitching = false;

    function checkAndSwitchModel() {
        if (isSwitching) return;

        const config = MODE_CONFIG[PREFERRED_MODE];
        if (!config) {
            console.error("Gemini Auto-Switcher: 잘못된 설정입니다. PREFERRED_MODE를 확인하세요.");
            return;
        }

        // 1. 모델 선택 버튼 찾기
        const pickerWrapper = document.querySelector('div[data-test-id="bard-mode-menu-button"]');
        const pickerBtn = pickerWrapper ? pickerWrapper.querySelector('button') : null;

        if (!pickerBtn) return;

        // 2. 현재 선택된 모델 확인
        const currentLabel = pickerBtn.innerText.trim();

        // 현재 상태가 목표 키워드를 포함하고 있다면 중단 (이미 설정됨)
        if (config.keywords.some(keyword => currentLabel.includes(keyword))) {
            return;
        }

        // 3. 변경 프로세스 시작
        isSwitching = true;
        console.log(`Gemini Auto-Switcher: 현재 '${currentLabel}'. '${PREFERRED_MODE}' 모드로 전환 시도...`);

        pickerBtn.click();

        setTimeout(() => {
            // 4. 목표 버튼 찾기 (ID 우선 검색)
            let targetItem = document.querySelector(`button[data-test-id="${config.btnId}"]`);

            // ID로 못 찾을 경우 텍스트로 백업 검색
            if (!targetItem) {
                const menuItems = document.querySelectorAll('div[role="menu"] button');
                for (let item of menuItems) {
                    if (config.keywords.some(keyword => item.innerText.includes(keyword))) {
                        targetItem = item;
                        break;
                    }
                }
            }

            if (targetItem) {
                targetItem.click();
                console.log(`Gemini Auto-Switcher: ${PREFERRED_MODE} 선택 완료.`);
            } else {
                console.log(`Gemini Auto-Switcher: 메뉴에서 ${PREFERRED_MODE} 버튼을 찾을 수 없습니다.`);
                document.body.click(); // 메뉴 닫기
            }

            isSwitching = false;

        }, 500);
    }

    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

})();
