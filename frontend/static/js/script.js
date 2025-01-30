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

document.addEventListener('DOMContentLoaded', () => {
    const cameraPreview = document.getElementById('camera-preview');
    const captureButton = document.getElementById('capture-button');
    const capturedThumbnail = document.getElementById('captured-thumbnail');
    const originalPhoto = document.getElementById('original-photo');
    const originalPhotoContainer = document.getElementById('original-photo-container');
    const resetButton = document.getElementById('reset-button');
    const captureCanvasContext = document.createElement('canvas').getContext('2d');
    const originalCanvasContext = document.createElement('canvas').getContext('2d');
    const thumbnailList = document.getElementById('thumbnail-list');
    const originalThumbnailContainer = document.querySelector('.thumbnail-container');
    const resizedOriginalCanvas = document.createElement('canvas');
    const resizedOriginalContext = resizedOriginalCanvas.getContext('2d');
    const downloadButton = document.getElementById('download-button');

    let stream = null;
    let originalImageDataURL = null;
    let thumbnailArray = [];
    let cameraReady = false;

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

    // 카메라 시작 함수
    async function startCamera() {
        try {
            if (stream) {
                return;
            }
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            cameraPreview.srcObject = stream;
            cameraPreview.style.transform = 'scaleX(-1)';

            cameraPreview.addEventListener('loadedmetadata', () => {
                cameraReady = true;
            });

        } catch (error) {
            alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
        }
    }

    // 사진 촬영 함수 수정 (백엔드 API 호출)
    async function capturePhoto() {
        if (!cameraReady) {
            alert('카메라 준비 중입니다. 잠시만 기다려주세요.');
            return;
        }

        try {
            showLoading();
            // 캔버스에서 이미지 데이터 URL 얻기 (JPEG 형식)
            originalImageDataURL = originalCanvasContext.canvas.toDataURL('image/jpeg');

            // 고해상도 이미지 캡처
            const fullResCanvas = document.createElement('canvas');
            fullResCanvas.width = cameraPreview.videoWidth;
            fullResCanvas.height = cameraPreview.videoHeight;
            const ctx = fullResCanvas.getContext('2d');
            ctx.drawImage(cameraPreview, 0, 0);
            originalImageDataURL = fullResCanvas.toDataURL('image/jpeg', 0.9);

            // API 요청에 보정 옵션 추가
            const response = await fetch('/api/enhance_image', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    image_data: originalImageDataURL,
                    options: {
                        skin_smoothing: document.getElementById('skin-smoothing').checked,
                        eye_enhance: document.getElementById('eye-enhance').checked
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const enhanced_image_data_url = data.enhanced_image_data_url; // 백엔드로부터 보정된 이미지 Data URL 받기
            originalPhoto.src = enhanced_image_data_url; // 보정된 이미지로 업데이트
            originalPhotoContainer.style.display = 'flex';

            // 썸네일 업데이트 (보정된 이미지 기반으로 썸네일 생성)
            createThumbnailFromDataUrl(enhanced_image_data_url);

        } catch (error) {
            console.error('Error:', error);
            alert('이미지 보정 중 오류가 발생했습니다.');
        } finally {
            hideLoading();
        }
    }

    // Data URL 로 썸네일 생성 및 목록 업데이트 함수
    function createThumbnailFromDataUrl(dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            captureCanvasContext.canvas.width = 84;
            captureCanvasContext.canvas.height = 105;
            captureCanvasContext.resetTransform();
            captureCanvasContext.drawImage(img, 0, 0, img.width, img.height, 0, 0, captureCanvasContext.canvas.width, captureCanvasContext.canvas.height);
            const thumbnailDataURL = captureCanvasContext.canvas.toDataURL('image/jpeg');
            updateThumbnails(thumbnailDataURL);
        }
    }

    // 썸네일 목록에 썸네일 추가 함수 (originalImageDataURL 파라미터 추가)
    function addThumbnailToList(thumbnailDataURL, originalImageDataURL) {
        thumbnailArray.push(thumbnailDataURL);

        const thumbnailItem = document.createElement('li');
        const thumbnailImage = document.createElement('img');
        thumbnailImage.src = thumbnailDataURL;
        thumbnailImage.alt = '촬영된 썸네일';

        thumbnailImage.addEventListener('click', () => {
            originalPhoto.src = originalImageDataURL; // 썸네일 클릭 시 원본 사진 Data URL 사용
            originalPhotoContainer.style.display = 'flex';
        });

        thumbnailItem.appendChild(thumbnailImage);
        thumbnailList.prepend(thumbnailItem);

        if (thumbnailList.children.length > 5) {
            thumbnailList.removeChild(thumbnailList.lastElementChild);
            thumbnailArray.shift();
        }
    }

    // 원본 사진 컨테이너 클릭 시 닫기 이벤트 리스너
    originalPhotoContainer.addEventListener('click', () => {
        originalPhotoContainer.style.display = 'none';
    });

    // 자르기 버튼 클릭 이벤트 핸들러
    cropButton.addEventListener('click', toggleCropMode);

    // 자르기 모드 활성화/비활성화 함수
    function toggleCropMode() {
        isCropping = !isCropping;
        cropOverlay.style.display = isCropping ? 'block' : 'none';
        cameraArea.classList.toggle('cropping', isCropping); // cameraArea 클래스 토글

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

    // 자르기 영역 드래그 시작
    function startCrop(e) {
        if (e.target !== cropBox) return; // crop-box 내부에서만 드래그 시작

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
        const containerRect = cameraPreview.parentElement.getBoundingClientRect(); // camera-container
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
        const containerRect = cameraPreview.parentElement.getBoundingClientRect(); // camera-container
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

    // 이벤트 리스너 등록
    captureButton.addEventListener('click', capturePhoto);
    startCamera();

    // 초기화 함수
    function reset촬영() {
        thumbnailList.innerHTML = '';
        thumbnailArray = [];
        originalPhoto.src = '#';
        originalPhotoContainer.style.display = 'none';
        captureCanvasContext.clearRect(0, 0, captureCanvasContext.canvas.width, captureCanvasContext.canvas.height);
        originalImageDataURL = null;
        originalThumbnailContainer.style.display = 'none';
    }

    // "다시 찍기" 버튼 클릭 이벤트 리스너
    resetButton.addEventListener('click', reset촬영);

    // 이미지 로드 오류 처리
    originalPhoto.addEventListener('error', () => {
        originalPhotoContainer.style.display = 'none';
    });

    // 다운로드 기능 개선 (파일 형식 선택 추가)
    downloadButton.addEventListener('click', () => {
        if (!enhanced_image_data_url) {
            alert('보정된 이미지가 없습니다.');
            return;
        }

        // 파일 형식 선택 다이얼로그
        const format = prompt('다운로드 형식을 선택하세요 (jpg/png):', 'jpg').toLowerCase();
        if (!['jpg', 'png'].includes(format)) {
            alert('지원하지 않는 파일 형식입니다.');
            return;
        }

        const link = document.createElement('a');
        link.href = enhanced_image_data_url.replace('jpeg', format); // MIME 타입 수정
        link.download = `증명사진.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // AI 보정 진행 상태 표시
    function showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    function hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }
});