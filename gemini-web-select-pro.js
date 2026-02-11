// ==UserScript==
// @name         Gemini Auto-Select Pro (Fixed for KR)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Automatically selects the "Pro" model on Gemini (Optimized for Korean UI)
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 1. CONFIGURATION
    // 감지할 목표 모델 이름 (화면에 표시되는 텍스트 기준)
    const TARGET_KEYWORDS = ["Pro", "Advanced", "Ultra"];
    const CHECK_INTERVAL_MS = 2000; // 2초마다 확인

    let isSwitching = false;

    function checkAndSwitchModel() {
        if (isSwitching) return;

        // A. 모델 선택 버튼 찾기 (업데이트된 data-test-id 사용)
        // 제공해주신 HTML: <div data-test-id="bard-mode-menu-button" ...><button ...>
        const pickerWrapper = document.querySelector('div[data-test-id="bard-mode-menu-button"]');
        const pickerBtn = pickerWrapper ? pickerWrapper.querySelector('button') : null;

        if (!pickerBtn) return; // 버튼이 로딩되지 않았으면 대기

        // B. 현재 선택된 모델 확인
        // 버튼 안의 텍스트를 가져옵니다. (예: "빠른 모드", "Pro" 등)
        const currentLabel = pickerBtn.innerText.trim();

        // 이미 목표 모델(Pro)이라면 아무것도 하지 않음
        if (TARGET_KEYWORDS.some(keyword => currentLabel.includes(keyword))) {
            return;
        }

        // C. 변경 프로세스 시작
        isSwitching = true;
        console.log(`Gemini Auto-Switcher: 현재 '${currentLabel}' 감지됨. Pro 모델로 전환을 시도합니다...`);

        // 메뉴 열기
        pickerBtn.click();

        // 메뉴 애니메이션 대기 (500ms)
        setTimeout(() => {
            // D. 메뉴에서 "Pro" 버튼 찾기
            // 제공해주신 HTML: <button ... data-test-id="bard-mode-option-pro" ...>
            // 이 ID가 가장 정확하므로 우선적으로 찾고, 없으면 텍스트로 찾습니다.
            let targetItem = document.querySelector('button[data-test-id="bard-mode-option-pro"]');

            // 만약 ID로 못 찾았다면 텍스트로 백업 검색 (혹시 ID가 바뀔 경우 대비)
            if (!targetItem) {
                const menuItems = document.querySelectorAll('div[role="menu"] button');
                for (let item of menuItems) {
                    if (TARGET_KEYWORDS.some(keyword => item.innerText.includes(keyword))) {
                        targetItem = item;
                        break;
                    }
                }
            }

            if (targetItem) {
                targetItem.click();
                console.log("Gemini Auto-Switcher: Pro 모델 선택 완료.");
            } else {
                console.log("Gemini Auto-Switcher: 메뉴에서 Pro 모델을 찾을 수 없습니다.");
                // 메뉴 닫기 (화면 빈 곳 클릭)
                document.body.click();
            }

            // 상태 리셋
            isSwitching = false;

        }, 500);
    }

    // 2. PERMANENT LOOP
    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

})();
