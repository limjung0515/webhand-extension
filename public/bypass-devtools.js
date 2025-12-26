/**
 * 네이버 개발자도구 탐지 우회 스크립트
 * 페이지의 전역 컨텍스트(window)에서 실행됩니다
 */
(function () {
    'use strict';

    // console 함수 무력화
    console.log = () => { };
    console.table = () => { };

    // Function constructor 차단
    Function.prototype.constructor = () => { };

    // setInterval 무력화
    setInterval = () => { };

    // 모든 interval 클리어
    for (let i = 0; i < 1e6; i++) {
        clearInterval(i);
    }

    // userAgent 삭제
    try {
        delete Navigator.prototype.userAgent;
    } catch (e) {
        // 일부 브라우저에서는 실패할 수 있음
    }

    console.info('✅ DevTools detection bypass injected by WebHand');
})();
