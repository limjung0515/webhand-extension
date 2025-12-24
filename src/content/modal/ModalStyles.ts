/**
 * Modal Styles Module
 * CSS 상수들을 중앙 관리
 */

export const OVERLAY_STYLES = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
`;

export const MODAL_CONTAINER_STYLES = `
    position: relative;
    background: #2d2f33;
    border: 1px solid #3a3b40;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    min-width: 450px;
    max-width: 500px;
`;

export const MODAL_ANIMATIONS = `
    @keyframes webhand-modal-appear {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    @keyframes webhand-progress-indeterminate {
        0% {
            left: -50%;
        }
        100% {
            left: 100%;
        }
    }
`;
