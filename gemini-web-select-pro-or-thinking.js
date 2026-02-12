// ==UserScript==
// @name         Gemini Auto-Select (Only from Flash) + Auto Focus (Enterprise Fix)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Flash 모드 감지 시 Thinking/Pro로 전환 후, 입력창 포커스를 확실하게 잡습니다 (기업용 계정 호환).
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // [설정 1] 목표 모드 키워드
    const TARGET_KEYWORDS = ["사고", "Thinking", "Reasoning"];
    // const TARGET_KEYWORDS = ["Pro", "Advanced"];

    // [설정 2] 탈출 대상 모드 (Flash)
    const FLASH_KEYWORDS = ["빠른", "Flash"];

    const CHECK_INTERVAL_MS = 2000;
    let isSwitching = false;

    // [핵심 기능] 커서를 맨 끝으로 이동시키는 함수
    function setCaretToEnd(targetElem) {
        const range = document.createRange();
        const sel = window.getSelection();
        
        // 텍스트 노드가 없어도 강제로 포커싱
        range.selectNodeContents(targetElem);
        range.collapse(false); // false = 끝점으로 이동
        
        sel.removeAllRanges();
        sel.addRange(range);
        
        targetElem.focus();
    }

    // [핵심 기능] 강력한 입력창 포커스 함수 (재시도 로직 포함)
    function attemptFocus(maxRetries = 10) {
        let attempts = 0;

        const focusInterval = setInterval(() => {
            attempts++;
            
            // 선택자 우선순위
            // 1. role="textbox" (접근성 표준, 가장 정확함)
            // 2. contenteditable="true" (일반적인 편집 영역)
            const inputEl = document.querySelector('div[role="textbox"]') || 
                            document.querySelector('div[contenteditable="true"]');

            if (inputEl) {
                // 요소가 보이고 상호작용 가능한지 체크 (간단한 offsetParent 체크)
                if (inputEl.offsetParent !== null) {
                    try {
                        setCaretToEnd(inputEl);
                        console.log(`[Gemini Auto] 입력창 포커스 성공 (시도 ${attempts}회차)`);
                        
                        // 포커스가 실제로 들어갔는지 확인 (document.activeElement)
                        if (document.activeElement === inputEl) {
                            clearInterval(focusInterval);
                            isSwitching = false; // 스위칭 상태 해제
                            return;
                        }
                    } catch (e) {
                        console.warn("[Gemini Auto] 포커스 시도 중 에러:", e);
                    }
                }
            }

            if (attempts >= maxRetries) {
                console.log("[Gemini Auto] 입력창 포커스 실패 (시간 초과)");
                clearInterval(focusInterval);
                isSwitching = false;
            }
        }, 200); // 0.2초 간격으로 체크
    }

    function checkAndSwitchModel() {
        if (isSwitching) return;

        // 1. 모델 선택 버튼 찾기
        const pickerBtn = document.querySelector('bard-mode-switcher button[aria-haspopup="menu"]');
        if (!pickerBtn) return;

        // 2. 현재 상태 확인
        const currentLabel = pickerBtn.innerText.trim();
        const isFlashMode = FLASH_KEYWORDS.some(keyword => currentLabel.toLowerCase().includes(keyword.toLowerCase()));

        if (!isFlashMode) return;

        // 3. 전환 시작
        isSwitching = true;
        console.log(`[Gemini Auto] 감지: ${currentLabel} -> 전환 시도: ${TARGET_KEYWORDS[0]}`);

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
                console.log(`[Gemini Auto] 메뉴 클릭 완료`);
                clearInterval(menuCheckInterval);

                // [중요] 메뉴 클릭 직후에는 DOM이 리프레시되므로 약간의 딜레이 후 '반복 시도' 시작
                setTimeout(() => {
                    attemptFocus(15); // 최대 15번(약 3초)까지 포커스 시도
                }, 300);

            } else if (attempts > 10) {
                console.log("[Gemini Auto] 메뉴를 찾을 수 없어 취소");
                document.body.click(); // 메뉴 닫기 시도
                clearInterval(menuCheckInterval);
                isSwitching = false;
            }
        }, 200);
    }

    // 주기적 감시 시작
    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);
})();
