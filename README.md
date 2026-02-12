# Gemini Auto-Select Model

Gemini 웹에서 Flash 모드 감지 시 자동으로 Thinking 또는 Pro 모드로 전환하는 Tampermonkey 유저스크립트.

## 설치 방법

### 1. Tampermonkey 확장 설치
Chrome 웹 스토어에서 [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 설치

### 2. 확장 권한 설정 (Chrome)
1. 크롬 주소창에 `chrome://extensions` 입력
2. **개발자 모드** 활성화 (우측 상단 토글)
3. Tampermonkey 확장에서 **세부정보** 클릭
4. **사용자 스크립트 허용** 활성화 (필수)

### 3. 스크립트 등록
1. Tampermonkey 아이콘 클릭 → **새 스크립트 만들기**
2. `gemini-web-select-pro-or-thinking.js` 내용 붙여넣기
3. `Ctrl+S`로 저장

## 사용법

### 목표 모드 설정
스크립트 상단의 `TARGET_KEYWORDS` 배열을 수정하여 원하는 모드 선택:

**Thinking 모드 (기본값):**
```javascript
const TARGET_KEYWORDS = ["사고", "Thinking", "Reasoning"];
```

**Pro 모드:**
```javascript
const TARGET_KEYWORDS = ["Pro", "Advanced"];
```

### 동작 방식
- 2초 간격으로 현재 모델 상태 확인
- Flash 모드(`빠른`, `Flash`) 감지 시 자동으로 목표 모드로 전환
- 전환 완료 후 입력창에 자동 포커스

## 원본
https://greasyfork.org/en/scripts/564627-gemini-auto-select-pro-permanent-watcher
