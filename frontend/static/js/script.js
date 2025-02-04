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

// font-awesome import 구문 제거 (CDN 방식으로 변경)

// 파일 상단에 import 추가
import { DownloadHandler } from './modules/downloadHandler.js';
import App from './main.js';

// 간단한 토스트 메시지 함수 추가
function showToast(message, type = 'success') {
  // 토스트 메시지 컨테이너가 없으면 생성합니다.
  let container = document.getElementById('toast-container');
  if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '3000';
      document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast ' + (type === 'error' ? 'toast-error' : 'toast-success');
  toast.innerText = message;
  // 기본 스타일 (원하는 대로 수정 가능)
  toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
  toast.style.color = '#fff';
  toast.style.padding = '10px 20px';
  toast.style.marginBottom = '10px';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

  container.appendChild(toast);
  setTimeout(() => { container.removeChild(toast); }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    // App 인스턴스를 전역 변수로 생성
    window.app = new App();
    await window.app.initialize(); // public 초기화 메서드 호출

    const video = document.getElementById('camera-preview');
    const captureButton = document.getElementById('capture-button');
    const resetButton = document.getElementById('reset-button');
    const downloadButton = document.getElementById('download-button');
    const originalPhotoContainer = document.getElementById('original-photo-container');
    const originalPhoto = document.getElementById('original-photo');
    const capturedThumbnail = document.getElementById('captured-thumbnail');
    const thumbnailList = document.getElementById('thumbnail-list');
    const originalThumbnailContainer = document.querySelector('.thumbnail-container');
    const resizedOriginalCanvas = document.createElement('canvas');
    const resizedOriginalContext = resizedOriginalCanvas.getContext('2d');
    const popupCloseButton = document.getElementById('popup-close');
    const popupDownloadButton = document.getElementById('popup-download');

    // 필수 요소 존재 확인 (실제로 필요한 요소만 체크)
    if (!video || !captureButton || !originalPhotoContainer || !originalPhoto || !thumbnailList) {
        console.error('필수 요소를 찾을 수 없습니다. 확인이 필요한 ID들:');
        if (!video) console.error('- camera-preview');
        if (!captureButton) console.error('- capture-button');
        if (!originalPhotoContainer) console.error('- original-photo-container');
        if (!originalPhoto) console.error('- original-photo');
        if (!thumbnailList) console.error('- thumbnail-list');
        return;
    }

    let stream = null;
    let originalImageDataURL = null;
    let thumbnailArray = [];
    let cameraReady = false;
    let capturedPhotos = []; // 사진 목록을 저장할 배열

    // 자르기 기능 관련 변수
    const cropButton = document.getElementById('crop-button');
    const cropOverlay = document.getElementById('crop-overlay');
    const cropBox = document.getElementById('crop-box');
    let isCropping = false; // 자르기 모드 활성화 여부
    let isDraggingCrop = false; // 자르기 영역 드래그 중 여부
    let isResizingCrop = false; // 자르기 영역 리사이즈 중 여부
    let currentHandle = null; // 현재 잡고 있는 핸들
    let cropStartX, cropStartY; // 드래그 시작 좌표
    let cropBoxStartX, cropBoxStartY, cropBoxStartWidth, cropBoxStartHeight; // 리사이즈/드래그 시작 시 자르기 박스 정보

    // 웹캠 접근
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
        } catch (error) {
            alert('카메라 접근 실패: ' + error);
        }
    } else {
        alert('웹캠을 지원하지 않습니다.');
    }

    // 자르기 기능 초기화 (옵션 기능)
    if (cropButton && cropOverlay && cropBox) {
        // 자르기 버튼 클릭 이벤트 핸들러
        cropButton.addEventListener('click', toggleCropMode);

        // 자르기 모드 활성화/비활성화 함수
        function toggleCropMode() {
            isCropping = !isCropping;
            cropOverlay.style.display = isCropping ? 'block' : 'none';
            video.classList.toggle('cropping', isCropping);

            if (isCropping) {
                // 자르기 모드 활성화 시, 이벤트 리스너 추가
                cropOverlay.addEventListener('mousedown', startCrop);
                cropOverlay.addEventListener('mousemove', dragCrop);
                cropOverlay.addEventListener('mouseup', endCrop);

                cropBox.querySelectorAll('.crop-handle').forEach(handle => {
                    handle.addEventListener('mousedown', startResizeCrop);
                    handle.addEventListener('mousemove', resizeCrop);
                    handle.addEventListener('mouseup', endResizeCrop);
                });
            } else {
                // 자르기 모드 비활성화 시, 이벤트 리스너 제거
                cropOverlay.removeEventListener('mousedown', startCrop);
                cropOverlay.removeEventListener('mousemove', dragCrop);
                cropOverlay.removeEventListener('mouseup', endCrop);

                cropBox.querySelectorAll('.crop-handle').forEach(handle => {
                    handle.removeEventListener('mousedown', startResizeCrop);
                    handle.removeEventListener('mousemove', resizeCrop);
                    handle.removeEventListener('mouseup', endResizeCrop);
                });
            }
        }

        // 자르기 관련 함수들은 여기에 그대로 유지
        function startCrop(e) {
            if (e.target !== cropBox) return;
            isDraggingCrop = true;
            cropStartX = e.clientX;
            cropStartY = e.clientY;
            cropBoxStartX = cropBox.offsetLeft;
            cropBoxStartY = cropBox.offsetTop;
        }

        // 자르기 영역 드래그 중
        function dragCrop(e) {
            if (!isDraggingCrop) return;

            const offsetX = e.clientX - cropStartX;
            const offsetY = e.clientY - cropStartY;

            let newX = cropBoxStartX + offsetX;
            let newY = cropBoxStartY + offsetY;

            // crop box 가 camera-container 영역을 벗어나지 않도록 제한
            const containerRect = video.parentElement.getBoundingClientRect(); // camera-container
            const boxRect = cropBox.getBoundingClientRect();
            const maxX = containerRect.width - boxRect.width;
            const maxY = containerRect.height - boxRect.height;
            const minX = 0;
            const minY = 0;

            newX = Math.max(minX, Math.min(newX, maxX));
            newY = Math.max(minY, Math.min(newY, maxY));


            cropBox.style.left = `${newX}px`;
            cropBox.style.top = `${newY}px`;
        }

        // 자르기 영역 드래그 종료
        function endCrop() {
            isDraggingCrop = false;
        }

        // 자르기 영역 리사이즈 시작
        function startResizeCrop(e) {
            isResizingCrop = true;
            currentHandle = e.target;
            cropStartX = e.clientX;
            cropStartY = e.clientY;
            cropBoxStartX = cropBox.offsetLeft;
            cropBoxStartY = cropBox.offsetTop;
            cropBoxStartWidth = cropBox.offsetWidth;
            cropBoxStartHeight = cropBox.offsetHeight;
            e.stopPropagation(); // 드래그 이벤트 방지
        }

        // 자르기 영역 리사이즈 중
        function resizeCrop(e) {
            if (!isResizingCrop) return;

            const offsetX = e.clientX - cropStartX;
            const offsetY = e.clientY - cropStartY;

            let newWidth = cropBoxStartWidth;
            let newHeight = cropBoxStartHeight;
            let newX = cropBoxStartX;
            let newY = cropBoxStartY;

            const minWidth = 50;
            const minHeight = 50;

            switch (currentHandle.classList[1]) {
                case 'top-left':
                    newWidth = cropBoxStartWidth - offsetX;
                    newHeight = cropBoxStartHeight - offsetY;
                    newX = cropBoxStartX + offsetX;
                    newY = cropBoxStartY + offsetY;
                    break;
                case 'top-right':
                    newWidth = cropBoxStartWidth + offsetX;
                    newHeight = cropBoxStartHeight - offsetY;
                    newY = cropBoxStartY + offsetY;
                    break;
                case 'bottom-left':
                    newWidth = cropBoxStartWidth - offsetX;
                    newHeight = cropBoxStartHeight + offsetY;
                    newX = cropBoxStartX + offsetX;
                    break;
                case 'bottom-right':
                    newWidth = cropBoxStartWidth + offsetX;
                    newHeight = cropBoxStartHeight + offsetY;
                    break;
            }

            // 최소 크기 제한
            newWidth = Math.max(minWidth, newWidth);
            newHeight = Math.max(minHeight, newHeight);

            // crop box 가 camera-container 영역을 벗어나지 않도록 제한 (리사이즈 시 오른쪽/아래쪽만)
            const containerRect = video.parentElement.getBoundingClientRect(); // camera-container
            const maxX = containerRect.width - newWidth;
            const maxY = containerRect.height - newHeight;

            newWidth = Math.min(newWidth, containerRect.width - cropBoxStartX); // 오른쪽 경계 제한
            newHeight = Math.min(newHeight, containerRect.height - cropBoxStartY); // 아래쪽 경계 제한


            // top-left, top-right 핸들로 리사이즈 시 top, left 위치 변경 및 영역 벗어남 방지
            if (currentHandle.classList.contains('top-left') || currentHandle.classList.contains('top-right')) {
                newY = Math.max(0, newY); // top 경계 제한
                if (newY === 0 && currentHandle.classList.contains('top-left')) {
                    newHeight = cropBoxStartHeight + cropBoxStartY; // top 이 0 이 되면 height 를 늘려줌
                }
            }
            if (currentHandle.classList.contains('top-left') || currentHandle.classList.contains('bottom-left')) {
                newX = Math.max(0, newX); // left 경계 제한
                 if (newX === 0 && currentHandle.classList.contains('top-left')) {
                    newWidth = cropBoxStartWidth + cropBoxStartX; // left 가 0 이 되면 width 를 늘려줌
                }
            }


            cropBox.style.width = `${newWidth}px`;
            cropBox.style.height = `${newHeight}px`;
            cropBox.style.left = `${newX}px`;
            cropBox.style.top = `${newY}px`;
        }


        // 자르기 영역 리사이즈 종료
        function endResizeCrop() {
            isResizingCrop = false;
            currentHandle = null;
        }
    }

    // 썸네일 목록에 썸네일 추가 함수
    function addThumbnailToList(displayImageURL, saveImageURL) {
        // 보정된 이미지만 저장
        thumbnailArray.push({ 
            display: displayImageURL, 
            save: displayImageURL  // 보정된 이미지로 통일
        });

        const thumbnailItem = document.createElement('li');
        const thumbnailImage = document.createElement('img');
        thumbnailImage.src = displayImageURL;
        // 미러 효과를 제거하여 원본 이미지 그대로 사용
        // thumbnailImage.style.transform = 'scaleX(-1)';
        thumbnailImage.style.display = 'block';
        thumbnailImage.alt = '촬영된 썸네일';

        thumbnailImage.addEventListener('click', () => {
            originalPhoto.src = displayImageURL;
            // 원본 이미지 그대로 표시하도록 미러 효과 제거
            // originalPhoto.style.transform = 'scaleX(-1)';
            originalPhoto.style.display = 'block';
            originalPhotoContainer.style.display = 'block';
        });

        thumbnailItem.appendChild(thumbnailImage);
        thumbnailList.prepend(thumbnailItem);

        // 최대 5개로 제한
        if (thumbnailList.children.length > 5) {
            thumbnailList.removeChild(thumbnailList.lastElementChild);
            thumbnailArray.shift();
        }
    }

    // 다운로드 처리 함수 수정
    async function handleDownload() {
        try {
            const currentImage = window.app.state.currentImage;
            if (!currentImage) {
                throw new Error('No image available');
            }
            
            await DownloadHandler.download(currentImage);
            showToast('다운로드가 완료되었습니다');
            
        } catch (error) {
            console.error('Download error:', error);
            showToast(error.message, 'error');
        }
    }

    // 팝업 닫기 버튼 이벤트
    if (popupCloseButton) {
        popupCloseButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.app.hidePopup();
        });
    }

    // 다운로드 버튼 이벤트 리스너 수정
    if (downloadButton) {
        downloadButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleDownload();
        });
    }

    // 팝업 다운로드 버튼 이벤트 수정
    if (popupDownloadButton) {
        popupDownloadButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleDownload();
        });
    }

    // 팝업 배경 클릭 시 닫기
    originalPhotoContainer.addEventListener('click', (e) => {
        if (e.target === originalPhotoContainer) {
            originalPhotoContainer.style.display = 'none';
        }
    });

    // 이미지 로드 오류 처리
    originalPhoto.addEventListener('error', () => {
        // src가 빈 문자열, "about:blank" 또는 blank data URL일 경우 오류 처리를 생략합니다.
        const src = originalPhoto.src;
        if (!src || src.trim() === '' || src === 'about:blank' || src === 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==') return;
        // 디버그용 로그: 이미지의 자연 너비를 출력하여 로드 여부를 확인합니다.
        console.error('originalPhoto error event: naturalWidth =', originalPhoto.naturalWidth, 'src:', src);
        if (originalPhoto.naturalWidth === 0) {
            console.error('이미지를 불러오는데 실패했습니다. src:', src);
            originalPhotoContainer.style.display = 'none';
            alert('이미지를 불러오는데 실패했습니다.');
        }
    });

    // 썸네일 클릭 핸들러 수정 (public 메서드 호출)
    function setupThumbnailClick() {
        document.querySelectorAll('.thumbnail-item').forEach(item => {
            item.addEventListener('click', () => {
                const imgSrc = item.querySelector('img').src;
                window.app.state.currentImage = imgSrc; // 전역 app 인스턴스 사용
                window.app.updateMainDisplay(); // public 메서드 호출
            });
        });
    }
});