// ==UserScript==
// @name        Gemini Auto-Select (Smart High-Tier)
// @namespace   http://tampermonkey.net/
// @version     2.3
// @description Automatically selects the preferred model only if neither Pro nor Thinking is active.
// @author      You
// @match       https://gemini.google.com/*
// @grant       none
// @run-at      document-idle
// @license     MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // [설정] Flash 상태일 때 전환할 목표 모드
    // 'PRO'      : Pro 모델
    // 'THINKING' : 사고 모드 (Gemini 2.0 Flash Thinking)
    // ==========================================
    const PREFERRED_MODE = 'THINKING'; 
    // ==========================================


    // 모드별 설정값
    const MODE_CONFIG = {
        'PRO': {
            keywords: ["Pro", "Advanced", "Ultra"],
            btnId: 'bard-mode-option-pro'
        },
        'THINKING': {
            keywords: ["사고 모드", "Thinking", "Reasoning"],
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

        // [수정된 로직]
        // 현재 상태가 'Pro' 계열이거나 'Thinking' 계열이면 변경하지 않음
        const isProActive = MODE_CONFIG['PRO'].keywords.some(keyword => currentLabel.includes(keyword));
        const isThinkingActive = MODE_CONFIG['THINKING'].keywords.some(keyword => currentLabel.includes(keyword));

        if (isProActive || isThinkingActive) {
            // 이미 고성능 모델(Pro 또는 Thinking)이 선택되어 있으므로 아무 작업도 하지 않음
            return;
        }

        // 3. 변경 프로세스 시작 (Flash 등 하위 모델일 경우에만 실행)
        isSwitching = true;
        console.log(`Gemini Auto-Switcher: 현재 '${currentLabel}'. 고성능 모델이 아니므로 '${PREFERRED_MODE}' 모드로 전환 시도...`);

        pickerBtn.click();

        setTimeout(() => {
            // 4. 목표 버튼 찾기 (ID 우선 검색)
            // 참고: 구글이 ID를 자주 변경하므로 data-test-id가 없을 경우 텍스트 매칭으로 넘어갑니다.
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
                document.body.click(); // 메뉴 닫기 (빈 공간 클릭)
            }

            isSwitching = false;

        }, 500);
    }

    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

})();
