/**
 * 증명사진 자동 보정 애플리케이션 초기화 스크립트
 */

// CanvasRenderingContext2D.roundRect 폴리필 (IE, Edge, Safari 지원)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        if (radius === undefined) {
            radius = 5;
        }
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
        return this;
    };
}

// App 클래스 가져오기 및 인스턴스 생성
import App from './main.js';

// 애플리케이션 인스턴스 생성
window.addEventListener('DOMContentLoaded', () => {
    // 전역 App 인스턴스 생성 (앱 초기화는 App 클래스 내부에서 처리)
    window.app = new App();
});